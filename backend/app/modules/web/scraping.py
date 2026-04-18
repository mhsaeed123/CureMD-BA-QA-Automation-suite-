"""
Web Scraping Utilities
Based on Domain pages scraper.py and SMILE CDR scraping.py
"""
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import Set, Optional, Dict, List, Any
from collections import deque
import logging
import time
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)


class WebScraper:
    """
    Generic BFS web scraper with URL filtering and text extraction.
    """

    def __init__(
        self,
        base_url: str,
        allowed_domain: Optional[str] = None,
        max_depth: int = 10,
        max_pages: int = 100,
        timeout: int = 10,
        verify_ssl: bool = False,
        respect_robots: bool = False
    ):
        self.base_url = base_url
        self.allowed_domain = allowed_domain or urlparse(base_url).netloc
        self.max_depth = max_depth
        self.max_pages = max_pages
        self.timeout = timeout
        self.verify_ssl = verify_ssl
        self.respect_robots = respect_robots

        self.visited: Set[str] = set()
        self.results: List[Dict[str, Any]] = []

    def scrape(self) -> List[Dict[str, Any]]:
        """
        Run the scraper starting from base_url.

        Returns:
            List of dicts with keys: url, title, text
        """
        queue = deque([(self.base_url, 0)])  # (url, depth)

        while queue and len(self.visited) < self.max_pages:
            url, depth = queue.popleft()

            if url in self.visited:
                continue

            if depth > self.max_depth:
                continue

            if not self._should_scrape(url):
                continue

            self.visited.add(url)
            page_data = self._fetch_page(url)

            if page_data:
                self.results.append(page_data)

                # Queue discovered links
                for link in self._extract_links(page_data["url"], page_data["soup"]):
                    if link not in self.visited:
                        queue.append((link, depth + 1))

            time.sleep(0.5)  # Be respectful

        return self.results

    def _should_scrape(self, url: str) -> bool:
        """Check if URL should be scraped."""
        parsed = urlparse(url)

        # Must be same domain
        if parsed.netloc != self.allowed_domain:
            return False

        # Skip common non-content URLs
        skip_patterns = [
            ".pdf", ".jpg", ".png", ".gif", ".css", ".js",
            "/media/", "/static/", "/images/", "/assets/"
        ]
        if any(pattern in url.lower() for pattern in skip_patterns):
            return False

        return True

    def _fetch_page(self, url: str) -> Optional[Dict[str, Any]]:
        """Fetch a single page and extract content."""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; SuperAppBot/1.0)"
            }
            response = requests.get(
                url,
                headers=headers,
                timeout=self.timeout,
                verify=self.verify_ssl
            )
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Remove script and style elements
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()

            # Get title
            title = ""
            if soup.title:
                title = soup.title.string or ""

            # Get main text content
            text = soup.get_text(separator="\n", strip=True)
            text = "\n".join(line for line in text.split("\n") if line.strip())

            return {
                "url": url,
                "title": title.strip() if title else "",
                "text": text,
                "soup": soup,
                "status_code": response.status_code
            }

        except requests.RequestException as e:
            logger.warning(f"Failed to fetch {url}: {e}")
            return None

    def _extract_links(self, base_url: str, soup: BeautifulSoup) -> List[str]:
        """Extract and filter links from a page."""
        links = []

        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]

            # Handle relative URLs
            full_url = urljoin(base_url, href)
            parsed = urlparse(full_url)

            # Remove fragment
            clean_url = parsed._replace(fragment="").geturl()

            if clean_url.startswith("http") and self._should_scrape(clean_url):
                links.append(clean_url)

        return list(set(links))[:20]  # Limit to 20 links per page


class AuthenticatedScraper(WebScraper):
    """
    Web scraper with session-based authentication.
    Based on SMILE CDR server docs using auth.py
    """

    def __init__(
        self,
        base_url: str,
        login_url: str,
        username: str,
        password: str,
        **kwargs
    ):
        super().__init__(base_url, **kwargs)
        self.login_url = login_url
        self.username = username
        self.password = password
        self.session = requests.Session()

    def login(self) -> bool:
        """
        Perform form-based login.

        Returns:
            True if login successful
        """
        try:
            # Get login page to extract form fields
            login_page = self.session.get(self.login_url, verify=self.verify_ssl)
            login_page.raise_for_status()

            soup = BeautifulSoup(login_page.text, "html.parser")
            form = soup.find("form")

            if not form:
                # Try to find any form
                forms = soup.find_all("form")
                if forms:
                    form = forms[0]
                else:
                    logger.error("No login form found")
                    return False

            # Build form data
            data = {}
            for input_tag in form.find_all("input"):
                name = input_tag.get("name")
                value = input_tag.get("value", "")
                if name:
                    data[name] = value

            # Add credentials
            data[self._get_username_field(form)] = self.username
            data[self._get_password_field(form)] = self.password

            # Submit login
            action = form.get("action") or self.login_url
            login_url = urljoin(self.login_url, action)

            response = self.session.post(
                login_url,
                data=data,
                verify=self.verify_ssl
            )
            response.raise_for_status()

            # Check for successful login (location change or success message)
            return response.status_code == 200

        except requests.RequestException as e:
            logger.error(f"Login failed: {e}")
            return False

    def _get_username_field(self, form) -> str:
        """Find the username field name in the form."""
        for tag in form.find_all(["input", "fieldset"]):
            name = tag.get("name", "").lower()
            if "user" in name or "name" in name:
                return tag.get("name", "username")
        return "username"

    def _get_password_field(self, form) -> str:
        """Find the password field name in the form."""
        for tag in form.find_all(["input", "fieldset"]):
            name = tag.get("name", "").lower()
            if "pass" in name:
                return tag.get("name", "password")
        return "password"

    def _fetch_page(self, url: str) -> Optional[Dict[str, Any]]:
        """Fetch page using authenticated session."""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; SuperAppBot/1.0)"
            }
            response = self.session.get(
                url,
                headers=headers,
                timeout=self.timeout,
                verify=self.verify_ssl
            )
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()

            title = soup.title.string if soup.title else ""
            text = soup.get_text(separator="\n", strip=True)
            text = "\n".join(line for line in text.split("\n") if line.strip())

            return {
                "url": url,
                "title": title.strip() if title else "",
                "text": text,
                "soup": soup,
                "status_code": response.status_code
            }

        except requests.RequestException as e:
            logger.warning(f"Failed to fetch {url}: {e}")
            return None
