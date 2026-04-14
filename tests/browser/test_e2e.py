"""
Playwright E2E Tests
===================
End-to-end browser tests using Playwright.
"""

import pytest
from playwright.sync_api import sync_playwright, expect

# Run with: pytest tests/browser/test_e2e.py --headed

BASE_URL = "https://example.com"

@pytest.fixture(scope="module")
def browser():
    """Launch browser for E2E tests."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        yield browser
        browser.close()

@pytest.fixture
def page(browser):
    """Create new page for each test."""
    context = browser.new_context()
    page = context.new_page()
    yield page
    context.close()

class TestWebsiteNavigation:
    """Test website navigation."""
    
    def test_open_page(self, page):
        """Test opening a page."""
        page.goto(BASE_URL)
        expect(page).to_have_title("Example Domain")
    
    def test_navigation_elements(self, page):
        """Test navigation elements exist."""
        page.goto(BASE_URL)
        
        # Check for heading
        h1 = page.locator("h1")
        if h1.count() > 0:
            expect(h1).to_be_visible()
    
    def test_screenshot_capture(self, page, tmp_path):
        """Test screenshot capture."""
        page.goto(BASE_URL)
        screenshot_path = tmp_path / "test_screenshot.png"
        page.screenshot(path=str(screenshot_path))
        assert screenshot_path.exists()

class TestUserInteractions:
    """Test user interactions."""
    
    def test_click_button(self, page):
        """Test clicking a button."""
        page.goto("https://www.w3schools.com/tags/tryit.asp?filename=tryhtml_button_test")
        page.wait_for_frame("iframeResult")
        
        # Click in the iframe
        iframe = page.frame("iframeResult")
        button = iframe.locator("button")
        if button.count() > 0:
            button.click()
    
    def test_type_in_input(self, page):
        """Test typing in input field."""
        page.goto("https://www.w3schools.com/tags/tryit.asp?filename=tryhtml_input_test")
        page.wait_for_frame("iframeResult")
        
        iframe = page.frame("iframeResult")
        inputs = iframe.locator("input[type='text']")
        if inputs.count() > 0:
            inputs.first.fill("Hello World")

class TestFormSubmission:
    """Test form submissions."""
    
    def test_simple_form(self, page):
        """Test simple form submission."""
        page.goto("https://httpbin.org/forms/post")
        
        # Fill form
        page.fill("input[name='custname']", "Test User")
        
        # Submit
        page.click("button[type='submit']")
        
        # Check response
        expect(page.locator("pre")).to_contain_text("Test User")

class TestDynamicContent:
    """Test dynamic content loading."""
    
    def test_wait_for_element(self, page):
        """Test waiting for element to appear."""
        page.goto("https://the-internet.herokuapp.com/dynamic_loading/1")
        
        # Click start button
        page.click("button")
        
        # Wait for element
        page.wait_for_selector("#finish", timeout=10000)
        expect(page.locator("#finish")).to_be_visible()
    
    def test_async_content(self, page):
        """Test async content loading."""
        page.goto("https://the-internet.herokuapp.com/dynamic_content")
        
        # Check content loads
        content = page.locator(".large-10")
        if content.count() > 0:
            expect(content.first).to_be_visible()
