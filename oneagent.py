"""
OneAgent - Unified Agentic Platform
====================================
Merges CureMD BA QA Automation Suite + OneAgent architecture
Single entry point for: FHIR BA/QA, LEAP analytics, research, coding, browser automation

Usage:
    python oneagent.py                          # Interactive mode
    python oneagent.py ask "What is FHIR?"      # Ask through LLM router
    python oneagent.py serve                    # Start API server
    python oneagent.py budget                   # Show token spend
    python oneagent.py models                   # List available models
    python oneagent.py tools                    # List registered tools
    python oneagent.py run <task>               # Run through agent loop
    python oneagent.py browse <url>             # Browser automation
    python oneagent.py research <query>         # Deep research
    python oneagent.py code <description>       # Code generation
    python oneagent.py status                   # System status
"""

import asyncio
import sys
import os
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime

# Ensure project root on path
PROJECT_ROOT = Path(__file__).resolve().parent
SRC_DIR = PROJECT_ROOT / "src"
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
    HAS_RICH = True
except ImportError:
    HAS_RICH = False
    # Simple fallback
    class Console:
        def print(self, msg="", **kw): print(msg)
        def status(self, msg): 
            class Dummy:
                def __enter__(self): return self
                def __exit__(self, *a): pass
            return Dummy()
    class Panel:
        @staticmethod
        def fit(content, title="", **kw): return f"{title}: {content}" if title else content
    class Table:
        def __init__(self, title=""): self.title = title; self.cols = []; self.rows = []
        def add_column(self, name, **kw): self.cols.append(name)
        def add_row(self, *vals, **kw): self.rows.append(vals)

console = Console()
logger = logging.getLogger("oneagent")


# ============================================================================
# CONFIGURATION - Single source of truth
# ============================================================================

def load_config():
    """Load configuration from env + yaml."""
    from dotenv import load_dotenv
    load_dotenv(PROJECT_ROOT / ".env", override=False)
    
    try:
        from config import get_config, APP_NAME, APP_VERSION
        return get_config()
    except ImportError:
        return None


# ============================================================================
# LLM ROUTER - Token-efficient multi-provider routing
# ============================================================================

def get_llm_router():
    """Get or create the LLM router."""
    try:
        from llm_runtime.router import get_router
        return get_router()
    except ImportError:
        # Fallback: try loading from providers
        try:
            from providers import AIProviderFactory
            return AIProviderFactory
        except ImportError:
            return None


async def ask_llm(question: str, task_class: str = "chat", model: str = None, use_cache: bool = True):
    """Ask a question through the LLM router."""
    router = get_llm_router()
    if router is None:
        return {"error": "No LLM router available. Install dependencies: pip install openai anthropic ollama"}
    
    if hasattr(router, 'ask'):
        return await router.ask(question, task_class=task_class, model=model, use_cache=use_cache)
    else:
        return {"error": "LLM router interface mismatch"}


# ============================================================================
# AGENT LOOP - Unified agent execution
# ============================================================================

def get_agent_loop(module: str = "", model: str = None):
    """Get an agent loop instance."""
    try:
        from agents.loop import AgentLoop
        return AgentLoop(module=module, model=model)
    except ImportError:
        return None


# ============================================================================
# BUDGET TRACKING
# ============================================================================

def get_budget_tracker():
    """Get the budget tracker."""
    try:
        from llm_runtime.budget import get_budget_tracker
        return get_budget_tracker()
    except ImportError:
        return None


# ============================================================================
# SUPER APP (Legacy compatibility)
# ============================================================================

def get_super_app():
    """Get the legacy SuperApp instance."""
    try:
        from super_app import SuperApp
        return SuperApp()
    except ImportError:
        return None


# ============================================================================
# CLI COMMANDS
# ============================================================================

async def cmd_ask(args):
    """Ask the LLM a question."""
    if not args:
        console.print("[red]Usage: oneagent ask <question>[/red]")
        return
    
    question = " ".join(args)
    task_class = "chat"
    model = None
    use_cache = True
    
    # Parse flags
    i = 0
    while i < len(args):
        if args[i] == "--task" and i + 1 < len(args):
            task_class = args[i + 1]
            i += 2
        elif args[i] == "--model" and i + 1 < len(args):
            model = args[i + 1]
            i += 2
        elif args[i] == "--no-cache":
            use_cache = False
            i += 1
        else:
            i += 1
    
    response = await ask_llm(question, task_class, model, use_cache)
    
    if isinstance(response, dict) and "error" in response:
        console.print(f"[red]Error: {response['error']}[/red]")
    elif hasattr(response, 'content'):
        cached_tag = " [CACHED]" if getattr(response, 'cached', False) else ""
        provider = getattr(response, 'provider', 'unknown')
        rmodel = getattr(response, 'model', 'unknown')
        tokens = getattr(response, 'total_tokens', 0)
        console.print(Panel(
            response.content,
            title=f"{provider}/{rmodel}{cached_tag}",
            subtitle=f"Tokens: {tokens}",
        ))
    else:
        console.print(str(response))


