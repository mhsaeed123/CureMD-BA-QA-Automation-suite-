"""
Core module - Configuration, logging, and shared utilities.
"""
from .config import Settings, settings
from .logging import setup_logging, get_logger

__all__ = ["Settings", "settings", "setup_logging", "get_logger"]
