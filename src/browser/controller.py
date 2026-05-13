"""
Browser Controller - Playwright-based Web Automation
====================================================
Inspired by: browser-use, stagehand, skyvern
Features:
- Playwright + CDP integration
- Multi-action steps (type + click in one turn)
- Loop detection
- Coordinate-based fallback clicking
- Detailed logging
"""

import asyncio
import base64
import json
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from app_logging import get_logger

# Compatibility shim for missing trace/TaskLogger
def trace(*args, **kwargs):
    """No-op trace decorator."""
    def decorator(func):
        return func
    if args and callable(args[0]):
        return args[0]
    return decorator

class TaskLogger:
    """Compatibility shim."""
    pass

logger = get_logger("browser.controller")

class BrowserController:
    """
    Browser automation controller using Playwright.
    Inspired by: browser-use, stagehand, skyvern
    
    Features:
    - Multi-action steps
    - Loop detection
    - Coordinate fallback
    - Vision integration
    - Detailed logging
    """
    
    def __init__(self, headless: bool = False, timeout: int = 30000):
        self.headless = headless
        self.timeout = timeout
        self.browser = None
        self.context = None
        self.page = None
        self.cdp_session = None
        
        # State tracking
        self.current_url = ""
        self.action_history: List[Dict] = []
        self._loop_detector: Dict[str, int] = {}
        self._max_loop_count = 5
        
        # Vision engine
        self._vision = None
        
        logger.info(f"BrowserController initialized (headless={headless})")
    
    # --- Browser Lifecycle ---
    
    @trace()
    async def launch(self) -> None:
        """Launch browser."""
        try:
            from playwright.async_api import async_playwright
            
            playwright = await async_playwright().start()
            self.browser = await playwright.chromium.launch(headless=self.headless)
            self.context = await self.browser.new_context(
                viewport={"width": 1920, "height": 1080}
            )
            self.page = await self.context.new_page()
            
            # Set default timeout
            self.page.set_default_timeout(self.timeout)
            
            logger.info("Browser launched successfully")
        except ImportError:
            logger.error("Playwright not installed. Run: pip install playwright && playwright install")
            raise
    
    @trace()
    async def close(self) -> None:
        """Close browser."""
        if self.page:
            await self.page.close()
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        logger.info("Browser closed")
    
    # --- Navigation ---
    
    @trace()
    async def navigate(self, url: str) -> str:
        """Navigate to URL."""
        self._check_browser()
        
        logger.info(f"Navigating to: {url}")
        response = await self.page.goto(url, wait_until="domcontentloaded")
        
        self.current_url = url
        self.action_history.append({
            "action": "navigate",
            "url": url,
            "status": response.status if response else None,
            "timestamp": time.time()
        })
        
        # Wait for page to stabilize
        await self._wait_for_load()
        
        return f"Navigated to {url} (status: {response.status if response else 'N/A'})"
    
    @trace()
    async def back(self) -> str:
        """Navigate back."""
        self._check_browser()
        await self.page.go_back()
        await self._wait_for_load()
        return "Navigated back"
    
    @trace()
    async def forward(self) -> str:
        """Navigate forward."""
        self._check_browser()
        await self.page.go_forward()
        await self._wait_for_load()
        return "Navigated forward"
    
    @trace()
    async def refresh(self) -> str:
        """Refresh page."""
        self._check_browser()
        await self.page.reload()
        await self._wait_for_load()
        return "Page refreshed"
    
    # --- Element Interaction ---
    
    @trace()
    async def click_element(self, selector: str, 
                           wait_for_selector: bool = True) -> str:
        """Click element by selector with loop detection."""
        self._check_browser()
        
        # Loop detection
        loop_key = f"click:{selector}"
        self._loop_detector[loop_key] = self._loop_detector.get(loop_key, 0) + 1
        
        if self._loop_detector[loop_key] > self._max_loop_count:
            logger.warning(f"Loop detected for selector: {selector}")
            return f"BLOCKED: Loop detected for {selector}"
        
        try:
            if wait_for_selector:
                await self.page.wait_for_selector(selector, timeout=5000)
            
            await self.page.click(selector)
            
            self.action_history.append({
                "action": "click",
                "selector": selector,
                "timestamp": time.time()
            })
            
            logger.debug(f"Clicked element: {selector}")
            return f"Clicked element: {selector}"
            
        except Exception as e:
            logger.error(f"Failed to click {selector}: {e}")
            raise
    
    @trace()
    async def click_coords(self, x: int, y: int, button: str = "left") -> str:
        """Click at coordinates (fallback for complex DOMs)."""
        self._check_browser()
        
        await self.page.mouse.click(x, y, button=button)
        
        self.action_history.append({
            "action": "click_coords",
            "x": x,
            "y": y,
            "timestamp": time.time()
        })
        
        logger.debug(f"Clicked at coordinates: ({x}, {y})")
        return f"Clicked at ({x}, {y})"
    
    @trace()
    async def type_text(self, selector: str, text: str,
                        delay: int = 0, clear: bool = True) -> str:
        """Type text into element."""
        self._check_browser()
        
        try:
            await self.page.wait_for_selector(selector, timeout=5000)
            
            if clear:
                await self.page.fill(selector, "")
            
            await self.page.type(selector, text, delay=delay)
            
            self.action_history.append({
                "action": "type",
                "selector": selector,
                "text_length": len(text),
                "timestamp": time.time()
            })
            
            logger.debug(f"Typed {len(text)} chars into: {selector}")
            return f"Typed into {selector}"
            
        except Exception as e:
            logger.error(f"Failed to type into {selector}: {e}")
            raise
    
    @trace()
    async def select_dropdown(self, selector: str, value: str) -> str:
        """Select option from dropdown."""
        self._check_browser()
        
        await self.page.select_option(selector, value)
        
        self.action_history.append({
            "action": "select",
            "selector": selector,
            "value": value,
            "timestamp": time.time()
        })
        
        return f"Selected {value} in {selector}"
    
    @trace()
    async def check_element(self, selector: str, checked: bool = True) -> str:
        """Check/uncheck checkbox or radio."""
        self._check_browser()
        
        current_state = await self.page.is_checked(selector)
        
        if (checked and not current_state) or (not checked and current_state):
            await self.page.check(selector, force=True)
        
        return f"{'Checked' if checked else 'Unchecked'} {selector}"
    
    # --- Content Retrieval ---
    
    @trace()
    async def get_text(self, selector: str) -> str:
        """Get text content of element."""
        self._check_browser()
        
        element = await self.page.wait_for_selector(selector, timeout=5000)
        return await element.inner_text()
    
    @trace()
    async def get_attribute(self, selector: str, attribute: str) -> str:
        """Get element attribute."""
        self._check_browser()
        
        element = await self.page.wait_for_selector(selector, timeout=5000)
        return await element.get_attribute(attribute)
    
    @trace()
    async def get_page_content(self) -> str:
        """Get full page content."""
        self._check_browser()
        return await self.page.content()
    
    @trace()
    async def get_dom_tree(self, max_depth: int = 5) -> str:
        """Get simplified DOM tree."""
        self._check_browser()
        
        dom_script = """
        () => {
            function simplify(node, depth = 0) {
                if (depth > 5) return null;
                
                const simplified = {
                    tag: node.nodeName.toLowerCase(),
                    id: node.id || null,
                    class: node.className || null,
                    text: node.childNodes.length === 1 && node.childNodes[0].nodeType === 3 
                        ? node.childNodes[0].textContent.trim().substring(0, 50) 
                        : null,
                };
                
                const children = [];
                for (const child of node.childNodes) {
                    if (child.nodeType === 1) {
                        const childSimplified = simplify(child, depth + 1);
                        if (childSimplified) children.push(childSimplified);
                    }
                }
                if (children.length) simplified.children = children;
                
                return simplified;
            }
            return JSON.stringify(simplify(document.body));
        }
        """
        
        result = await self.page.evaluate(dom_script)
        return result
    
    # --- Screenshot ---
    
    @trace()
    async def screenshot(self, name: str = "screenshot.png",
                        full_page: bool = False) -> str:
        """Take screenshot."""
        self._check_browser()
        
        path = Path(name)
        await self.page.screenshot(path=path, full_page=full_page)
        
        self.action_history.append({
            "action": "screenshot",
            "path": str(path),
            "timestamp": time.time()
        })
        
        logger.debug(f"Screenshot saved: {path}")
        return str(path)
    
    @trace()
    async def screenshot_base64(self, full_page: bool = False) -> str:
        """Get screenshot as base64."""
        self._check_browser()
        
        bytes_data = await self.page.screenshot(full_page=full_page)
        return base64.b64encode(bytes_data).decode('utf-8')
    
    # --- JavaScript Execution ---
    
    @trace()
    async def execute_script(self, script: str) -> Any:
        """Execute JavaScript."""
        self._check_browser()
        return await self.page.evaluate(script)
    
    # --- Waiting ---
    
    @trace()
    async def wait_for_selector(self, selector: str, 
                               timeout: int = 30000,
                               state: str = "visible") -> str:
        """Wait for element."""
        self._check_browser()
        
        await self.page.wait_for_selector(
            selector, 
            timeout=timeout,
            state=state
        )
        
        return f"Element {selector} is {state}"
    
    @trace()
    async def wait_for_navigation(self, timeout: int = 30000) -> str:
        """Wait for page navigation."""
        self._check_browser()
        
        await self.page.wait_for_load_state("networkidle", timeout=timeout)
        return "Navigation complete"
    
    @trace()
    async def _wait_for_load(self, delay: float = 0.5) -> None:
        """Wait for page to stabilize."""
        await asyncio.sleep(delay)
    
    # --- CDP Access ---
    
    async def get_cdp_session(self):
        """Get Chrome DevTools Protocol session."""
        if not self.cdp_session:
            self.cdp_session = await self.context.new_cdp_session(self.page)
        return self.cdp_session
    
    # --- Multi-Action Steps ---
    
    @trace()
    async def execute_actions(self, actions: List[Dict[str, Any]]) -> List[str]:
        """
        Execute multiple actions in one turn.
        Inspired by browser-use multi-action steps.
        
        Actions format:
        [
            {"type": "click", "selector": "#button"},
            {"type": "type", "selector": "#input", "text": "hello"},
            {"type": "click", "x": 100, "y": 200},  # coordinate fallback
        ]
        """
        results = []
        
        for action in actions:
            action_type = action.get("type")
            
            try:
                if action_type == "click":
                    if "selector" in action:
                        result = await self.click_element(action["selector"])
                    elif "x" in action and "y" in action:
                        result = await self.click_coords(action["x"], action["y"])
                    else:
                        result = "No selector or coordinates provided"
                
                elif action_type == "type":
                    result = await self.type_text(
                        action["selector"],
                        action["text"],
                        delay=action.get("delay", 0)
                    )
                
                elif action_type == "navigate":
                    result = await self.navigate(action["url"])
                
                elif action_type == "screenshot":
                    result = await self.screenshot(action.get("name", "screenshot.png"))
                
                elif action_type == "wait":
                    await asyncio.sleep(action.get("seconds", 1))
                    result = "Waited"
                
                else:
                    result = f"Unknown action type: {action_type}"
                
                results.append(result)
                
            except Exception as e:
                logger.error(f"Action {action_type} failed: {e}")
                results.append(f"Error: {e}")
        
        return results
    
    # --- Helpers ---
    
    def _check_browser(self) -> None:
        """Check if browser is initialized."""
        if not self.page:
            raise RuntimeError("Browser not launched. Call launch() first.")
    
    def get_action_history(self) -> List[Dict]:
        """Get action history."""
        return self.action_history.copy()
    
    def clear_loop_detector(self) -> None:
        """Clear loop detection cache."""
        self._loop_detector.clear()
    
    def set_vision_engine(self, vision) -> None:
        """Set vision engine for AI-based element detection."""
        self._vision = vision
    
    async def find_element_vision(self, description: str) -> Optional[Tuple[int, int, int, int]]:
        """Find element using vision AI (requires vision engine)."""
        if not self._vision:
            logger.warning("Vision engine not set")
            return None
        
        await self.screenshot("vision_temp.png")
        return await self._vision.find_element("vision_temp.png", description)
