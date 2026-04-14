# CureMD BA QA Automation Suite - AI Super App

## 🎯 Overview

A **monolith multi-module AI Super App** that combines the best features from 14+ open-source AI agent frameworks to become the next-generation alternative to ClickUp, OpenClaw, Manus, and OpenAI's Agents SDK.

## ✨ Features

### 🤖 Multi-Agent System
- **Supervisor Agent**: Task decomposition and delegation
- **Coder Agent**: Code editing with SEARCH/REPLACE blocks (aider-style)
- **Researcher Agent**: Web search and content extraction
- **Browser Agent**: Vision-based web automation

### 🌐 Browser Automation
- **Playwright + CDP Integration**: Full browser control
- **Vision Engine**: AI-powered element detection (LaVague-style)
- **Multi-Action Steps**: Type + Click in one turn (browser-use-style)
- **Loop Detection**: Prevents infinite clicking
- **Coordinate Fallback**: For complex/obfuscated DOMs

### 📝 Code Editing
- **SEARCH/REPLACE Blocks**: Surgical code modification (aider-style)
- **Fuzzy Patching**: Handles typos in LLM edits (sweep-style)
- **Syntax Guardrails**: Bracket balance validation before writing

### 🧠 Memory Architecture
- **Short-term**: Conversation buffer
- **Medium-term**: Vector-based semantic search (ChromaDB)
- **Long-term**: Persistent key-value store

### ⚙️ Orchestration
- **LangGraph-inspired**: Task graphs with channels
- **Event Streaming**: Trajectory replay and observability
- **Checkpointing**: Fault-tolerant execution
- **Celery Integration**: Distributed task execution

### 🔧 MCP Tool System
- Dynamic tool registration
- Schema-driven tools
- Any function can become an agent tool

### 💡 AI Providers
- OpenAI (GPT-4)
- Anthropic (Claude)
- Ollama (Local LLMs)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPER APP                                │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Supervisor│  │  Coder   │  │Researcher│  │ Browser  │  │
│  │  Agent   │  │  Agent   │  │  Agent   │  │  Agent   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │             │             │             │         │
│  ┌────┴─────────────┴─────────────┴─────────────┴────┐   │
│  │              ORCHESTRATION LAYER                    │   │
│  │    TaskGraph  │  EventStream  │  Scheduler        │   │
│  └────────────────────────┬───────────────────────────┘   │
│                           │                                │
│  ┌────────────────────────┴───────────────────────────┐   │
│  │                   MEMORY LAYER                     │   │
│  │  Buffer  │  Vector Memory  │  Memory Store        │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   BROWSER    │  │    TOOLS     │  │   PROVIDERS   │   │
│  │  Controller  │  │   (MCP)      │  │ OpenAI/Claude │   │
│  │  + Vision     │  │              │  │                │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │              LOGGING & OBSERVABILITY                │   │
│  │   Structured JSON  │  Colored Console  │  Files   │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Modules

| Module | Description | Inspired By |
|--------|-------------|-------------|
| `agents` | Multi-agent system | OpenManus, MetaGPT, AutoGPT |
| `orchestration` | Task graph execution | LangGraph, SuperAGI |
| `browser` | Web automation | browser-use, LaVague |
| `memory` | Memory systems | LangGraph memory |
| `providers` | LLM integrations | LangChain |
| `tools` | MCP tool system | OpenManus, Roo-Code |
| `logging` | Structured logging | OpenHands |
| `utils` | Common utilities | - |

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
cd CureMD-BA-QA-Automation-suite-

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium
```

### Basic Usage

```python
from src.super_app import SuperApp, SuperAppConfig

# Create app
app = SuperApp(SuperAppConfig(log_level="DEBUG"))

# Run a task
result = await app.run("Build a web scraper for news headlines")

# Browse a website
result = await app.browse("https://example.com", actions=[
    {"type": "click", "selector": "#button"},
    {"type": "type", "selector": "#input", "text": "search query"}
])
```

### CLI Usage

```bash
# Run a task
python -m src.super_app "Write a Python script to backup my database"

# Browse a URL
python -m src.super_app --browse https://example.com
```

## 🧪 Testing

```bash
# Run all tests
pytest

# Run unit tests only
pytest tests/unit/

# Run E2E browser tests
pytest tests/browser/ --headed

