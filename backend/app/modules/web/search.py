"""
DuckDuckGo Search Utility
Consolidated from multiple scripts: ollamascraperrealtime.py, xellexollamacampaignscrape.py, etc.
"""
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional, Any
import time
import logging
import urllib3

# Disable only the specific SSL warning we need
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)


class SearchResult:
    """Structured search result."""

    def __init__(
        self,
        title: str,
        link: str,
        snippet: str,
        rank: int = 0
    ):
        self.title = title
        self.link = link
        self.snippet = snippet
        self.rank = rank

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "link": self.link,
            "snippet": self.snippet,
            "rank": self.rank
        }


def duckduckgo_search(
    query: str,
    max_results: int = 10,
    timeout: int = 10,
    verify_ssl: bool = False
) -> List[SearchResult]:
    """
    Perform a DuckDuckGo search and return structured results.

    Args:
        query: Search query string
        max_results: Maximum number of results to return (default 10)
        timeout: Request timeout in seconds
        verify_ssl: Whether to verify SSL certificates

    Returns:
        List of SearchResult objects
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
    }

    url = f"https://html.duckduckgo.com/html/?q={requests.utils.quote(query)}"

    try:
        response = requests.get(url, headers=headers, timeout=timeout, verify=verify_ssl)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"Search request failed: {e}")
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    results: List[SearchResult] = []

    for i, result in enumerate(soup.find_all("div", class_="result"), start=1):
        if i > max_results:
            break

        title_tag = result.find("a", class_="result__a")
        if not title_tag:
            continue

        link = title_tag.get("href", "")
        title = title_tag.get_text(strip=True)

        snippet_tag = result.find("a", class_="result__snippet")
        snippet = snippet_tag.get_text(strip=True) if snippet_tag else ""

        results.append(SearchResult(
            title=title,
            link=link,
            snippet=snippet,
            rank=i
        ))

    return results


def search_with_retry(
    query: str,
    max_results: int = 10,
    max_attempts: int = 3,
    retry_delay: float = 2.0
) -> List[SearchResult]:
    """
    Search with automatic retry on failure.

    Args:
        query: Search query
        max_results: Maximum results
        max_attempts: Number of retry attempts
        retry_delay: Delay between retries in seconds

    Returns:
        List of SearchResult objects
    """
    for attempt in range(max_attempts):
        try:
            results = duckduckgo_search(query, max_results)
            if results:
                return results
        except Exception as e:
            logger.warning(f"Search attempt {attempt + 1} failed: {e}")

        if attempt < max_attempts - 1:
            time.sleep(retry_delay)

    return []


def extract_company_info(search_results: List[SearchResult]) -> Dict[str, Optional[str]]:
    """
    Extract company information from search results.

    Returns:
        Dict with keys: founder_name, contact_email, product_description
    """
    import re

    info = {
        "founder_name": None,
        "contact_email": None,
        "product_description": None
    }

    for result in search_results:
        page_text = _fetch_page_text(result.link)
        if not page_text:
            continue

        # Extract email
        if not info["contact_email"]:
            email_matches = re.findall(
                r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
                page_text
            )
            for email in email_matches:
                if not any(
                    bad in email.lower()
                    for bad in ["noreply", "no-reply", "example", "test"]
                ):
                    info["contact_email"] = email
                    break

        # Extract founder info (simple heuristic)
        if not info["founder_name"]:
            text_lower = page_text.lower()
            if "founder" in text_lower or "ceo" in text_lower:
                lines = page_text.split(".")
                for line in lines:
                    line_lower = line.lower()
                    if "founder" in line_lower:
                        words = line.split()
                        name_parts = []
                        for j, word in enumerate(words):
                            if "founder" in word.lower():
                                # Grab words before founder
                                start = max(0, j - 3)
                                name_parts = words[start:j]
                                if name_parts:
                                    info["founder_name"] = " ".join(name_parts)
                                    break
                        if info["founder_name"]:
                            break

        # Extract product description (simple heuristic)
        if not info["product_description"]:
            lines = page_text.split("\n")
            for line in lines:
                line_lower = line.lower()
                if any(
                    keyword in line_lower
                    for keyword in ["we offer", "our product", "our service", "provides"]
                ):
                    if 20 < len(line.split()) < 100:
                        info["product_description"] = line.strip()
                        break

        # Early exit if we have everything
        if all(info.values()):
            break

        time.sleep(1)  # Be respectful

    return info


def _fetch_page_text(url: str) -> Optional[str]:
    """Fetch and extract text content from a URL."""
    import trafilatura

    try:
        downloaded = trafilatura.fetch_url(url=url)
        if downloaded:
            return trafilatura.extract(
                downloaded,
                include_formatting=True,
                include_links=True,
                favor_precision=True
            )
    except Exception as e:
        logger.warning(f"Failed to fetch {url}: {e}")

    return None
