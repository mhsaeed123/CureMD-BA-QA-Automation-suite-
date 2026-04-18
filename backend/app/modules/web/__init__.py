"""
Web Module - Search and scraping utilities.
"""
from .search import duckduckgo_search, search_with_retry
from .scraping import WebScraper, AuthenticatedScraper

__all__ = [
    "duckduckgo_search",
    "search_with_retry",
    "WebScraper",
    "AuthenticatedScraper",
]
