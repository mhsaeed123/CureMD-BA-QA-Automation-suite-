"""
Unit Tests for Browser Module
==============================
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

# Skip if playwright not installed
pytest.importorskip("playwright")

from src.browser import BrowserController, VisionEngine

@pytest.fixture
async def browser():
    """Create browser instance (mocked)."""
    with patch('playwright.async_api.async_playwright') as mock_pw:
        # Setup mock
        mock_browser = AsyncMock()
        mock_context = AsyncMock()
        mock_page = AsyncMock()
        
        mock_pw.return_value.start.return_value.__aenter__.return_value = mock_pw.return_value
        mock_browser.new_context.return_value = mock_context
        mock_context.new_page.return_value = mock_page
        
        controller = BrowserController(headless=True)
        controller.browser = mock_browser
        controller.context = mock_context
        controller.page = mock_page
        
        yield controller
        
        # Cleanup
        await controller.close()

class TestBrowserController:
    """Test BrowserController class."""
    
    @pytest.mark.asyncio
    async def test_navigate(self, browser):
        """Test navigation."""
        mock_response = MagicMock()
        mock_response.status = 200
        browser.page.goto = AsyncMock(return_value=mock_response)
        
        result = await browser.navigate("https://example.com")
        
        assert "example.com" in result
        assert browser.current_url == "https://example.com"
        browser.page.goto.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_click_element(self, browser):
        """Test element click."""
        browser.page.wait_for_selector = AsyncMock()
        browser.page.click = AsyncMock()
        
        result = await browser.click_element("#button")
        
        assert "Clicked" in result
        browser.page.click.assert_called_once_with("#button")
    
    @pytest.mark.asyncio
    async def test_loop_detection(self, browser):
        """Test loop detection prevents infinite clicks."""
        browser.page.wait_for_selector = AsyncMock()
        browser.page.click = AsyncMock()
        
        # Click same element multiple times
        for _ in range(browser._max_loop_count + 1):
            result = await browser.click_element("#button")
        
        # After max loops, should be blocked
        assert "BLOCKED" in result
    
    @pytest.mark.asyncio
    async def test_type_text(self, browser):
        """Test typing text."""
        browser.page.wait_for_selector = AsyncMock()
        browser.page.fill = AsyncMock()
        browser.page.type = AsyncMock()
        
        result = await browser.type_text("#input", "hello world")
        
        assert "Typed" in result
        browser.page.fill.assert_called_once()
        browser.page.type.assert_called_once()

class TestVisionEngine:
    """Test VisionEngine class."""
    
    def test_vision_initialization(self):
        engine = VisionEngine(provider="openai")
        assert engine.provider == "openai"
    
    @pytest.mark.asyncio
    async def test_analyze_screenshot(self):
        """Test screenshot analysis."""
        engine = VisionEngine()
        result = await engine.analyze_screenshot("test.png", "Find the login button")
        
        assert "description" in result
        assert "elements_found" in result
    
    @pytest.mark.asyncio
    async def test_compare_screenshots(self):
        """Test screenshot comparison."""
        engine = VisionEngine()
        result = await engine.compare_screenshots("before.png", "after.png")
        
        assert "changed" in result
        assert "differences" in result
