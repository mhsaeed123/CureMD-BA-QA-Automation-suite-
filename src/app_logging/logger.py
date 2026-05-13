"""
Logging Configuration and Utilities
=====================================
Provides structured logging for the QA automation suite.

Author: CureMD BA QA Team
Version: 1.0.0
"""

import logging
import sys
import json
import traceback
from enum import Enum
from typing import Any, Dict, Optional, Callable
from pathlib import Path
from datetime import datetime
from functools import wraps
from contextlib import contextmanager


# ============================================================================
# LOG LEVELS AND FORMATS
# ============================================================================

class LogLevel(Enum):
    """Log levels."""
    DEBUG = logging.DEBUG
    INFO = logging.INFO
    WARNING = logging.WARNING
    ERROR = logging.ERROR
    CRITICAL = logging.CRITICAL


class LogFormat(Enum):
    """Log format types."""
    PLAIN = "plain"
    JSON = "json"
    STRUCTURED = "structured"
    DETAILED = "detailed"


class LogHandler(Enum):
    """Log handler types."""
    CONSOLE = "console"
    FILE = "file"
    ROTATING_FILE = "rotating_file"
    TIMED_ROTATING = "timed_rotating"


# ============================================================================
# LOG CONFIGURATION
# ============================================================================

DEFAULT_CONFIG = {
    "level": "INFO",
    "format": "detailed",
    "file_path": "logs/app.log",
    "max_bytes": 10 * 1024 * 1024,  # 10MB
    "backup_count": 5,
    "json_indent": 2,
    "include_traceback": True
}


# ============================================================================
# JSON FORMATTER
# ============================================================================

class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging."""
    
    def __init__(self, indent: int = 2, include_traceback: bool = True):
        super().__init__()
        self.indent = indent
        self.include_traceback = include_traceback
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add extra fields
        if hasattr(record, "extra_fields"):
            log_entry.update(record.extra_fields)
        
        # Add exception info
        if record.exc_info and self.include_traceback:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": traceback.format_exception(*record.exc_info)
            }
        
        return json.dumps(log_entry, indent=self.indent, default=str)


# ============================================================================
# STRUCTURED FORMATTER
# ============================================================================

class StructuredFormatter(logging.Formatter):
    """Formatter with structured output for easy parsing."""
    
    def __init__(self, include_caller: bool = True):
        super().__init__()
        self.include_caller = include_caller
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record with structure."""
        parts = []
        
        # Timestamp
        parts.append(f"[{datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}]")
        
        # Level
        level_colors = {
            'DEBUG': '\033[36m',    # Cyan
            'INFO': '\033[32m',      # Green
            'WARNING': '\033[33m',   # Yellow
            'ERROR': '\033[31m',    # Red
            'CRITICAL': '\033[35m'   # Magenta
        }
        color = level_colors.get(record.levelname, '')
        reset = '\033[0m'
        parts.append(f"{color}{record.levelname:<8}{reset}")
        
        # Logger name
        parts.append(f"[{record.name}]")
        
        # Message
        parts.append(record.getMessage())
        
        # Caller info
        if self.include_caller:
            parts.append(f"({record.filename}:{record.lineno})")
        
        return " ".join(parts)


# ============================================================================
# DETAILED FORMATTER
# ============================================================================

class DetailedFormatter(logging.Formatter):
    """Detailed formatter for development/debugging."""
    
    def __init__(self, show_colors: bool = True):
        super().__init__()
        self.show_colors = show_colors and sys.stdout.isatty()
    
    def format(self, record: logging.LogRecord) -> str:
        """Format with detailed information."""
        lines = []
        
        # Header
        lines.append("=" * 80)
        lines.append(f"LOG ENTRY - {datetime.fromtimestamp(record.created).isoformat()}")
        lines.append("=" * 80)
        
        # Basic info
        lines.append(f"Level:     {record.levelname}")
        lines.append(f"Logger:    {record.name}")
        lines.append(f"Module:    {record.module}")
        lines.append(f"Function:  {record.funcName}")
        lines.append(f"Line:      {record.lineno}")
        
        # Message
        lines.append(f"\nMessage:\n{record.getMessage()}")
        
        # Extra fields
        if hasattr(record, "extra_fields"):
            lines.append(f"\nExtra Fields:")
            for key, value in record.extra_fields.items():
                lines.append(f"  {key}: {value}")
        
        # Exception
        if record.exc_info:
            lines.append(f"\nException:")
            lines.append(traceback.format_exception(*record.exc_info))
        
        lines.append("=" * 80)
        
        return "\n".join(lines)


# ============================================================================
# STRUCTURED LOGGER CLASS
# ============================================================================

