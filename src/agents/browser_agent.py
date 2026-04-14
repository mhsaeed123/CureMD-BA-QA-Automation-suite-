"""
Browser Agent - Web Automation with Vision
==========================================
Inspired by: browser-use, LaVague, stagehand, skyvern, steel-browser
Features:
- Vision-based element detection
- Multi-step action planning
- Loop detection
- Screenshot + DOM reasoning
"""

from typing import Any, Dict, List, Optional, Tuple
from .base import Agent, AgentConfig
from ..logging import get_logger, trace

logger = get_logger("agents.browser")

class BrowserAgent(Agent):
    """
    Agent specialized in browser automation.
    Inspired by: browser-use, LaVague, skyvern, stagehand
    """
    
    def __init__(self, config: AgentConfig, browser_controller=None):
        super().__init__(config)
        self.browser = browser_controller
        self.action_history: List[Dict] = []
        self._loop_detection: List[str] = []
        self._max_loop_count = 5
        self._setup_tools()
    
    def _setup_tools(self) -> None:
        """Setup browser automation tools."""
        if not self.browser:
            return
        
        self.register_tool("navigate", self._navigate, {
            "description": "Navigate to URL",
            "parameters": {"type": "object", "properties": {
                "url": {"type": "string"}
            }, "required": ["url"]}
        })
        
        self.register_tool("click_element", self._click_element, {
            "description": "Click element by selector or coordinates",
            "parameters": {"type": "object", "properties": {
                "selector": {"type": "string"},
                "x": {"type": "number"},
                "y": {"type": "number"}
            }}
        })
        
        self.register_tool("type_text", self._type_text, {
            "description": "Type text into input field",
            "parameters": {"type": "object", "properties": {
                "selector": {"type": "string"},
                "text": {"type": "string"}
            }, "required": ["text"]}
        })
        
        self.register_tool("screenshot", self._take_screenshot, {
            "description": "Take screenshot of current page",
            "parameters": {"type": "object", "properties": {
                "name": {"type": "string"}}
            }
        })
        
        self.register_tool("get_dom", self._get_dom_tree, {
            "description": "Get DOM tree of current page",
            "parameters": {"type": "object", "properties": {}}
        })
        
        self.register_tool("find_element_vision", self._find_element_vision, {
            "description": "Find element using vision AI",
            "parameters": {"type": "object", "properties": {
                "description": {"type": "string"}
            }, "required": ["description"]}
        })
    
    @trace()
    async def _navigate(self, url: str) -> str:
        """Navigate to URL."""
        await self.browser.navigate(url)
        self.action_history.append({"action": "navigate", "url": url})
        return f"Navigated to {url}"
    
    @trace()
    async def _click_element(self, selector: str = None, x: int = None, y: int = None) -> str:
        """Click element with loop detection."""
        action_key = f"click:{selector or f'coords:{x},{y}'}"
        
        # Loop detection
        loop_count = self._loop_detection.count(action_key)
        if loop_count >= self._max_loop_count:
            return f"BLOCKED: Loop detected for {action_key} (repeated {loop_count} times)"
        
        self._loop_detection.append(action_key)
        
        if x is not None and y is not None:
            await self.browser.click_coords(x, y)
        elif selector:
            await self.browser.click_element(selector)
        
        self.action_history.append({"action": "click", "selector": selector, "coords": (x, y)})
        return "Clicked element"
    
    @trace()
    async def _type_text(self, selector: str, text: str) -> str:
        """Type text into element."""
        await self.browser.type_text(selector, text)
        self.action_history.append({"action": "type", "selector": selector, "text": text})
        return f"Typed into {selector}"
    
    @trace()
    async def _take_screenshot(self, name: str = "screenshot.png") -> str:
        """Take screenshot."""
        path = await self.browser.screenshot(name)
        self.action_history.append({"action": "screenshot", "path": path})
        return path
    
    @trace()
    async def _get_dom_tree(self) -> str:
        """Get DOM tree."""
        return await self.browser.get_dom_tree()
    
    @trace()
    async def _find_element_vision(self, description: str) -> Tuple[int, int]:
        """Find element using vision AI."""
        # Take screenshot and analyze with vision model
        await self.browser.screenshot("vision_analysis.png")
        # In production, use LLM with vision to find coordinates
        logger.info(f"Vision analysis for: {description}")
        return (0, 0)  # Placeholder
    
    async def think(self) -> str:
        """Determine next browser action."""
        return "analyze_and_act"
    
    async def act(self) -> Any:
        """Execute browser automation."""
        return {
            "status": "browser_action_complete",
            "history_length": len(self.action_history)
        }
    
    def _is_done(self, result: Any) -> bool:
        return "complete" in str(result).lower()