# Run with coverage
pytest --cov=src --cov-report=html
```

## 📁 Project Structure

```
CureMD-BA-QA-Automation-suite/
├── src/
│   ├── __init__.py
│   ├── super_app.py              # Main entry point
│   ├── agents/                   # Agent implementations
│   │   ├── __init__.py
│   │   ├── base.py              # Base Agent class
│   │   ├── supervisor.py        # Supervisor agent
│   │   ├── coder.py             # Code editing agent
│   │   ├── researcher.py        # Research agent
│   │   └── browser_agent.py     # Browser agent
│   ├── orchestration/            # Task orchestration
│   │   ├── __init__.py
│   │   ├── orchestrator.py      # Main orchestrator
│   │   ├── scheduler.py          # Task scheduler
│   │   └── events.py             # Event streaming
│   ├── browser/                  # Browser automation
│   │   ├── __init__.py
│   │   ├── controller.py         # Playwright controller
│   │   └── vision.py            # Vision engine
│   ├── memory/                   # Memory systems
│   │   ├── __init__.py
│   │   ├── buffer.py            # Conversation buffer
│   │   ├── vector.py            # Vector memory
│   │   ├── store.py             # Key-value store
│   │   └── checkpoint.py        # Checkpoint manager
│   ├── providers/                # AI providers
│   │   ├── __init__.py
│   │   ├── base.py              # Base provider
│   │   ├── openai_provider.py   # OpenAI
│   │   ├── anthropic_provider.py # Anthropic
│   │   └── ollama_provider.py    # Ollama
│   ├── tools/                    # MCP tools
│   │   ├── __init__.py
│   │   ├── mcp.py               # MCP server
│   │   └── registry.py          # Tool registry
│   ├── logging/                  # Logging
│   │   └── __init__.py          # Structured logging
│   └── utils/                    # Utilities
│       ├── __init__.py
│       ├── file_utils.py
│       └── http_utils.py
├── tests/
│   ├── __init__.py
│   ├── unit/                    # Unit tests
│   │   ├── test_agents.py
│   │   └── test_browser.py
│   └── browser/                 # E2E tests
│       └── test_e2e.py
├── pyproject.toml
├── requirements.txt
├── playwright.config.py
└── README.md
```

## 🎨 Key Features Breakdown

### Browser Automation

```python
# Vision-based element detection
browser.set_vision_engine(vision)
coords = await browser.find_element_vision("The login button")

# Multi-action steps (reduce latency)
results = await browser.execute_actions([
    {"type": "type", "selector": "#email", "text": "user@example.com"},
    {"type": "type", "selector": "#password", "text": "secret"},
    {"type": "click", "selector": "#login"}
])
```

### Code Editing

```python
# SEARCH/REPLACE blocks (aider-style)
coder.create_search_replace(
    path="src/main.py",
    search="""def old_function():
    pass""",
    replace="""def new_function():
    return "Hello World"
"""
)

# Apply all edits atomically
result = coder.apply_edits()
```

### Multi-Agent Workflow

```python
# Create supervisor with workers
supervisor = app.create_agent("supervisor")
supervisor.register_worker("coder", coder_agent)
supervisor.register_worker("researcher", researcher_agent)

# Delegate tasks
result = await supervisor.run("Build and test a REST API")
```

### Event Streaming

```python
# Subscribe to events
@app.event_stream.subscribe
async def on_event(event):
    print(f"{event.type}: {event.data}")

# Replay trajectory
events = app.get_event_replay()
```

## 🛠️ Configuration

```python
config = SuperAppConfig(
    name="My-SuperApp",
    default_provider="openai",
    log_level="INFO",
    log_dir="logs",
    memory_enabled=True,
    browser_enabled=True,
    max_iterations=100
)
```

## 📚 Inspiration Sources

This project synthesizes the best ideas from:

| Framework | Key Feature |
|-----------|-------------|
| OpenManus | General AI agent framework |
| MetaGPT | Multi-agent collaboration |
| AutoGPT | Autonomous task execution |
| BabyAGI | Task-oriented agent |
| LangGraph | State orchestration (Pregel) |
| browser-use | Browser automation |
| LaVague | Vision-based web navigation |
| aider | SEARCH/REPLACE code editing |
| sweep | Fuzzy patching |
| OpenHands | Event streaming |
| Roo-Code | VS Code extension agent |
| SuperAGI | Task management |
| stagehand | Simple browser automation |
| skyvern | Workflow automation |

## 📄 License

MIT License

## 🤝 Contributing

Contributions welcome! Please read the contribution guidelines and submit PRs.

---

**Built with ❤️ for the AI automation community**
