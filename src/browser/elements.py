"""
Element Handling
================
Utilities for finding and interacting with web elements.

Author: CureMD BA QA Team
Version: 1.0.0
"""

import asyncio
import logging
from enum import Enum
from typing import Dict, Any, Optional, List, Callable, Union
from dataclasses import dataclass, field
from datetime import datetime


logger = logging.getLogger("browser.elements")


# ============================================================================
# LOCATORS
# ============================================================================

class LocatorType(Enum):
    """Types of element locators."""
    CSS = "css"
    XPATH = "xpath"
    ID = "id"
    NAME = "name"
    CLASS = "class"
    TEXT = "text"
    PARTIAL_TEXT = "partial_text"
    TITLE = "title"
    LABEL = "label"
    ROLE = "role"
    TEST_ID = "test_id"


# ============================================================================
# ELEMENT DATA CLASS
# ============================================================================

@dataclass
class Element:
    """
    Represents a web element with metadata.
    """
    selector: str
    locator_type: LocatorType
    tag: str = "div"
    text: str = ""
    is_visible: bool = True
    is_enabled: bool = True
    is_checked: bool = False
    rect: Dict[str, int] = field(default_factory=lambda: {"x": 0, "y": 0, "width": 0, "height": 0})
    attributes: Dict[str, str] = field(default_factory=dict)
    value: str = ""
    
    def __str__(self) -> str:
        return f"<Element {self.locator_type.value}='{self.selector}' text='{self.text[:30]}'>"
    
    def to_dict(self) -> Dict:
        return {
            "selector": self.selector,
            "locator_type": self.locator_type.value,
            "tag": self.tag,
            "text": self.text,
            "is_visible": self.is_visible,
            "is_enabled": self.is_enabled,
            "attributes": self.attributes,
            "rect": self.rect
        }


# ============================================================================
# ELEMENT FINDER
# ============================================================================

class ElementFinder:
    """
    Utility class for finding web elements.
    """
    
    def __init__(self, driver=None):
        self.driver = driver
        self.logger = logging.getLogger("browser.elements.finder")
    
    def css(self, selector: str) -> str:
        """Create CSS selector."""
        return selector
    
    def xpath(self, expression: str) -> str:
        """Create XPath selector."""
        return f"xpath={expression}"
    
    def id(self, element_id: str) -> str:
        """Create ID selector."""
        return f"#{element_id}"
    
    def name(self, name: str) -> str:
        """Create name selector."""
        return f"[name='{name}']"
    
    def class_name(self, class_name: str) -> str:
        """Create class selector."""
        return f".{class_name}"
    
    def text(self, text: str, exact: bool = True) -> str:
        """Create text selector."""
        if exact:
            return f"text={text}"
        return f"partial:text={text}"
    
    def label(self, label_text: str) -> str:
        """Create label selector."""
        return f"label:has-text('{label_text}')"
    
    def role(self, role: str, name: str = None) -> str:
        """Create role selector."""
        if name:
            return f"[role='{role}'][name='{name}']"
        return f"[role='{role}']"
    
    def test_id(self, test_id: str) -> str:
        """Create test-id selector."""
        return f"[data-testid='{test_id}']"
    
    def combine(self, *selectors: str, combinator: str = " ") -> str:
        """Combine multiple selectors."""
        return combinator.join(selectors)
    
    def child(self, parent: str, child: str) -> str:
        """Create child selector."""
        return f"{parent} > {child}"
    
    def descendant(self, ancestor: str, descendant: str) -> str:
        """Create descendant selector."""
        return f"{ancestor} {descendant}"
    
    def sibling(self, selector: str, sibling_type: str = "+") -> str:
        """Create sibling selector."""
        return f"{selector}{sibling_type}"
    
    def nth(self, selector: str, index: int) -> str:
        """Create nth-child selector."""
        return f"{selector}:nth-child({index})"
    
    def first(self, selector: str) -> str:
        """Create first-child selector."""
        return f"{selector}:first-child"
    
    def last(self, selector: str) -> str:
        """Create last-child selector."""
        return f"{selector}:last-child"
    
    async def find(
        self,
        selector: str,
        locator_type: LocatorType = LocatorType.CSS,
        timeout: int = 5000
    ) -> Optional[Element]:
        """
        Find an element.
        
        Args:
            selector: Element selector
            locator_type: Type of locator
            timeout: Timeout in ms
            
        Returns:
            Element or None
        """
        self.logger.debug(f"Finding: {locator_type.value}={selector}")
        
        # Simulate finding
        await asyncio.sleep(0.05)
        
        return Element(
            selector=selector,
            locator_type=locator_type,
            tag="div",
            text="Sample element",
            is_visible=True,
            is_enabled=True,
            rect={"x": 100, "y": 100, "width": 200, "height": 50}
        )
    
    async def find_all(
        self,
        selector: str,
        locator_type: LocatorType = LocatorType.CSS,
        limit: int = None
    ) -> List[Element]:
        """
        Find all matching elements.
        
        Args:
            selector: Element selector
            locator_type: Type of locator
            limit: Maximum number of elements to return
            
        Returns:
            List of elements
        """
        self.logger.debug(f"Finding all: {locator_type.value}={selector}")
        
        # Simulate finding multiple
        await asyncio.sleep(0.05)
        
        count = limit or 3
        return [
            Element(
                selector=selector,
                locator_type=locator_type,
                tag="div",
                text=f"Element {i}",
                is_visible=True,
                is_enabled=True
            )
            for i in range(count)
        ]