async def cmd_run(args):
    """Run a task through the agent loop."""
    if not args:
        console.print("[red]Usage: oneagent run <task>[/red]")
        return
    
    task = " ".join(args)
    agent = get_agent_loop()
    
    if agent is None:
        # Fallback to SuperApp
        app = get_super_app()
        if app:
            result = await app.run(task)
            console.print(Panel(str(result), title="SuperApp Result"))
        else:
            console.print("[red]No agent loop available[/red]")
        return
    
    with console.status(f"Agent running: {task[:50]}..."):
        result = await agent.run(task)
    
    console.print(Panel(
        result.get("content", str(result)),
        title=f"Agent Result ({result.get('iterations', '?')} iterations)",
    ))


async def cmd_browse(args):
    """Browse a URL with browser automation."""
    if not args:
        console.print("[red]Usage: oneagent browse <url>[/red]")
        return
    
    url = args[0]
    app = get_super_app()
    if app:
        result = await app.browse(url)
        console.print(Panel(str(result), title=f"Browsed: {url}"))
    else:
        try:
            from browser.controller import BrowserController
            ctrl = BrowserController()
            result = await ctrl.navigate(url)
            console.print(Panel(str(result), title=f"Browsed: {url}"))
        except ImportError:
            console.print("[red]Browser automation not available[/red]")


async def cmd_research(args):
    """Run deep research."""
    if not args:
        console.print("[red]Usage: oneagent research <query>[/red]")
        return
    
    query = " ".join(args)
    
    # Try agent loop first
    agent = get_agent_loop(module="research")
    if agent:
        with console.status(f"Researching: {query[:50]}..."):
            result = await agent.run(query)
        console.print(Panel(result.get("content", str(result)), title="Research Result"))
    else:
        app = get_super_app()
        if app:
            result = await app.research(query)
            console.print(Panel(str(result), title="Research Result"))
        else:
            console.print("[red]Research agent not available[/red]")


async def cmd_code(args):
    """Generate code."""
    if not args:
        console.print("[red]Usage: oneagent code <description>[/red]")
        return
    
    description = " ".join(args)
    app = get_super_app()
    if app:
        result = await app.code(description)
        console.print(Panel(str(result.get("code", result)), title="Generated Code"))
    else:
        agent = get_agent_loop(module="coding")
        if agent:
            result = await agent.run(description)
            console.print(Panel(result.get("content", str(result)), title="Generated Code"))
        else:
            console.print("[red]Code agent not available[/red]")


async def cmd_budget(args):
    """Show budget usage."""
    tracker = get_budget_tracker()
    if tracker is None:
        console.print("[yellow]Budget tracking not available[/yellow]")
        return
    
    total = tracker.get_total_spend()
    by_provider = tracker.get_daily_spend()
    details = tracker.get_daily_detail()
    
    table = Table(title="Budget Report")
    table.add_column("Provider", style="cyan")
    table.add_column("Spent", style="green")
    table.add_column("Model", style="yellow")
    table.add_column("Tokens In", style="dim")
    table.add_column("Tokens Out", style="dim")
    
    for d in details:
        table.add_row(
            d.get("provider", "?"),
            f"${d.get('cost_usd', 0):.6f}",
            d.get("model", "?"),
            str(d.get("input_tokens", 0)),
            str(d.get("output_tokens", 0)),
        )
    
    console.print(table)
    console.print(f"\nTotal: ${total:.4f} today")


async def cmd_models(args):
    """List available models."""
    router = get_llm_router()
    if router is None:
        console.print("[yellow]LLM router not available[/yellow]")
        return
    
    if hasattr(router, 'list_available_models'):
        models = router.list_available_models()
        table = Table(title="Available Models")
        table.add_column("Provider", style="cyan")
        table.add_column("Model", style="green")
        for m in models:
            table.add_row(m.get("provider", "?"), m.get("model", "?"))
        console.print(table)
    
    if hasattr(router, 'get_task_classes'):
        tc = router.get_task_classes()
        if tc:
            table2 = Table(title="Task Class Rankings")
            table2.add_column("Task Class", style="cyan")
            table2.add_column("Models (preference order)", style="green")
            for cls, models_list in tc.items():
                table2.add_row(cls, " > ".join(models_list))
            console.print(table2)


async def cmd_tools(args):
    """List registered tools."""
    try:
        from tools.registry import get_registry
        registry = get_registry()
        all_tools = registry.get_all()
        
        table = Table(title="Registered Tools")
        table.add_column("Name", style="cyan")
        table.add_column("Module", style="green")
        table.add_column("Description", style="dim")
        for name, t in all_tools.items():
            table.add_row(name, getattr(t, 'module', '?'), getattr(t, 'description', '')[:60])
        console.print(table)
    except ImportError:
        console.print("[yellow]Tool registry not available[/yellow]")


