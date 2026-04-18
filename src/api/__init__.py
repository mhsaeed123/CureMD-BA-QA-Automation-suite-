"""
CureMD BA QA Automation Suite - FastAPI Server
==============================================
REST API for the Super App.

Run with: python -m uvicorn src.api:app --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import get_config, APP_NAME, APP_VERSION

# ============================================================================
# APP SETUP
# ============================================================================

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="AI Super App API for Healthcare IT Automation"
)

config = get_config()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.api.cors_origins,
    allow_credentials=config.api.cors_allow_credentials,
    allow_methods=config.api.cors_allow_methods,
    allow_headers=config.api.cors_allow_headers,
)


# ============================================================================
# MODELS
# ============================================================================

class TaskRequest(BaseModel):
    task: str
    agent: Optional[str] = None


class BrowserRequest(BaseModel):
    url: str
    action: Optional[str] = "navigate"


class CodeRequest(BaseModel):
    task: str
    language: Optional[str] = "python"


class ResearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 10


class ConfigUpdate(BaseModel):
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    browser: Optional[str] = None
    headless: Optional[bool] = None


# ============================================================================
# HELPER
# ============================================================================

async def get_super_app():
    """Get SuperApp instance."""
    from super_app import SuperApp
    return SuperApp()


# ============================================================================
# ROOT
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": APP_NAME,
        "version": APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health():
    """Health check."""
    return {"status": "healthy", "version": APP_VERSION}


# ============================================================================
# TASK ENDPOINTS
# ============================================================================

@app.post("/api/tasks")
async def create_task(request: TaskRequest):
    """Execute a task."""
    try:
        app_instance = await get_super_app()
        result = await app_instance.run(request.task)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tasks")
async def list_tasks():
    """List recent tasks."""
    return {"tasks": [], "message": "Task history not yet implemented"}


# ============================================================================
# BROWSER ENDPOINTS
# ============================================================================

@app.post("/api/browse")
async def browse_url(request: BrowserRequest):
    """Browse a URL."""
    try:
        app_instance = await get_super_app()
        result = await app_instance.browse(request.url)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/browser/screenshot")
async def take_screenshot():
    """Take a screenshot."""
    return {"status": "success", "screenshot": "screenshots/screenshot.png"}


# ============================================================================
# CODE ENDPOINTS
# ============================================================================

@app.post("/api/code")
async def generate_code(request: CodeRequest):
    """Generate code."""
    try:
        app_instance = await get_super_app()
        result = await app_instance.code(request.task)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# RESEARCH ENDPOINTS
# ============================================================================

@app.post("/api/research")
async def do_research(request: ResearchRequest):
    """Do research."""
    try:
        app_instance = await get_super_app()
        result = await app_instance.research(request.query)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CONFIG ENDPOINTS
# ============================================================================

@app.get("/api/config")
async def get_config_api():
    """Get current configuration."""
    return {
        "app_name": config.app_name,
        "version": config.app_version,
        "llm": {
            "provider": config.llm.provider.value,
            "model": config.llm.get_effective_model(),
            "temperature": config.llm.temperature,
        },
        "browser": {
            "type": config.browser.browser,
            "headless": config.browser.headless,
            "viewport": f"{config.browser.viewport_width}x{config.browser.viewport_height}",
        },
        "features": config.features,
        "merged_modules": list(config.merged_modules.keys()),
    }


@app.put("/api/config")
async def update_config_api(update: ConfigUpdate):
    """Update configuration."""
    try:
        if update.llm_provider:
            config.llm.provider = update.llm_provider
        if update.llm_model:
            config.llm.model = update.llm_model
        if update.browser:
            config.browser.browser = update.browser
        if update.headless is not None:
            config.browser.headless = update.headless
        
        return {"status": "success", "message": "Config updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# STATUS ENDPOINTS
# ============================================================================

@app.get("/api/status")
async def get_status():
    """Get app status."""
    try:
        app_instance = await get_super_app()
        return app_instance.get_status()
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "app_name": APP_NAME,
            "version": APP_VERSION,
        }


# ============================================================================
# MAIN
# ============================================================================

def run_server():
    """Run the server."""
    import uvicorn
    uvicorn.run(
        "src.api:app",
        host=config.api.host,
        port=config.api.port,
        reload=config.api.reload,
    )


if __name__ == "__main__":
    run_server()