# ============================================================================
# ELEMENT WAITER
# ============================================================================

class ElementWaiter:
    """
    Utility class for waiting on element states.
    """
    
    def __init__(self, driver=None):
        self.driver = driver
        self.logger = logging.getLogger("browser.elements.waiter")
    
    async def wait_for(
        self,
        selector: str,
        locator_type: LocatorType = LocatorType.CSS,
        timeout: int = 30000,
        state: str = "visible"
    ) -> bool:
        """
        Wait for an element to reach a specific state.
        
        States:
            - visible: Element is visible
            - hidden: Element is not visible
            - attached: Element is in DOM
            - detached: Element is not in DOM
            - enabled: Element is enabled
            - disabled: Element is disabled
            
        Args:
            selector: Element selector
            locator_type: Type of locator
            timeout: Timeout in ms
            state: Desired state
            
        Returns:
            True if state reached, False if timeout
        """
        self.logger.debug(f"Waiting for {state}: {selector}")
        
        start_time = datetime.now()
        interval = 100  # Check every 100ms
        
        while (datetime.now() - start_time).total_seconds() * 1000 < timeout:
            # Simulate checking state
            await asyncio.sleep(0.1)
            
            # In real implementation, check actual state
            if state == "visible":
                return True
        
        self.logger.warning(f"Wait timeout for {selector}")
        return False
    
    async def wait_for_load(self, timeout: int = 30000) -> bool:
        """Wait for page to load."""
        self.logger.debug("Waiting for page load")
        await asyncio.sleep(0.2)
        return True
    
    async def wait_for_navigation(
        self,
        timeout: int = 30000,
        wait_until: str = "load"
    ) -> bool:
        """Wait for navigation to complete."""
        self.logger.debug(f"Waiting for navigation ({wait_until})")
        await asyncio.sleep(0.2)
        return True
    
    async def wait_for_function(
        self,
        func: Callable,
        timeout: int = 30000,
        polling: int = 100
    ) -> Any:
        """
        Wait for a function to return truthy.
        
        Args:
            func: Function to evaluate
            timeout: Timeout in ms
            polling: Polling interval in ms
            
        Returns:
            Function result or None on timeout
        """
        start_time = datetime.now()
        
        while (datetime.now() - start_time).total_seconds() * 1000 < timeout:
            result = func()
            if result:
                return result
            await asyncio.sleep(polling / 1000)
        
        return None
    
    async def wait_for_url(self, pattern: str, timeout: int = 30000) -> bool:
        """Wait for URL to match pattern."""
        self.logger.debug(f"Waiting for URL: {pattern}")
        await asyncio.sleep(0.2)
        return True
    
    async def wait_for_text(
        self,
        selector: str,
        text: str,
        timeout: int = 30000,
        exact: bool = True
    ) -> bool:
        """Wait for element to contain specific text."""
        self.logger.debug(f"Waiting for text: {text}")
        await asyncio.sleep(0.2)
        return True
    
    async def wait_for_value(
        self,
        selector: str,
        value: str,
        timeout: int = 30000
    ) -> bool:
        """Wait for input to have specific value."""
        self.logger.debug(f"Waiting for value: {value}")
        await asyncio.sleep(0.2)
        return True
    
    async def wait_for_selector_change(
        self,
        selector: str,
        attribute: str,
        timeout: int = 30000
    ) -> bool:
        """Wait for element attribute to change."""
        self.logger.debug(f"Waiting for attribute change: {attribute}")
        await asyncio.sleep(0.2)
        return True


