"""
CureMD BA QA Automation Suite - Super App
========================================
Main entry point for the AI Super App.

Combines features from:
- OpenManus, OpenClaw: General AI agents
- MetaGPT: Multi-agent collaboration
- AutoGPT, BabyAGI: Autonomous task execution
- LangGraph: State orchestration
- browser-use, LaVague: Browser automation
- aider, sweep: Code editing
- OpenHands: Coding agent
- Roo-Code: VS Code extension agent
- SuperAGI: Task management
- And many more...

Usage:
    from src.super_app import SuperApp
    
    app = SuperApp()
    result = await app.run("Build a web scraper for news headlines")
"""

import asyncio
import os
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

from .logging import get_logger, SuperAppLogger, LogConfig, LogLevel
from .agents import Agent, AgentConfig, SupervisorAgent, CoderAgent, ResearcherAgent, BrowserAgent
from .orchestration import SuperAppOrchestrator, TaskGraph, EventStream
from .browser import BrowserController, VisionEngine
from .memory import ConversationBuffer, VectorMemory, MemoryStore, CheckpointManager
from .providers import AIProviderFactory
from .tools import MCPServer, mcp_tool

logger = get_logger("super_app")

@dataclass
class SuperAppConfig:
    """Configuration for the Super App."""
    name: str = "CureMD-SuperApp"
    default_provider: str = "openai"
    log_level: str = "INFO"
    log_dir: str = "logs"
    memory_enabled: bool = True
    browser_enabled: bool = True
    max_iterations: int = 100

