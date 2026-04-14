"""
Browser Module - Web Automation with Vision
==========================================
Inspired by: browser-use, LaVague, stagehand, skyvern, steel-browser
Features:
- Playwright + CDP integration
- Vision-based element detection
- Multi-step action planning
- Loop detection
"""

from .controller import BrowserController
from .vision import VisionEngine
from .playwright_integration import PlaywrightBrowser

__all__ = ["BrowserController", "VisionEngine", "PlaywrightBrowser"]