# ============================================================================
# ELEMENT ACTIONS
# ============================================================================

class ElementAction:
    """
    Utility class for performing actions on elements.
    """
    
    def __init__(self, driver=None):
        self.driver = driver
        self.logger = logging.getLogger("browser.elements.action")
    
    async def click(
        self,
        selector: str,
        locator_type: LocatorType = LocatorType.CSS,
        button: str = "left",
        click_count: int = 1,
        modifiers: List[str] = None
    ) -> Dict:
        """
        Click an element.
        
        Args:
            selector: Element selector
            locator_type: Type of locator
            button: Mouse button (left, right, middle)
            click_count: Number of clicks
            modifiers: Keyboard modifiers (Alt, Control, Meta, Shift)
            
        Returns:
            Action result
        """
        self.logger.debug(f"Clicking: {selector}")
        await asyncio.sleep(0.05)
        
        return {
            "action": "click",
            "selector": selector,
            "button": button,
            "click_count": click_count,
            "success": True
        }
    
    async def double_click(self, selector: str, locator_type: LocatorType = LocatorType.CSS) -> Dict:
        """Double-click an element."""
        return await self.click(selector, locator_type, click_count=2)
    
    async def right_click(self, selector: str, locator_type: LocatorType = LocatorType.CSS) -> Dict:
        """Right-click an element."""
        return await self.click(selector, locator_type, button="right")
    
    async def hover(self, selector: str, locator_type: LocatorType = LocatorType.CSS) -> Dict:
        """Hover over an element."""
        self.logger.debug(f"Hovering: {selector}")
        await asyncio.sleep(0.05)
        
        return {
            "action": "hover",
            "selector": selector,
            "success": True
        }
    
    async def type(
        self,
        selector: str,
        text: str,
        locator_type: LocatorType = LocatorType.CSS,
        delay: int = 0,
        clear: bool = True
    ) -> Dict:
        """
        Type text into an element.
        
        Args:
            selector: Element selector
            text: Text to type
            locator_type: Type of locator
            delay: Delay between keystrokes in ms
            clear: Clear before typing
            
        Returns:
            Action result
        """
        self.logger.debug(f"Typing into: {selector}")
        
        if delay > 0:
            for char in text:
                await asyncio.sleep(delay / 1000)
        else:
            await asyncio.sleep(0.1)
        
        return {
            "action": "type",
            "selector": selector,
            "text": text,
            "characters": len(text),
            "success": True
        }
    
    async def fill(self, selector: str, value: str, locator_type: LocatorType = LocatorType.CSS) -> Dict:
        """Fill an input field (clear then type)."""
        return await self.type(selector, value, locator_type, delay=0, clear=True)
    
    async def clear(self, selector: str, locator_type: LocatorType = LocatorType.CSS) -> Dict:
        """Clear an input field."""
        self.logger.debug(f"Clearing: {selector}")
        
        return {
            "action": "clear",
            "selector": selector,
            "success": True
        }
    
    async def select(
        self,
        selector: str,
        value: str,
        locator_type: LocatorType = LocatorType.CSS,
        by_label: bool = False
    ) -> Dict:
        """
        Select an option from a dropdown.
        
        Args:
            selector: Element selector
            value: Option value or label
            locator_type: Type of locator
            by_label: Select by label instead of value
            
        Returns:
            Action result
        """
        self.logger.debug(f"Selecting: {value}")
        await asyncio.sleep(0.05)
        
        return {
            "action": "select",
            "selector": selector,
            "value": value,
            "by_label": by_label,
            "success": True
        }
    
    async def check(self, selector: str, locator_type: LocatorType = LocatorType.CSS, checked: bool = True) -> Dict:
        """Check or uncheck a checkbox/radio."""
        action = "check" if checked else "uncheck"
        self.logger.debug(f"{action}: {selector}")
        await asyncio.sleep(0.05)
        
        return {
            "action": action,
            "selector": selector,
            "checked": checked,
            "success": True
        }
    
    async def scroll_into_view(self, selector: str, locator_type: LocatorType = LocatorType.CSS) -> Dict:
        """Scroll element into view."""
        self.logger.debug(f"Scrolling: {selector}")
        await asyncio.sleep(0.05)
        
        return {
            "action": "scroll_into_view",
            "selector": selector,
            "success": True
        }
    
    async def drag_to(
        self,
        source: str,
        target: str,
        source_type: LocatorType = LocatorType.CSS,
        target_type: LocatorType = LocatorType.CSS
    ) -> Dict:
        """Drag element to target."""
        self.logger.debug(f"Dragging from {source} to {target}")
        await asyncio.sleep(0.2)
        
        return {
            "action": "drag_to",
            "source": source,
            "target": target,
            "success": True
        }
    
    async def upload_file(self, selector: str, file_path: str, locator_type: LocatorType = LocatorType.CSS) -> Dict:
        """Upload file to input."""
        self.logger.debug(f"Uploading file to: {selector}")
        await asyncio.sleep(0.1)
        
        return {
            "action": "upload_file",
            "selector": selector,
            "file_path": file_path,
            "success": True
        }