class SuperApp:
    """
    CureMD BA QA Automation Suite - AI Super App
    
    A monolith multi-module AI agent that combines the best features
    from 14+ open-source AI agent frameworks.
    
    Features:
    - Multi-agent orchestration (Supervisor, Coder, Researcher, Browser)
    - LangGraph-inspired task graphs with channels
    - Event streaming for trajectory replay
    - Browser automation with vision
    - Code editing with SEARCH/REPLACE blocks
    - Multi-tier memory (buffer, vector, persistent)
    - MCP tool integration
    - Multi-provider LLM support (OpenAI, Anthropic, Ollama)
    """
    
    def __init__(self, config: Optional[SuperAppConfig] = None):
        self.config = config or SuperAppConfig()
        
        # Setup logging
        self._setup_logging()
        
        # Initialize components
        self.orchestrator = SuperAppOrchestrator(name=self.config.name)
        self.event_stream = EventStream()
        
        # Memory systems
        if self.config.memory_enabled:
            self.short_term = ConversationBuffer()
            self.vector_memory = VectorMemory()
            self.long_term = MemoryStore()
            self.checkpointer = CheckpointManager()
        
        # Browser
        if self.config.browser_enabled:
            self.browser = BrowserController(headless=True)
            self.vision = VisionEngine()
            self.browser.set_vision_engine(self.vision)
        
        # Tool server
        self.mcp = MCPServer()
        self._register_builtin_tools()
        
        # Agents
        self.agents: Dict[str, Agent] = {}
        self.supervisor: Optional[SupervisorAgent] = None
        
        logger.info(f"SuperApp initialized: {self.config.name}")
    
    def _setup_logging(self) -> None:
        """Setup application logging."""
        log_config = LogConfig(
            level=LogLevel[self.config.log_level.upper()],
            log_dir=self.config.log_dir,
            enable_colors=True,
            enable_file=True
        )
        SuperAppLogger.get_logger("super_app", log_config)
    
    def _register_builtin_tools(self) -> None:
        """Register built-in tools."""
        
        @mcp_tool(name="read_file", description="Read file contents", parameters={
            "type": "object",
            "properties": {"path": {"type": "string"}},
            "required": ["path"]
        })
        def read_file(path: str) -> str:
            """Read a file."""
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        
        @mcp_tool(name="write_file", description="Write content to file", parameters={
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "content": {"type": "string"}
            },
            "required": ["path", "content"]
        })
        def write_file(path: str, content: str) -> str:
            """Write to a file."""
            from pathlib import Path
            Path(path).parent.mkdir(parents=True, exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            return f"Written to {path}"
        
        @mcp_tool(name="search_web", description="Search the web", parameters={
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"]
        })
        def search_web(query: str) -> List[Dict]:
            """Search the web."""
            return [{"title": f"Result for {query}", "url": "https://example.com"}]
        
        # Register all tools
        self.mcp.discover_tools(__import__('src.utils', fromlist=['file_utils']).file_utils)
    
    def create_agent(self, agent_type: str, name: str = None, **kwargs) -> Agent:
        """Create an agent of the specified type."""
        config = AgentConfig(
            name=name or agent_type,
            **kwargs
        )
        
        if agent_type == "coder":
            agent = CoderAgent(config)
        elif agent_type == "researcher":
            agent = ResearcherAgent(config)
        elif agent_type == "browser":
            agent = BrowserAgent(config, self.browser)
        elif agent_type == "supervisor":
            agent = SupervisorAgent(config)
            self.supervisor = agent
        else:
            agent = Agent(config)
        
        self.agents[agent.id] = agent
        logger.info(f"Created {agent_type} agent: {agent.id}")
        
        return agent
    
    async def run(self, task: str, agent_type: str = "supervisor") -> Dict[str, Any]:
        """
        Run a task through the Super App.
        
        Args:
            task: Task description
            agent_type: Type of agent to use ("supervisor", "coder", "researcher", "browser")
            
        Returns:
            Dict with execution results
        """
        logger.info(f"Starting task: {task[:100]}...")
        
        # Create agent if needed
        if agent_type not in self.agents:
            self.create_agent(agent_type)
        
        agent = self.agents.get(agent_type)
        
        # Run agent
        result = await agent.run(task)
        
        # Store in memory
        if self.config.memory_enabled:
            self.short_term.add("user", task)
            self.short_term.add("assistant", str(result))
        
        # Log completion
        await self.event_stream.publish({
            "type": "task_complete",
            "task": task,
            "result": result
        })
        
        return result
    
    async def run_workflow(self, steps: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Run a multi-step workflow.
        
        Steps format:
        [
            {"type": "agent", "agent": "coder", "task": "Create a file"},
            {"type": "agent", "agent": "researcher", "task": "Search for info"},
            {"type": "browser", "action": "navigate", "url": "https://example.com"},
        ]
        """
        results = []
        state = {}
        
        for i, step in enumerate(steps):
            step_type = step.get("type")
            logger.info(f"Workflow step {i+1}/{len(steps)}: {step_type}")
            
            try:
                if step_type == "agent":
                    agent = self.create_agent(step.get("agent", "coder"))
                    result = await agent.run(step.get("task", ""))
                    state[step.get("output_key", f"step_{i}")] = result
                    results.append(result)
                
                elif step_type == "browser":
                    action = step.get("action")
                    if action == "navigate":
                        await self.browser.navigate(step.get("url"))
                        results.append(f"Navigated to {step.get('url')}")
                
                elif step_type == "delay":
                    await asyncio.sleep(step.get("seconds", 1))
                
            except Exception as e:
                logger.exception(f"Step {i+1} failed: {e}")
                results.append({"error": str(e)})
        
        return {"state": state, "results": results}
    
    async def browse(self, url: str, actions: List[Dict] = None) -> Dict[str, Any]:
        """
        Browse a URL with optional actions.
        
        Args:
            url: URL to navigate to
            actions: List of actions to perform
        """
        await self.browser.launch()
        
        try:
            await self.browser.navigate(url)
            results = [f"Navigated to {url}"]
            
            if actions:
                action_results = await self.browser.execute_actions(actions)
                results.extend(action_results)
            
            return {
                "url": self.browser.current_url,
                "actions": results,
                "history": self.browser.get_action_history()
            }
            
        finally:
            await self.browser.close()
    
    def get_event_replay(self) -> List[Dict]:
        """Get event stream for replay."""
        return self.event_stream.replay()
    
    def search_memory(self, query: str, top_k: int = 5) -> List[Dict]:
        """Search memory for relevant information."""
        if not self.config.memory_enabled:
            return []
        
        results = []
        
        # Search vector memory
        vector_results = self.vector_memory.search(query, top_k)
        for doc_id, score in vector_results:
            doc = self.vector_memory.get(doc_id)
            if doc:
                results.append({**doc, "score": score, "source": "vector"})
        
        # Search long-term memory
        for key in self.long_term.keys():
            if query.lower() in str(self.long_term.get(key)).lower():
                results.append({
                    "key": key,
                    "value": self.long_term.get(key),
                    "source": "long_term"
                })
        
        return results

# ============================================================================
# CLI ENTRY POINT
# ============================================================================

async def main():
    """CLI entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="CureMD BA QA Automation Suite - Super App")
    parser.add_argument("task", nargs="?", help="Task to execute")
    parser.add_argument("--agent", default="supervisor", help="Agent type")
    parser.add_argument("--browse", help="URL to browse")
    parser.add_argument("--log-level", default="INFO", help="Log level")
    
    args = parser.parse_args()
    
    # Create app
    config = SuperAppConfig(log_level=args.log_level)
    app = SuperApp(config)
    
    if args.browse:
        # Browse mode
        result = await app.browse(args.browse)
        print(f"\nResult: {result}")
    
    elif args.task:
        # Task mode
        result = await app.run(args.task, agent_type=args.agent)
        print(f"\nResult: {result}")
    
    else:
        print("CureMD BA QA Automation Suite - Super App")
        print("\nUsage:")
        print("  python -m src.super_app \"Build a web scraper\"")
        print("  python -m src.super_app --browse https://example.com")

if __name__ == "__main__":
    asyncio.run(main())