async def cmd_status(args):
    """Show system status."""
    config = load_config()
    
    info = {
        "oneagent_version": "2.0.0",
        "curemd_suite_version": "1.0.0",
        "project_root": str(PROJECT_ROOT),
        "python": sys.version.split()[0],
        "time": datetime.now().isoformat(),
    }
    
    if config:
        info["llm_provider"] = getattr(config.llm, 'provider', 'unknown')
        info["llm_model"] = getattr(config.llm, 'get_effective_model', lambda: 'unknown')()
    
    # Check available components
    components = {}
    for name, module_path in [
        ("LLM Router", "llm_runtime.router"),
        ("Agent Loop", "agents.loop"),
        ("Tool Registry", "tools.registry"),
        ("Browser", "browser.controller"),
        ("Memory", "memory.buffer"),
        ("Skills", "skills.loader"),
        ("Orchestration", "orchestration.orchestrator"),
        ("MCP Server", "tools.mcp_server"),
        ("Budget Tracker", "llm_runtime.budget"),
        ("RAG/ChromaDB", "rag.chroma"),
        ("Meta/Author", "meta.module_author"),
        ("Scheduler", "orchestration.scheduler"),
    ]:
        try:
            __import__(module_path)
            components[name] = "OK"
        except ImportError:
            components[name] = "MISSING"
    
    table = Table(title="OneAgent System Status")
    table.add_column("Component", style="cyan")
    table.add_column("Status", style="green")
    for name, status in components.items():
        style = "green" if status == "OK" else "red"
        table.add_row(name, f"[{style}]{status}[/{style}]")
    console.print(table)
    
    console.print(f"\nProject: {info['project_root']}")
    console.print(f"Python: {info['python']}")
    console.print(f"Version: {info['oneagent_version']} (CureMD Suite: {info['curemd_suite_version']})")


async def cmd_serve(args):
    """Start the FastAPI server."""
    import uvicorn
    
    host = "127.0.0.1"
    port = 8000
    reload_flag = False
    
    i = 0
    while i < len(args):
        if args[i] == "--host" and i + 1 < len(args):
            host = args[i + 1]
            i += 2
        elif args[i] == "--port" and i + 1 < len(args):
            port = int(args[i + 1])
            i += 2
        elif args[i] == "--reload":
            reload_flag = True
            i += 1
        else:
            i += 1
    
    console.print(Panel(
        f"OneAgent API Server\nhttp://{host}:{port}\nDocs: http://{host}:{port}/docs",
        style="bold green",
    ))
    
    # Try the new API first, then fallback
    try:
        from api.main import create_app
        uvicorn.run("api.main:create_app", host=host, port=port, reload=reload_flag, factory=True)
    except ImportError:
        try:
            from backend.app.main import app
            uvicorn.run(app, host=host, port=port)
        except ImportError:
            console.print("[red]No API module found. Creating minimal server...[/red]")
            from fastapi import FastAPI
            app = FastAPI(title="OneAgent")
            
            @app.get("/")
            def root():
                return {"name": "OneAgent", "version": "2.0.0", "status": "running"}
            
            @app.get("/health")
            def health():
                return {"status": "healthy"}
            
            uvicorn.run(app, host=host, port=port)


async def cmd_interactive():
    """Interactive mode."""
    console.print(Panel(
        "OneAgent - Unified Agentic Platform v2.0\n"
        "Commands: ask, run, browse, research, code, budget, models, tools, status, serve, help, quit",
        title="OneAgent",
        style="bold blue",
    ))
    
    while True:
        try:
            user_input = input("\noneagent> ").strip()
            if not user_input:
                continue
            
            parts = user_input.split()
            cmd = parts[0].lower()
            args = parts[1:]
            
            if cmd in ("quit", "exit", "q"):
                break
            elif cmd == "help":
                print("Commands: ask, run, browse, research, code, budget, models, tools, status, serve")
            else:
                await dispatch_command(cmd, args)
                
        except KeyboardInterrupt:
            print()
            break
        except EOFError:
            break
    
    console.print("Goodbye!")


async def dispatch_command(cmd: str, args: list):
    """Dispatch a CLI command."""
    commands = {
        "ask": cmd_ask,
        "run": cmd_run,
        "browse": cmd_browse,
        "research": cmd_research,
        "code": cmd_code,
        "budget": cmd_budget,
        "models": cmd_models,
        "tools": cmd_tools,
        "status": cmd_status,
        "serve": cmd_serve,
    }
    
    handler = commands.get(cmd)
    if handler:
        await handler(args)
    else:
        # Default: treat as ask
        full_input = [cmd] + args
        await cmd_ask(full_input)


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Main entry point."""
    # Load config
    load_config()
    
    if len(sys.argv) > 1:
        cmd = sys.argv[1].lower()
        args = sys.argv[2:]
        
        if cmd in ("--help", "-h", "help"):
            print(__doc__)
        else:
            asyncio.run(dispatch_command(cmd, args))
    else:
        asyncio.run(cmd_interactive())


if __name__ == "__main__":
    main()
