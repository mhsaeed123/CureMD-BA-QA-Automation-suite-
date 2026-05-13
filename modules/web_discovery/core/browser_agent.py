"""
Browser Agent - Uses browser-use for DOM exploration
"""

import asyncio
import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field


@dataclass
class ElementInfo:
    """Information about a single DOM element"""
    tag: str = ""
    element_id: str = ""
    class_name: str = ""
    name_attr: str = ""
    type_attr: str = ""
    role: str = ""
    aria_label: str = ""
    text_content: str = ""
    placeholder: str = ""
    href: str = ""
    src: str = ""
    action: str = ""
    xpath: str = ""
    css_selector: str = ""
    attributes: Dict[str, str] = field(default_factory=dict)
    bounding_box: Dict[str, Any] = field(default_factory=dict)
    is_visible: bool = True
    is_interactive: bool = False
    parent_tag: str = ""
    children_count: int = 0
    inner_html: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tag": self.tag,
            "element_id": self.element_id,
            "class_name": self.class_name,
            "name_attr": self.name_attr,
            "type_attr": self.type_attr,
            "role": self.role,
            "aria_label": self.aria_label,
            "text_content": self.text_content,
            "placeholder": self.placeholder,
            "href": self.href,
            "src": self.src,
            "action": self.action,
            "xpath": self.xpath,
            "css_selector": self.css_selector,
            "attributes": self.attributes,
            "bounding_box": self.bounding_box,
            "is_visible": self.is_visible,
            "is_interactive": self.is_interactive,
            "parent_tag": self.parent_tag,
            "children_count": self.children_count,
            "inner_html": self.inner_html[:500] if self.inner_html else None
        }


