"""
CureMD BA QA Automation Suite - API Module
===========================================
FastAPI routes and middleware for the automation suite.

Author: CureMD BA QA Team
Version: 1.0.0
"""

from .routes import router, create_app
from .middleware import (
    setup_middleware,
    RateLimitMiddleware,
    SecurityMiddleware,
    LoggingMiddleware,
    CORSMiddleware
)

__all__ = [
    'router',
    'create_app',
    'setup_middleware',
    'RateLimitMiddleware',
    'SecurityMiddleware',
    'LoggingMiddleware',
    'CORSMiddleware',
]

__version__ = '1.0.0'