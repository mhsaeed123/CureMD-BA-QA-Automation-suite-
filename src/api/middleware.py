"""
API Middleware
==============
Middleware components for the QA automation API.

Author: CureMD BA QA Team
Version: 1.0.0
"""

import time
import logging
from typing import Callable, Dict, Any
from datetime import datetime
from collections import defaultdict
from threading import Lock

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger("api.middleware")


# ============================================================================
# LOGGING MIDDLEWARE
# ============================================================================

class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging all HTTP requests and responses.
    """
    
    def __init__(self, app: ASGIApp, log_requests: bool = True):
        super().__init__(app)
        self.log_requests = log_requests
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and log details."""
        start_time = time.time()
        request_id = f"req_{int(start_time * 1000)}"
        
        # Log request
        if self.log_requests:
            logger.info(
                f"[{request_id}] {request.method} {request.url.path} "
                f"Client: {request.client.host if request.client else 'unknown'}"
            )
        
        # Add request ID to state
        request.state.request_id = request_id
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000
            
            # Log response
            if self.log_requests:
                logger.info(
                    f"[{request_id}] Response: {response.status_code} "
                    f"Duration: {duration_ms:.2f}ms"
                )
            
            # Add custom headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{duration_ms:.2f}ms"
            
            return response
            
        except Exception as e:
            logger.error(f"[{request_id}] Request failed: {e}")
            raise


# ============================================================================
# RATE LIMITING MIDDLEWARE
# ============================================================================

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple rate limiting middleware.
    
    Limits requests per IP address within a time window.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        requests_per_minute: int = 60,
        burst_size: int = 10
    ):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.burst_size = burst_size
        
        # Simple in-memory tracking
        self._requests: Dict[str, list] = defaultdict(list)
        self._lock = Lock()
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Check rate limit and process request."""
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()
        
        with self._lock:
            # Clean old requests
            self._requests[client_ip] = [
                ts for ts in self._requests[client_ip]
                if current_time - ts < 60
            ]
            
            # Check rate limit
            if len(self._requests[client_ip]) >= self.requests_per_minute:
                logger.warning(f"Rate limit exceeded for {client_ip}")
                
                return Response(
                    content='{"error": "Rate limit exceeded", "retry_after": 60}',
                    status_code=429,
                    media_type="application/json",
                    headers={"Retry-After": "60"}
                )
            
            # Check burst limit
            recent_requests = [
                ts for ts in self._requests[client_ip]
                if current_time - ts < 1
            ]
            
            if len(recent_requests) >= self.burst_size:
                logger.warning(f"Burst limit exceeded for {client_ip}")
                
                return Response(
                    content='{"error": "Burst limit exceeded", "retry_after": 1}',
                    status_code=429,
                    media_type="application/json",
                    headers={"Retry-After": "1"}
                )
            
            # Record request
            self._requests[client_ip].append(current_time)
        
        return await call_next(request)


# ============================================================================
# SECURITY MIDDLEWARE
# ============================================================================

class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Security middleware for common protections.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        allowed_hosts: list = None,
        allowed_content_types: list = None,
        max_content_length: int = 10 * 1024 * 1024  # 10MB
    ):
        super().__init__(app)
        self.allowed_hosts = allowed_hosts or ["*"]
        self.allowed_content_types = allowed_content_types
        self.max_content_length = max_content_length
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Apply security checks."""
        
        # Check allowed hosts
        if self.allowed_hosts != ["*"]:
            host = request.headers.get("host", "")
            if host not in self.allowed_hosts:
                logger.warning(f"Blocked request from unauthorized host: {host}")
                return Response(
                    content='{"error": "Forbidden"}',
                    status_code=403,
                    media_type="application/json"
                )
        
        # Check content length
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > self.max_content_length:
                    logger.warning(f"Content length exceeded: {content_length}")
                    return Response(
                        content='{"error": "Payload too large"}',
                        status_code=413,
                        media_type="application/json"
                    )
            except ValueError:
                pass
        
        # Security headers
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response


# ============================================================================
# CORS MIDDLEWARE
# ============================================================================