class BrowserDiscoveryAgent:
    """
    Browser agent for discovering and extracting DOM elements from web pages.
    Uses browser-use for navigation and Playwright for deep DOM extraction.
    """

    def __init__(
        self,
        headless: bool = True,
        viewport_size: tuple = (1920, 1080),
        user_agent: Optional[str] = None
    ):
        self.headless = headless
        self.viewport_size = viewport_size
        self.user_agent = user_agent or (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
        self.browser = None
        self.page = None
        self.context = None
        self.playwright = None

    async def start(self):
        """Initialize the browser"""
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            import subprocess
            print("Installing playwright...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright"])
            subprocess.check_call([sys.executable, "-m", "playwright", "install", "--with-deps"])
            from playwright.async_api import async_playwright

        self.playwright = await async_playwright().start()

        # Launch browser
        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security'
            ]
        )

        # Create context
        self.context = await self.browser.new_context(
            viewport={'width': self.viewport_size[0], 'height': self.viewport_size[1]},
            user_agent=self.user_agent,
            ignore_https_errors=True
        )

        # Create page
        self.page = await self.context.new_page()
        print("   🌐 Browser started")

    async def stop(self):
        """Close the browser"""
        if self.page:
            await self.page.close()
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        print("   🔒 Browser closed")

    async def navigate(self, url: str, wait_until: str = "networkidle"):
        """Navigate to a URL"""
        try:
            await self.page.goto(url, wait_until=wait_until, timeout=60000)
            await asyncio.sleep(2)
        except Exception as e:
            print(f"   ⚠️ Navigation error: {e}")
            try:
                await self.page.goto(url, wait_until="domcontentloaded", timeout=30000)
            except Exception as e2:
                print(f"   ⚠️ Fallback failed: {e2}")
                raise

    async def extract_all_elements(self) -> List[ElementInfo]:
        """
        Extract all relevant elements from the current page.
        Focuses on interactive elements and meaningful content elements.
        """
        extraction_script = """
        async () => {
            const elements = [];
            const seen = new Set();

            const interactiveSelectors = [
                'a[href]', 'button', 'input', 'textarea', 'select',
                '[role="button"]', '[role="link"]', '[role="textbox"]',
                '[role="checkbox"]', '[role="radio"]', '[role="switch"]',
                '[role="menuitem"]', '[role="tab"]', '[role="menu"]'
            ];

            const contentSelectors = [
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'p', 'span', 'div', 'li', 'td', 'th',
                'label', 'caption', 'legend',
                '[aria-label]', '[title]', '[data-testid]'
            ];

            const allSelectors = [...new Set([...interactiveSelectors, ...contentSelectors])];

            for (const selector of allSelectors) {
                try {
                    const nodes = document.querySelectorAll(selector);
                    for (const node of nodes) {
                        if (seen.has(node)) continue;
                        seen.add(node);

                        const style = window.getComputedStyle(node);
                        const rect = node.getBoundingClientRect();

                        if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) {
                            continue;
                        }

                        const parent = node.parentElement;

                        const attrs = {};
                        for (const attr of node.attributes) {
                            attrs[attr.name] = attr.value;
                        }

                        let action = null;
                        if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
                            action = 'input';
                        } else if (node.tagName === 'SELECT') {
                            action = 'select';
                        } else if (node.tagName === 'FORM') {
                            action = 'submit';
                        } else if (node.click) {
                            action = 'click';
                        }

                        const isInteractive =
                            node.tagName === 'BUTTON' ||
                            node.tagName === 'INPUT' ||
                            node.tagName === 'TEXTAREA' ||
                            node.tagName === 'SELECT' ||
                            (node.getAttribute && node.getAttribute('role')?.match(/button|link|checkbox/)) ||
                            action !== null;

                        const getXPath = (el) => {
                            if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
                            if (el.id) return `//*[@id="${el.id}"]`;
                            const parent = el.parentElement;
                            if (!parent) return `/${el.tagName.toLowerCase()}`;
                            const siblings = Array.from(parent.children).filter(e => e.tagName === el.tagName);
                            const index = siblings.indexOf(el) + 1;
                            return `${getXPath(parent)}/${el.tagName.toLowerCase()}[${index}]`;
                        };

                        const getCssSelector = (el) => {
                            if (el.id) return `#${CSS.escape(el.id)}`;
                            const path = [];
                            while (el && el.nodeType === Node.ELEMENT_NODE) {
                                let selector = el.tagName.toLowerCase();
                                if (el.className && typeof el.className === 'string') {
                                    const classes = el.className.trim().split(/\\s+/).filter(c => c);
                                    if (classes.length) {
                                        selector += '.' + classes.slice(0, 2).join('.');
                                    }
                                }
                                path.unshift(selector);
                                el = el.parentElement;
                                if (path.length > 5) break;
                            }
                            return path.join(' > ');
                        };

                        elements.push({
                            tag: node.tagName.toLowerCase(),
                            element_id: node.id || null,
                            class_name: node.className || null,
                            name_attr: node.getAttribute('name') || null,
                            type_attr: node.getAttribute('type') || null,
                            role: node.getAttribute('role') || null,
                            aria_label: node.getAttribute('aria-label') || null,
                            text_content: node.textContent?.trim().substring(0, 200) || null,
                            placeholder: node.getAttribute('placeholder') || null,
                            href: node.getAttribute('href') || null,
                            src: node.getAttribute('src') || node.getAttribute('data-src') || null,
                            action: action,
                            xpath: getXPath(node),
                            css_selector: getCssSelector(node),
                            attributes: attrs,
                            bounding_box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                            is_visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0,
                            is_interactive: isInteractive,
                            parent_tag: parent?.tagName?.toLowerCase() || null,
                            children_count: node.children?.length || 0,
                            inner_html: node.innerHTML?.substring(0, 1000) || null
                        });
                    }
                } catch (e) {}
            }

            return elements;
        }
        """

        try:
            elements = await self.page.evaluate(extraction_script)
            return [ElementInfo(**elem) for elem in elements]
        except Exception as e:
            print(f"   ⚠️ Element extraction error: {e}")
            return []

    async def find_page_links(self) -> List[str]:
        """Find all links to other pages on the current page"""
        links_script = """
        async () => {
            const links = [];
            const seen = new Set();
            const currentHost = window.location.hostname;

            document.querySelectorAll('a[href]').forEach(a => {
                let href = a.href;
                if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
                if (seen.has(href)) return;
                seen.add(href);

                try {
                    const linkHost = new URL(href).hostname;
                    links.push({ href: href, same_domain: linkHost === currentHost || linkHost.endsWith('.' + currentHost) });
                } catch {}
            });

            return links.filter(l => l.same_domain).slice(0, 20).map(l => l.href);
        }
        """

        try:
            links = await self.page.evaluate(links_script)
            return links
        except Exception as e:
            print(f"   ⚠️ Link extraction error: {e}")
            return []

    async def take_screenshot(self, path: str) -> bool:
        """Take a screenshot of the current page"""
        try:
            await self.page.screenshot(path=path, full_page=True)
            return True
        except Exception as e:
            print(f"   ⚠️ Screenshot error: {e}")
            return False

    async def wait_for_selector(self, selector: str, timeout: int = 10000):
        """Wait for a specific selector to appear"""
        try:
            await self.page.wait_for_selector(selector, timeout=timeout)
            return True
        except:
            return False


# Test function
async def test():
    agent = BrowserDiscoveryAgent(headless=False)
    await agent.start()
    print("Navigating to example.com...")
    await agent.navigate("https://example.com")
    print("Extracting elements...")
    elements = await agent.extract_all_elements()
    print(f"Found {len(elements)} elements")
    for elem in elements[:5]:
        print(f"  - {elem.tag}: {elem.text_content[:50] if elem.text_content else 'N/A'}")
    await agent.stop()


if __name__ == "__main__":
    import asyncio
    asyncio.run(test())