class StructuredLogger:
    """
    A logger wrapper that supports structured logging with context.
    """
    
    def __init__(self, name: str, config: Dict = None):
        self.logger = logging.getLogger(name)
        self.config = config or DEFAULT_CONFIG
        self._context: Dict[str, Any] = {}
    
    def set_context(self, **kwargs):
        """Set persistent context for all log entries."""
        self._context.update(kwargs)
    
    def clear_context(self):
        """Clear all context."""
        self._context.clear()
    
    def _make_record(self, message: str, **kwargs) -> logging.LogRecord:
        """Create a log record with extra fields."""
        record = self.logger.makeRecord(
            self.logger.name,
            logging.INFO,
            "(unknown)",
            0,
            message,
            (),
            None
        )
        record.extra_fields = {**self._context, **kwargs}
        return record
    
    def log(self, level: int, message: str, **kwargs):
        """Log with structured data."""
        self.logger.log(level, message, extra={"extra_fields": {**self._context, **kwargs}})
    
    def debug(self, message: str, **kwargs):
        """Log debug message."""
        self.log(logging.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs):
        """Log info message."""
        self.log(logging.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message."""
        self.log(logging.WARNING, message, **kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error message."""
        self.log(logging.ERROR, message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        """Log critical message."""
        self.log(logging.CRITICAL, message, **kwargs)


# ============================================================================
# LOG CONTEXT MANAGER
# ============================================================================

class LogContext:
    """
    Context manager for temporary log context.
    
    Usage:
        logger = get_logger(__name__)
        with LogContext(logger, user_id="123", request_id="abc"):
            logger.info("Processing request")
    """
    
    def __init__(self, logger: logging.Logger, **context):
        self.logger = logger
        self.context = context
        self._old_factory = None
    
    def __enter__(self):
        self._old_factory = logging.getLogRecordFactory()
        
        def record_factory(*args, **kwargs):
            record = self._old_factory(*args, **kwargs)
            record.extra_fields = self.context
            return record
        
        logging.setLogRecordFactory(record_factory)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        logging.setLogRecordFactory(self._old_factory)


# ============================================================================
# DECORATORS
# ============================================================================

def log_entry_exit(logger: logging.Logger = None, level: int = logging.DEBUG):
    """
    Decorator to log function entry and exit.
    
    Usage:
        @log_entry_exit
        def my_function():
            pass
        
        @log_entry_exit(logger=my_logger)
        def my_function():
            pass
    """
    def decorator(func: Callable):
        _logger = logger or logging.getLogger(func.__module__)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            _logger.log(level, f"ENTER: {func.__name__} with args={args}, kwargs={kwargs}")
            try:
                result = func(*args, **kwargs)
                _logger.log(level, f"EXIT: {func.__name__} with result={result}")
                return result
            except Exception as e:
                _logger.log(level, f"EXIT: {func.__name__} with exception={e}")
                raise
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            _logger.log(level, f"ENTER: {func.__name__} with args={args}, kwargs={kwargs}")
            try:
                result = await func(*args, **kwargs)
                _logger.log(level, f"EXIT: {func.__name__} with result={result}")
                return result
            except Exception as e:
                _logger.log(level, f"EXIT: {func.__name__} with exception={e}")
                raise
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


# ============================================================================
# SETUP FUNCTION
# ============================================================================

def setup_logging(
    name: str = "curemd-qa",
    level: str = "INFO",
    format_type: str = "detailed",
    log_file: Optional[str] = None,
    config: Dict = None
) -> logging.Logger:
    """
    Setup logging for the application.
    
    Args:
        name: Logger name
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        format_type: Format type (plain, json, structured, detailed)
        log_file: Path to log file (optional)
        config: Full configuration dict
        
    Returns:
        Configured logger instance
    """
    config = config or {}
    
    # Get or create logger
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    
    # Clear existing handlers
    logger.handlers.clear()
    
    # Choose formatter
    format_type = format_type or config.get("format", "detailed")
    
    if format_type == "json":
        formatter = JSONFormatter(
            indent=config.get("json_indent", 2),
            include_traceback=config.get("include_traceback", True)
        )
    elif format_type == "structured":
        formatter = StructuredFormatter(include_caller=True)
    elif format_type == "detailed":
        formatter = DetailedFormatter(show_colors=True)
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler
    if log_file or config.get("file_path"):
        file_path = log_file or config.get("file_path", "logs/app.log")
        
        # Create directory if needed
        Path(file_path).parent.mkdir(parents=True, exist_ok=True)
        
        # Use rotating file handler for production
        if config.get("use_rotating", False):
            from logging.handlers import RotatingFileHandler
            handler = RotatingFileHandler(
                file_path,
                maxBytes=config.get("max_bytes", 10 * 1024 * 1024),
                backupCount=config.get("backup_count", 5)
            )
        else:
            handler = logging.FileHandler(file_path)
        
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    # Prevent propagation to root logger
    logger.propagate = False
    
    return logger


# ============================================================================
# GET LOGGER HELPER
# ============================================================================

def get_logger(name: str = None) -> logging.Logger:
    """
    Get a logger instance.
    
    Args:
        name: Logger name (defaults to module name)
        
    Returns:
        Logger instance
    """
    if name is None:
        import inspect
        frame = inspect.currentframe().f_back
        name = frame.f_globals.get("__name__", __name__)
    
    return logging.getLogger(name)


# ============================================================================
# DEFAULT LOGGING SETUP
# ============================================================================

# Setup default logging on module import
_default_logger = setup_logging(
    name="curemd-qa",
    level=DEFAULT_CONFIG["level"],
    format_type=DEFAULT_CONFIG["format"]
)


if __name__ == "__main__":
    # Test logging
    logger = get_logger(__name__)
    
    logger.debug("Debug message")
    logger.info("Info message")
    logger.warning("Warning message")
    logger.error("Error message")
    
    # Test structured logging
    structured = StructuredLogger(__name__)
    structured.info("Test structured", user="test", action="test_action")
    
    # Test context
    with LogContext(logger, request_id="123", user_id="456"):
        logger.info("In context")