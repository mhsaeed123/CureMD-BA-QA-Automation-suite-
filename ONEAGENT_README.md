# OneAgent

Self-building, self-extending agentic platform. One runtime, zero forks.

## Quick Start

```bash
# Install
pip install -e ".[dev]"

# Configure
cp .env.example .env
# Edit .env with your API keys

# Run CLI
python -m oneagent.cli ask --task classify "is this an FHIR Patient resource?"
python -m oneagent.cli run-agent research "summarize ONC HTI-2 final rule"
python -m oneagent.cli budget

# Run API server
python -m oneagent.cli serve

# Run tests
pytest tests/ -v
```

## Architecture

```
OneAgent/
├── core/          # Shared runtime
│   ├── llm/       # Single LLM gateway (router + cache + budget)
│   ├── agents/    # Generic agent loop
│   ├── skills/    # Skill packs
│   ├── mcp/       # MCP server/client
│   ├── rag/       # ChromaDB wrapper
│   ├── data/      # SQLModel + migrations
│   ├── scheduler/ # Celery + Redis
│   ├── auth/      # Keycloak
│   ├── meta/      # Self-extension engine
│   └── profile/   # User profile
├── modules/       # Plugins (FHIR, LEAP, research, etc.)
├── api/           # FastAPI app
├── plugins/       # Drop-in folder
└── tests/         # Test suite
```

## Modules

- `fhir/` — FHIR inconsistency, explorer, cost, mapping, portal
- `leap/` — LEAP scaling, RWT, analytics, support, UDS
- `research/` — Deep researcher + SaaS opportunity finder
- `content/` — Blog/SEO/social pipeline
- `work_ops/` — Outlook, Teams, SharePoint, datasync
- `files/` — File organizer, analysis, storage guardian
- `coding/` — CLI controller + repo scaffolder

## License

MIT
