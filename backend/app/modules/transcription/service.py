"""
Transcription Service - Audio/Video to text
Based on Initiatives/VideoTranscriber/app.py
"""
import os
import re
import shutil
import tempfile
import threading
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional, List, Any
from ..core.config import settings

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {
    ".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v",
    ".mp3", ".wav", ".m4a", ".aac", ".ogg",
}

OPENAI_MAX_BYTES = 24 * 1024 * 1024  # 24 MB


class TranscriptionService:
    """
    Service for transcribing audio/video files using OpenAI Whisper or local faster-whisper.
    """

    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = Path(output_dir or settings.output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.jobs: Dict[str, Dict] = {}
        self.jobs_lock = threading.Lock()

    def create_job(
        self,
        filename: str,
        mode: str = "api",
        model: str = "small",
        task: str = "transcribe",
        language_hint: str = "auto",
        api_key: str = ""
    ) -> str:
        """
        Create a transcription job.

        Returns:
            job_id string
        """
        job_id = f"{int(datetime.now().timestamp() * 1000)}_{self._slugify(Path(filename).stem)[:20]}"

        with self.jobs_lock:
            self.jobs[job_id] = {
                "status": "queued",
                "progress": 0,
                "filename": filename,
                "output_file": None,
                "error": None,
            }

        return job_id

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status and results."""
        with self.jobs_lock:
            return self.jobs.get(job_id)

    def process_job(
        self,
        job_id: str,
        file_path: str,
        mode: str = "api",
        model: str = "small",
        task: str = "transcribe",
        language_hint: str = "auto",
        api_key: str = ""
    ):
        """
        Process a transcription job (runs in background thread).
        """
        try:
            ext = Path(file_path).suffix.lower()
            is_video = ext in {".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"}

            with self.jobs_lock:
                self.jobs[job_id]["status"] = "extracting_audio"
                self.jobs[job_id]["progress"] = 15

            # Extract audio if video
            if is_video:
                audio_path = tempfile.mktemp(suffix=".mp3")
                self._extract_audio(file_path, audio_path)
            else:
                audio_path = file_path

            with self.jobs_lock:
                self.jobs[job_id]["status"] = "transcribing"
                self.jobs[job_id]["progress"] = 35

            # Transcribe based on mode
            if mode == "api":
                result = self._transcribe_api(
                    job_id, audio_path, task, api_key, language_hint
                )
            else:
                result = self._transcribe_local(
                    job_id, audio_path, model, task, language_hint
                )

            # Cleanup
            if is_video and os.path.exists(audio_path):
                os.remove(audio_path)

            with self.jobs_lock:
                self.jobs[job_id]["status"] = "done"
                self.jobs[job_id]["progress"] = 100
                self.jobs[job_id]["output_file"] = result

        except Exception as e:
            logger.error(f"Transcription job {job_id} failed: {e}")
            with self.jobs_lock:
                self.jobs[job_id]["status"] = "error"
                self.jobs[job_id]["error"] = str(e)

    def _extract_audio(self, video_path: str, out_path: str):
        """Extract audio from video using ffmpeg."""
        os.system(
            f'ffmpeg -y -i "{video_path}" -vn -ar 16000 -ac 1 -b:a 32k "{out_path}" -loglevel error'
        )

    def _transcribe_api(
        self,
        job_id: str,
        audio_path: str,
        task: str,
        api_key: str,
        language_hint: str
    ) -> Optional[str]:
        """Transcribe using OpenAI Whisper API."""
        import openai

        file_size = os.path.getsize(audio_path)

        client = openai.OpenAI(api_key=api_key)
        lang_param = language_hint if language_hint != "auto" else None

        if file_size <= OPENAI_MAX_BYTES:
            with open(audio_path, "rb") as f:
                if task == "translate":
                    response = client.audio.translations.create(
                        model="whisper-1",
                        file=f,
                        response_format="verbose_json",
                    )
                else:
                    kwargs = {"model": "whisper-1", "file": f, "response_format": "verbose_json"}
                    if lang_param:
                        kwargs["language"] = lang_param
                    response = client.audio.transcriptions.create(**kwargs)

            segments = response.segments or []
            full_text = response.text
            detected_language = getattr(response, "language", language_hint)
        else:
            segments, full_text, detected_language = self._transcribe_api_chunked(
                client, audio_path, task, lang_param, job_id
            )

        return self._write_markdown(
            job_id,
            self.jobs[job_id]["filename"],
            segments,
            full_text,
            detected_language,
            task,
            "whisper-1 (API)"
        )

    def _transcribe_api_chunked(
        self,
        client,
        audio_path: str,
        task: str,
        lang_param: Optional[str],
        job_id: str
    ):
        """Handle large file transcription by chunking."""
        import openai

        chunk_dir = audio_path + "_chunks"
        os.makedirs(chunk_dir, exist_ok=True)

        os.system(
            f'ffmpeg -y -i "{audio_path}" -f segment -segment_time 600 '
            f'-ar 16000 -ac 1 -b:a 32k "{chunk_dir}/chunk_%03d.mp3" -loglevel error'
        )

        from pathlib import Path
        chunk_files = sorted(Path(chunk_dir).glob("chunk_*.mp3"))
        all_segments = []
        all_text_parts = []
        time_offset = 0.0
        detected_language = lang_param or "en"

        for i, chunk_path in enumerate(chunk_files):
            with self.jobs_lock:
                pct = 35 + int((i / len(chunk_files)) * 45)
                self.jobs[job_id]["progress"] = pct
                self.jobs[job_id]["status"] = f"transcribing chunk {i+1}/{len(chunk_files)}"

            with open(chunk_path, "rb") as f:
                if task == "translate":
                    resp = client.audio.translations.create(
                        model="whisper-1", file=f, response_format="verbose_json"
                    )
                else:
                    kwargs = {"model": "whisper-1", "file": f, "response_format": "verbose_json"}
                    if lang_param:
                        kwargs["language"] = lang_param
                    resp = client.audio.transcriptions.create(**kwargs)

            if i == 0:
                detected_language = getattr(resp, "language", lang_param or "en")

            for seg in (resp.segments or []):
                all_segments.append({
                    "start": seg["start"] + time_offset,
                    "end": seg["end"] + time_offset,
                    "text": seg["text"],
                })
            all_text_parts.append(resp.text)

            if resp.segments:
                time_offset += resp.segments[-1]["end"] + 0.1

        shutil.rmtree(chunk_dir, ignore_errors=True)
        return all_segments, " ".join(all_text_parts), detected_language

    def _transcribe_local(
        self,
        job_id: str,
        audio_path: str,
        model_name: str,
        task: str,
        language_hint: str
    ):
        """Transcribe using local faster-whisper."""
        from faster_whisper import WhisperModel

        with self.jobs_lock:
            self.jobs[job_id]["status"] = "loading_model"
            self.jobs[job_id]["progress"] = 10

        model = WhisperModel(model_name, device="cpu", compute_type="int8")

        with self.jobs_lock:
            self.jobs[job_id]["status"] = "transcribing"
            self.jobs[job_id]["progress"] = 30

        lang_param = language_hint if language_hint != "auto" else None

        segments_iter, info = model.transcribe(
            audio_path,
            task=task,
            language=lang_param,
            beam_size=1,
            vad_filter=True,
        )

        with self.jobs_lock:
            self.jobs[job_id]["progress"] = 45

        raw_segments = list(segments_iter)

        with self.jobs_lock:
            self.jobs[job_id]["status"] = "writing"
            self.jobs[job_id]["progress"] = 85

        segments = [{"start": s.start, "end": s.end, "text": s.text} for s in raw_segments]
        full_text = " ".join(s["text"].strip() for s in segments)
        detected_language = info.language

        return self._write_markdown(
            job_id,
            self.jobs[job_id]["filename"],
            segments,
            full_text,
            detected_language,
            task,
            f"{model_name} (local)"
        )

    def _write_markdown(
        self,
        job_id: str,
        original_name: str,
        segments: List[Dict],
        full_text: str,
        language: str,
        task: str,
        engine_label: str
    ) -> str:
        """Write transcription results to markdown file."""
        stem = self._slugify(Path(original_name).stem)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        md_filename = f"{stem}_{timestamp}.md"
        md_path = self.output_dir / md_filename

        action = "Translation to English" if task == "translate" else f"Transcription ({language})"

        lines = [
            f"# {Path(original_name).stem}",
            "",
            f"**Source file:** `{original_name}`  ",
            f"**Detected language:** {language}  ",
            f"**Action:** {action}  ",
            f"**Engine:** {engine_label}  ",
            f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  ",
            "",
            "---",
            "",
            "## Transcript",
            "",
        ]

        for seg in segments:
            start = seg["start"] if isinstance(seg, dict) else seg.start
            end = seg["end"] if isinstance(seg, dict) else seg.end
            text = (seg["text"] if isinstance(seg, dict) else seg.text).strip()
            lines.append(f"**[{self._format_ts(start)} -> {self._format_ts(end)}]** {text}  ")

        lines += [
            "",
            "---",
            "",
            "## Full Text",
            "",
            full_text.strip(),
            "",
        ]

        md_path.write_text("\n".join(lines), encoding="utf-8")
        return md_filename

    @staticmethod
    def _slugify(name: str) -> str:
        name = re.sub(r"[^\w\s-]", "", name)
        name = re.sub(r"[\s_-]+", "_", name)
        return name.strip("_")

    @staticmethod
    def _format_ts(seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = seconds % 60
        return f"{h:02d}:{m:02d}:{s:05.2f}"
