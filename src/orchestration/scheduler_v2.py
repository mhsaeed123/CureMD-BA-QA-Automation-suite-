"""
Scheduled Tasks
===============
Celery + Redis for cron and event-triggered agents.

Usage (after `pip install oneagent[celery]`):
    celery -A core.scheduler.tasks worker --loglevel=info
    celery -A core.scheduler.tasks beat --loglevel=info
"""

import logging
from datetime import timedelta
from typing import Callable, Dict, Optional

logger = logging.getLogger(__name__)

# Lazy imports — Celery is optional
_celery = None
_app = None


def _get_celery():
    global _celery, _app
    if _celery is None:
        try:
            from celery import Celery
            from config import get_settings
            settings = get_settings()
            _celery = Celery(
                "oneagent",
                broker=settings.db.redis_url,
                backend=settings.db.redis_url,
            )
            _celery.conf.update(
                task_serializer="json",
                accept_content=["json"],
                result_serializer="json",
                timezone="UTC",
                enable_utc=True,
            )
            _app = _celery
        except ImportError:
            raise ImportError("Celery not installed. Run: pip install oneagent[celery]")
    return _app


def get_celery_app():
    """Get or create the Celery app."""
    return _get_celery()


# ---------------------------------------------------------------------------
# Task registry (works without Celery too)
# ---------------------------------------------------------------------------

_scheduled_tasks: Dict[str, dict] = {}


def register_scheduled_task(
    name: str,
    func: Callable,
    cron: Optional[str] = None,
    interval: Optional[timedelta] = None,
    description: str = "",
):
    """Register a function as a scheduled task."""
    _scheduled_tasks[name] = {
        "func": func,
        "cron": cron,
        "interval": interval,
        "description": description,
    }
    logger.info(f"Scheduled task registered: {name}")

    # If Celery is available, register with beat schedule
    try:
        app = _get_celery()
        if cron:
            app.conf.beat_schedule[name] = {
                "task": name,
                "schedule": cron,
            }
        elif interval:
            app.conf.beat_schedule[name] = {
                "task": name,
                "schedule": interval,
            }
    except ImportError:
        pass  # Celery not available, task is registered in-memory


def get_scheduled_tasks() -> Dict[str, dict]:
    """List all registered scheduled tasks."""
    return _scheduled_tasks.copy()
