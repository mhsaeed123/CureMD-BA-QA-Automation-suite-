# OneAgent — Self-Building Agentic Platform for Healthcare IT

> Merged from CureMD BA/QA Automation Suite + OneAgent Architecture  
> **Version 2.0.0** | Author: Muhammad Haris Saeed

## What Is This

One unified agentic platform that replaces 34+ scattered forks with a single runtime. Built for Healthcare IT BA/QA automation (FHIR, LEAP, CureMD), but extensible to any domain via self-authoring modules.

**Two ways to use it:**
1. **Standalone local app** — `python oneagent.py` (no server needed)
2. **Agent platform** — `python oneagent.py serve` (FastAPI + Goose/OpenClaw/Hermes configs)

## Quick Start

```bash
# Install dependencies
pip install -e .

# Interactive mode
python oneagent.py

# CLI commands
python oneagent.py ask "What is FHIR R4?"
python oneagent.py run "Audit all FHIR endpoints"
python oneagent.py browse "https://hapi.fhir.org"
python oneagent.py research "ONC HTI-2 final rule"
python oneagent.py code "Write a FHIR Patient validator"
python oneagent.py budget          # Show token spend
python oneagent.py models          # List available LLM models
python oneagent.py tools           # List registered tools
python oneagent.py status          # System health check
python oneagent.py serve           # Start API server
```

## Architecture

```
CureMD-BA-QA-Automation-suite-/
├── oneagent.py                # UNIFIED CLI ENTRY POINT
├── src/                       # Core runtime
│   ├── llm_runtime/           # LLM router + cache + budget (OneAgent)
│   ├── providers/             # OpenAI, Anthropic, Ollama, Gemini
│   ├── agents/                # Agent loop + base/supervisor/coder/browser/qa/researcher
│   ├── tools/                 # Tool registry + MCP server/client
│   ├── memory/                # Buffer + store + vector + memory_v2
│   ├── skills/                # Skill packs + loader
│   ├── orchestration/         # Orchestrator + events + scheduler
│   ├── meta/                  # Self-extension engine (OneAgent)
│   ├── rag/                   # ChromaDB RAG (OneAgent)
│   ├── profile/               # User profile (OneAgent)
│   ├── auth/                  # Keycloak auth (OneAgent)
│   ├── config/                # SuperAppConfig + OneAgent config
│   ├── db/                    # SQLModel + database
│   ├── browser/               # Playwright browser automation
│   ├── coder/                 # Code generation + test builder
│   ├── guardrails/            # Code safety guardrails
│   └── src_modules/           # 46 merged open-source frameworks
├── modules/                   # Plugin modules (limbs)
│   ├── fhir/                  # FHIR BA/QA tools
│   ├── leap/                  # LEAP analytics
│   ├── research/              # Deep research
│   ├── content/               # Blog/SEO pipeline
│   ├── work_ops/              # Outlook/Teams/SharePoint
│   ├── files/                 # File organization
│   ├── coding/                # Code generation agent
│   ├── web_discovery/         # Web discovery + browser agent
│   └── hello_world/           # Test module
├── api/                       # FastAPI server (OneAgent)
├── backend/                   # Original backend (Keycloak routes)
├── agents/                    # Recipes, connectors, cron jobs
│   ├── recipes.yaml           # Multi-step agent workflows
│   └── connectors.yaml        # External service integrations
├── .goose/session.yaml        # Goose agent platform config
├── .openclaw/config.yaml      # OpenClaw agent config
├── .hermes/config.yaml        # Hermes multi-model routing config
├── tests/                     # Test suite
├── _legacy/                   # Archived projects (not in git)
└── pyproject.toml             # Build config (oneagent v2.0.0)
```

## LLM Router — Token Efficiency

Every LLM call goes through `src/llm_runtime/router.py`:
- **Ranking-based model selection** — edit `src/llm_runtime/ranking.yaml`
- **Task classes** — classify, extract, reason, code, long_context, vision, chat
- **Caching** — identical prompts return cached responses ($0)
- **Budget enforcement** — daily $ cap, per-task limits
- **Multi-provider** — OpenAI, Anthropic, Gemini, Ollama

```yaml
# ranking.yaml
default: gpt-4o-mini
task_classes:
  classify: [gemini-2.0-flash, gpt-4o-mini, claude-3-5-haiku]
  code: [claude-sonnet-4, gpt-4o, deepseek-coder]
  reason: [claude-sonnet-4, gpt-4o, gemini-2.0-flash]
```

## Agent Platform Integrations

### Goose
```bash
# Config: .goose/session.yaml
# Skills, MCP servers, cron jobs all defined there
```

### OpenClaw
```bash
# Config: .openclaw/config.yaml
# Modules, agents, auto-commit settings
```

### Hermes
```bash
# Config: .hermes/config.yaml
# Multi-model routing per task class
```

## Self-Extension (Meta Layer)

The app can write its own modules:
```python
from src.meta.module_author import ModuleAuthor
author = ModuleAuthor()
result = await author.generate_module(
    "Create a FHIR bundle differ that compares two bundles"
)
```

Every self-authored module is:
- Tested automatically in an isolated sandbox
- Registered with provenance metadata
- Reviewable before going live

## Legacy Projects Archived

The following projects have been consolidated into `_legacy/`:
- OmniMediaAgency (blog/content platform)
- Udemy-Autonomous-System (Udemy course scraper)
- autonomous-app-factory (app scaffolding)
- jules-controller (task controller)
- CureMD-Developer-Portal (Python version)
- CureMD-FHIR-API-dotnet (.NET FHIR facade)

## Environment Setup

```bash
cp .env.example .env
# Edit .env with your API keys
```

Required keys (at least one):
- `OPENAI_API_KEY` — GPT-4o, GPT-4o-mini
- `ANTHROPIC_API_KEY` — Claude Sonnet/Opus/Haiku
- `GOOGLE_API_KEY` — Gemini 2.0 Flash
- Optional: `OLLAMA_HOST` for local LLMs

## License

MIT