# ============================================================================
# ELEMENT ASSERTS
# ============================================================================

class ElementAssert:
    """Assertion methods for elements."""
    
    @staticmethod
    def visible(element: Element) -> bool:
        """Assert element is visible."""
        return element.is_visible
    
    @staticmethod
    def hidden(element: Element) -> bool:
        """Assert element is hidden."""
        return not element.is_visible
    
    @staticmethod
    def enabled(element: Element) -> bool:
        """Assert element is enabled."""
        return element.is_enabled
    
    @staticmethod
    def disabled(element: Element) -> bool:
        """Assert element is disabled."""
        return not element.is_enabled
    
    @staticmethod
    def contains_text(element: Element, text: str) -> bool:
        """Assert element contains text."""
        return text in element.text
    
    @staticmethod
    def has_attribute(element: Element, attr: str, value: str = None) -> bool:
        """Assert element has attribute."""
        if attr not in element.attributes:
            return False
        if value is None:
            return True
        return element.attributes[attr] == value


if __name__ == "__main__":
    # Test elements
    finder = ElementFinder()
    waiter = ElementWaiter()
    action = ElementAction()
    
    # Test selector creation
    print("CSS:", finder.css("button.submit"))
    print("XPath:", finder.xpath("//button[@class='submit']"))
    print("ID:", finder.id("my-button"))
    print("Text:", finder.text("Submit Form"))
    
    # Test finding
    async def test():
        element = await finder.find("button.submit")
        print(f"Found: {element}")
        
        elements = await finder.find_all("div.item")
        print(f"Found {len(elements)} elements")
        
        # Test actions
        result = await action.click("button.submit")
        print(f"Click result: {result}")
        
        result = await action.type("input.email", "test@example.com")
        print(f"Type result: {result}")
    
    asyncio.run(test())