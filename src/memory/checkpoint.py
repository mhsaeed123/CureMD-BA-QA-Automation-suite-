"""Checkpoint Manager - State Persistence"""
import json
from pathlib import Path
from typing import Any, Dict, Optional
from datetime import datetime

class CheckpointManager:
    """Manages checkpoints for fault tolerance."""
    
    def __init__(self, checkpoint_dir: str = "checkpoints"):
        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
    
    def save_checkpoint(self, checkpoint_id: str, state: Dict[str, Any]) -> str:
        """Save a checkpoint."""
        path = self.checkpoint_dir / f"{checkpoint_id}.json"
        data = {
            "id": checkpoint_id,
            "timestamp": datetime.now().isoformat(),
            "state": state
        }
        with open(path, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        return str(path)
    
    def load_checkpoint(self, checkpoint_id: str) -> Optional[Dict[str, Any]]:
        """Load a checkpoint."""
        path = self.checkpoint_dir / f"{checkpoint_id}.json"
        if path.exists():
            with open(path, 'r') as f:
                return json.load(f)
        return None
    
    def list_checkpoints(self) -> list:
        """List all checkpoints."""
        return [p.stem for p in self.checkpoint_dir.glob("*.json")]
    
    def delete_checkpoint(self, checkpoint_id: str) -> bool:
        """Delete a checkpoint."""
        path = self.checkpoint_dir / f"{checkpoint_id}.json"
        if path.exists():
            path.unlink()
            return True
        return False
