"""
CureMD BA QA Automation Suite - CLI Launcher
=============================================
Command-line interface for the Super App.

Usage:
    python cli.py                    # Interactive mode
    python cli.py "your task"       # Run single task
    python cli.py --server          # Start API server
    python cli.py --browse <url>    # Browse URL
"""

import sys
import asyncio
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

import cli_handler  # noqa


def main():
    """Main CLI entry point."""
    if len(sys.argv) < 2:
        print("""
╔═══════════════════════════════════════════════════════════╗
║          CureMD BA QA Automation Suite - Super App        ║
║                    AI Super App v1.0.0                     ║
╠═══════════════════════════════════════════════════════════╣
║  Healthcare IT BA/QA Automation + General AI Agent       ║
║  Merged from 40+ open-source AI frameworks                ║
╠═══════════════════════════════════════════════════════════╣
║  Usage:                                                    ║
║    python cli.py                    # Interactive mode    ║
║    python cli.py "build a website"  # Single task         ║
║    python cli.py --server           # Start API server    ║
║    python cli.py --browse <url>     # Browse URL          ║
║    python cli.py --config           # Show config         ║
║    python cli.py --test             # Run tests           ║
║    python cli.py --help             # Show help           ║
╚═══════════════════════════════════════════════════════════╝
        """)
        # Run interactive mode
        asyncio.run(run_interactive())
        return
    
    cmd = sys.argv[1].lower()
    
    if cmd == "--server" or cmd == "-s":
        from src.api.server import run_server
        asyncio.run(run_server())
    
    elif cmd == "--browse" or cmd == "-b":
        if len(sys.argv) < 3:
            print("Error: URL required. Usage: --browse <url>")
            sys.exit(1)
        url = sys.argv[2]
        asyncio.run(run_browse(url))
    
    elif cmd == "--config" or cmd == "-c":
        show_config()
    
    elif cmd == "--test" or cmd == "-t":
        run_tests()
    
    elif cmd == "--help" or cmd == "-h":
        print(__doc__)
    
    else:
        # Treat as task
        task = " ".join(sys.argv[1:])
        asyncio.run(run_task(task))


async def run_interactive():
    """Run interactive mode."""
    try:
        from src.super_app import SuperApp
        app = SuperApp()
        
        print("\n[Super App] Type 'quit' to exit, 'help' for commands\n")
        
        while True:
            try:
                user_input = input("> ")
                
                if user_input.lower() in ['quit', 'exit', 'q']:
                    print("Goodbye!")
                    break
                
                if user_input.lower() == 'help':
                    print("Commands: quit, exit, status, help")
                    print("Or type any task to execute")
                    continue
                
                if user_input.lower() == 'status':
                    status = app.get_status()
                    print(f"Status: {status}")
                    continue
                
                if user_input.strip():
                    result = await app.run(user_input)
                    print(f"✓ Task completed: {result}")
                    
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Error: {e}")
                
    except ImportError as e:
        print(f"Error importing SuperApp: {e}")
        print("Make sure dependencies are installed: pip install -r requirements.txt")


async def run_task(task: str):
    """Run a single task."""
    try:
        from src.super_app import SuperApp
        app = SuperApp()
        result = await app.run(task)
        print(f"\n✓ Task completed successfully!")
        print(f"Result: {result}")
    except ImportError as e:
        print(f"Error: {e}")
        print("Install dependencies: pip install -r requirements.txt")


async def run_browse(url: str):
    """Browse a URL."""
    try:
        from src.super_app import SuperApp
        app = SuperApp()
        result = await app.browse(url)
        print(f"\n✓ Browsed: {url}")
        print(f"Result: {result}")
    except ImportError as e:
        print(f"Error: {e}")


def show_config():
    """Show current configuration."""
    try:
        from src.config import get_config
        cfg = get_config()
        print(f"""
╔═══════════════════════════════════════════════════════════╗
║                  Super App Configuration                 ║
╠═══════════════════════════════════════════════════════════╣
║  App: {cfg.app_name}
║  Version: {cfg.app_version}
║  LLM Provider: {cfg.llm.provider.value}
║  LLM Model: {cfg.llm.get_effective_model()}
║  Browser: {cfg.browser.browser}
║  Headless: {cfg.browser.headless}
╠═══════════════════════════════════════════════════════════╣
║  Features:                                                 ║
║    Multi-Agent: {cfg.features['multi_agent']}
║    Browser Automation: {cfg.features['browser_automation']}
║    Code Editing: {cfg.features['code_editing']}
║    Research: {cfg.features['research']}
║    Memory: {cfg.features['memory']}
╚═══════════════════════════════════════════════════════════╝
        """)
    except ImportError as e:
        print(f"Error loading config: {e}")


def run_tests():
    """Run tests."""
    import subprocess
    print("Running tests...")
    result = subprocess.run(["pytest", "tests/", "-v", "--tb=short"], cwd=Path(__file__).parent)
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