class CORSMiddleware(BaseHTTPMiddleware):
    """
    CORS (Cross-Origin Resource Sharing) middleware.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        allow_origins: list = None,
        allow_methods: list = None,
        allow_headers: list = None,
        allow_credentials: bool = True
    ):
        super().__init__(app)
        
        self.allow_origins = allow_origins or ["*"]
        self.allow_methods = allow_methods or ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        self.allow_headers = allow_headers or ["*"]
        self.allow_credentials = allow_credentials
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Handle CORS."""
        
        # Handle preflight
        if request.method == "OPTIONS":
            return Response(
                status_code=200,
                headers=self._get_cors_headers(request)
            )
        
        response = await call_next(request)
        
        # Add CORS headers
        for header, value in self._get_cors_headers(request).items():
            response.headers[header] = value
        
        return response
    
    def _get_cors_headers(self, request: Request) -> Dict[str, str]:
        """Build CORS headers."""
        origin = request.headers.get("origin", "*")
        
        # Check if origin is allowed
        if self.allow_origins != ["*"] and origin not in self.allow_origins:
            origin = ""
        
        headers = {
            "Access-Control-Allow-Origin": origin if origin else "*",
            "Access-Control-Allow-Methods": ", ".join(self.allow_methods),
            "Access-Control-Allow-Headers": ", ".join(self.allow_headers) if isinstance(self.allow_headers, list) else "*",
        }
        
        if self.allow_credentials:
            headers["Access-Control-Allow-Credentials"] = "true"
        
        return headers


# ============================================================================
# METRICS MIDDLEWARE
# ============================================================================

class MetricsMiddleware(BaseHTTPMiddleware):
    """
    Middleware for collecting request metrics.
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self._metrics = {
            "total_requests": 0,
            "requests_by_method": defaultdict(int),
            "requests_by_path": defaultdict(int),
            "errors": 0,
            "total_duration": 0.0
        }
        self._lock = Lock()
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Collect metrics."""
        start_time = time.time()
        
        with self._lock:
            self._metrics["total_requests"] += 1
            self._metrics["requests_by_method"][request.method] += 1
            self._metrics["requests_by_path"][request.url.path] += 1
        
        try:
            response = await call_next(request)
            
            if response.status_code >= 400:
                with self._lock:
                    self._metrics["errors"] += 1
            
            return response
            
        finally:
            duration = time.time() - start_time
            with self._lock:
                self._metrics["total_duration"] += duration
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get collected metrics."""
        with self._lock:
            avg_duration = (
                self._metrics["total_duration"] / self._metrics["total_requests"]
                if self._metrics["total_requests"] > 0 else 0
            )
            
            return {
                "total_requests": self._metrics["total_requests"],
                "requests_by_method": dict(self._metrics["requests_by_method"]),
                "requests_by_path": dict(self._metrics["requests_by_path"]),
                "errors": self._metrics["errors"],
                "average_duration_ms": avg_duration * 1000
            }


# ============================================================================
# SETUP FUNCTION
# ============================================================================

def setup_middleware(app: ASGIApp, config: Dict[str, Any] = None):
    """
    Setup all middleware for the application.
    
    Args:
        app: FastAPI application instance
        config: Configuration dictionary
    """
    config = config or {}
    
    # Logging
    if config.get("logging", True):
        app.add_middleware(LoggingMiddleware)
    
    # Rate limiting
    if config.get("rate_limit", {}).get("enabled", True):
        app.add_middleware(
            RateLimitMiddleware,
            requests_per_minute=config.get("rate_limit", {}).get("requests_per_minute", 60),
            burst_size=config.get("rate_limit", {}).get("burst_size", 10)
        )
    
    # Security
    if config.get("security", {}).get("enabled", True):
        app.add_middleware(
            SecurityMiddleware,
            allowed_hosts=config.get("security", {}).get("allowed_hosts"),
            max_content_length=config.get("security", {}).get("max_content_length", 10 * 1024 * 1024)
        )
    
    # CORS
    if config.get("cors", {}).get("enabled", True):
        app.add_middleware(
            CORSMiddleware,
            allow_origins=config.get("cors", {}).get("allow_origins"),
            allow_methods=config.get("cors", {}).get("allow_methods"),
            allow_headers=config.get("cors", {}).get("allow_headers")
        )
    
    # Metrics
    if config.get("metrics", True):
        app.add_middleware(MetricsMiddleware)
    
    logger.info("Middleware configured successfully")


# ============================================================================
# MIDDLEWARE STACK FOR ROUTES
# ============================================================================

def get_middleware_stack() -> list:
    """
    Get list of middleware to apply.
    Useful for testing or custom configurations.
    """
    return [
        MetricsMiddleware,
        LoggingMiddleware,
        RateLimitMiddleware,
        SecurityMiddleware,
        CORSMiddleware
    ]


# Export for convenience
__all__ = [
    'LoggingMiddleware',
    'RateLimitMiddleware',
    'SecurityMiddleware',
    'CORSMiddleware',
    'MetricsMiddleware',
    'setup_middleware',
]