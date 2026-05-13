"""
OneAgent API Server + CLI
========================
Single FastAPI app that auto-discovers module routers.
Also serves as the CLI entry point.

Usage:
    # API server
    python -m api.main serve

    # CLI
    python -m api.main ask "What is FHIR?"
    python -m api.main budget
"""

import importlib
import logging
import sys
from pathlib import Path
from typing import Optional

import click
import yaml
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from core.config import get_settings
from core.llm.router import get_router
from core.llm.budget import get_budget_tracker
from core.agents.tools import get_registry

logger = logging.getLogger(__name__)
console = Console()


# ---------------------------------------------------------------------------
# FastAPI app (lazy — only created when needed)
# ---------------------------------------------------------------------------

def create_app():
    """Create and configure the FastAPI app."""
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    app = FastAPI(
        title="OneAgent",
        version="0.1.0",
        description="Self-building, self-extending agentic platform",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Core routes ---

    @app.get("/")
    def root():
        return {
            "name": "OneAgent",
            "version": "0.1.0",
            "status": "running",
            "modules": list(_discover_modules().keys()),
        }

    @app.get("/health")
    def health():
        return {"status": "healthy"}

    # --- LLM routes ---

    @app.get("/api/models")
    def list_models():
        router = get_router()
        return {"models": router.list_available_models()}

    @app.get("/api/budget")
    def budget_report():
        tracker = get_budget_tracker()
        return {
            "daily_total": tracker.get_total_spend(),
            "by_provider": tracker.get_daily_spend(),
            "details": tracker.get_daily_detail(),
        }

    @app.get("/api/task-classes")
    def task_classes():
        router = get_router()
        return {"task_classes": router.get_task_classes()}

    # --- Tools routes ---

    @app.get("/api/tools")
    def list_tools():
        registry = get_registry()
        return {"tools": {name: {"description": t.description, "module": t.module}
                         for name, t in registry.get_all().items()}}

    # --- Auto-discover module routers ---
    # (future: modules can contribute FastAPI routers)

    return app


def _discover_modules() -> dict:
    """Discover available modules."""
    modules_dir = PROJECT_ROOT / "modules"
    discovered = {}
    if modules_dir.exists():
        for mod_dir in modules_dir.iterdir():
            if mod_dir.is_dir() and not mod_dir.name.startswith("_"):
                manifest = mod_dir / "manifest.py"
                if manifest.exists():
                    discovered[mod_dir.name] = str(manifest)
                    # Auto-import tools module to register tools
                    try:
                        tools_mod = mod_dir / "tools.py"
                        if tools_mod.exists():
                            importlib.import_module(f"modules.{mod_dir.name}.tools")
                    except Exception as e:
                        logger.warning(f"Failed to load tools for {mod_dir.name}: {e}")
    return discovered


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

@click.group()
def cli():
    """OneAgent — self-building, self-extending agentic platform."""
    pass


@cli.command()
@click.argument("question", required=False)
@click.option("--task", "task_class", default="chat", help="Task class: classify, code, reason, etc.")
@click.option("--model", default=None, help="Override model")
@click.option("--no-cache", is_flag=True, help="Skip cache")
def ask(question: str, task_class: str, model: Optional[str], no_cache: bool):
    """Ask the LLM a question through the router."""
    if not question:
        # Interactive mode
        console.print(Panel("OneAgent Interactive Mode", style="bold blue"))
        console.print("Type your question and press Enter. Ctrl+C to exit.\n")
        while True:
            try:
                question = input("> ").strip()
                if not question:
                    continue
                if question.lower() in ("quit", "exit", "q"):
                    break
                _run_ask(question, task_class, model, not no_cache)
            except KeyboardInterrupt:
                break
        console.print("\nGoodbye!")
    else:
        _run_ask(question, task_class, model, not no_cache)


def _run_ask(question: str, task_class: str, model: Optional[str], use_cache: bool):
    """Execute an ask command."""
    import asyncio

    async def _ask():
        router = get_router()
        with console.status(f"Thinking ({task_class})..."):
            response = await router.ask(
                question,
                task_class=task_class,
                model=model,
                use_cache=use_cache,
            )
        cached_tag = " [CACHED]" if response.cached else ""
        console.print(Panel(
            response.content,
            title=f"{response.provider}/{response.model}{cached_tag}",
            subtitle=f"Tokens: {response.total_tokens}",
        ))

    asyncio.run(_ask())


@cli.command()
@click.argument("module_name", required=False)
@click.argument("task", required=False)
@click.option("--model", default=None, help="Override model")
def run_agent(module_name: Optional[str], task: Optional[str], model: Optional[str]):
    """Run an agent loop for a module."""
    import asyncio

    if not task:
        task = module_name
        module_name = None

    if not task:
        console.print("[red]Error: Provide a task. Usage: run-agent [module] <task>[/red]")
        return

    async def _run():
        from core.agents.loop import AgentLoop
        agent = AgentLoop(module=module_name or "", model=model)
        with console.status(f"Agent running: {task[:50]}..."):
            result = await agent.run(task)
        console.print(Panel(
            result["content"],
            title=f"Agent Result ({result['iterations']} iterations, {result['tool_calls']} tool calls)",
        ))

    asyncio.run(_run())


@cli.command()
@click.option("--date", default=None, help="Date (YYYY-MM-DD), default: today")
def budget(date: Optional[str]):
    """Show today's LLM budget usage."""
    tracker = get_budget_tracker()
    total = tracker.get_total_spend(date)
    by_provider = tracker.get_daily_spend(date)
    details = tracker.get_daily_detail(date)

    settings = get_settings()
    limit = settings.llm.daily_budget_usd

    table = Table(title=f"Budget Report ({date or 'today'})")
    table.add_column("Provider", style="cyan")
    table.add_column("Spent", style="green")
    table.add_column("Model", style="yellow")
    table.add_column("Tokens In", style="dim")
    table.add_column("Tokens Out", style="dim")
    table.add_column("Cached", style="dim")

    for d in details:
        table.add_row(
            d["provider"],
            f"${d['cost_usd']:.6f}",
            d["model"],
            str(d["input_tokens"]),
            str(d["output_tokens"]),
            "✓" if d["cached"] else "",
        )

    console.print(table)
    console.print(f"\nTotal: ${total:.4f} / ${limit:.2f} daily limit")


@cli.command()
def models():
    """List available models and task classes."""
    router = get_router()

    table = Table(title="Available Models")
    table.add_column("Provider", style="cyan")
    table.add_column("Model", style="green")
    for m in router.list_available_models():
        table.add_row(m["provider"], m["model"])
    console.print(table)

    tc = router.get_task_classes()
    if tc:
        table2 = Table(title="Task Class Rankings")
        table2.add_column("Task Class", style="cyan")
        table2.add_column("Models (preference order)", style="green")
        for cls, models_list in tc.items():
            table2.add_row(cls, " > ".join(models_list))
        console.print(table2)


@cli.command()
def tools():
    """List all registered tools."""
    _discover_modules()  # Auto-load module tools
    registry = get_registry()
    all_tools = registry.get_all()

    table = Table(title="Registered Tools")
    table.add_column("Name", style="cyan")
    table.add_column("Module", style="green")
    table.add_column("Description", style="dim")
    for name, t in all_tools.items():
        table.add_row(name, t.module, t.description[:60])
    console.print(table)


@cli.command()
@click.option("--host", default="127.0.0.1", help="Host")
@click.option("--port", default=8000, help="Port")
@click.option("--reload", "do_reload", is_flag=True, help="Enable auto-reload")
def serve(host: str, port: int, do_reload: bool):
    """Start the FastAPI server."""
    import uvicorn

    console.print(Panel(
        f"OneAgent API Server\nhttp://{host}:{port}\nDocs: http://{host}:{port}/docs",
        style="bold green",
    ))

    uvicorn.run(
        "api.main:create_app",
        host=host,
        port=port,
        reload=do_reload,
        factory=True,
    )


if __name__ == "__main__":
    cli()
