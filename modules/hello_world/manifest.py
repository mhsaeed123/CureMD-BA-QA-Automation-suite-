"""
Hello World Module Manifest
============================
Demonstrates the module registration pattern.
"""

name = "hello_world"
description = "Simple test module that verifies the OneAgent runtime"
version = "0.1.0"

# Tool functions to register (imported from tools.py)
tools = [
    "modules.hello_world.tools.greet",
    "modules.hello_world.tools.echo",
]

# FastAPI router (optional)
routes = None

# UI page metadata (optional)
ui = {
    "title": "Hello World",
    "icon": "👋",
    "path": "/hello",
}
