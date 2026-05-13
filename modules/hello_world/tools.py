"""
Hello World Tools
=================
Simple tools to verify the OneAgent runtime works end-to-end.
"""

from core.agents.tools import tool


@tool(name="greet", description="Generate a greeting using the LLM", module="hello_world")
async def greet(name: str = "World") -> dict:
    """Generate a greeting via the LLM router."""
    from core.llm.router import get_router
    router = get_router()
    response = await router.ask(
        f"Say hello to {name} in one short sentence.",
        task_class="chat",
    )
    return {"greeting": response.content, "model": response.model, "cached": response.cached}


@tool(name="echo", description="Echo back the input with metadata", module="hello_world")
async def echo(message: str) -> dict:
    """Simple echo tool for testing."""
    return {"echo": message, "length": len(message)}


@tool(name="classify_resource", description="Classify if text is a FHIR resource", module="hello_world")
async def classify_resource(text: str) -> dict:
    """Use the cheapest model to classify if text describes a FHIR resource."""
    from core.llm.router import get_router
    router = get_router()
    response = await router.ask(
        f"Is the following text a FHIR resource? Answer YES or NO and name the resource type if YES.\n\n{text}",
        task_class="classify",
        max_tokens=100,
    )
    return {"classification": response.content, "model": response.model}
