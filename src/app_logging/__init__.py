"""
CureMD BA QA Automation Suite - Logging Module
===============================================
Application logging configuration and utilities.

Author: CureMD BA QA Team
Version: 1.0.0
"""

from .logger import (
    setup_logging,
    get_logger,
    LogLevel,
    LogFormat,
    LogHandler,
    StructuredLogger,
    LogContext,
    log_entry_exit
)

__all__ = [
    'setup_logging',
    'get_logger',
    'LogLevel',
    'LogFormat',
    'LogHandler',
    'StructuredLogger',
    'LogContext',
    'log_entry_exit',
]

__version__ = '1.0.0'