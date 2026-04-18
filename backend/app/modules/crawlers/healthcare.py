"""
Healthcare-specific crawlers and scrapers.
Based on Healthcarecampaign.py, SMILE CDR scraping.py
"""
import requests
import logging
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin
from bs4 import BeautifulSoup
import time
from ..web.scraping import AuthenticatedScraper, WebScraper
from ..email.sender import EmailSender, SMTPServer
from ..data.io import ExcelReader, ExcelWriter
from ..core.config import settings

logger = logging.getLogger(__name__)


class SMILECDRScraper:
    """
    Scraper for SMILE CDR documentation.
    Based on SMILE CDR scraping.py and 'SMILE CDR server docs using auth.py'
    """

    def __init__(
        self,
        base_url: str,
        username: Optional[str] = None,
        password: Optional[str] = None,
        verify_ssl: bool = False
    ):
        self.base_url = base_url
        self.username = username or settings.fhir_username
        self.password = password or settings.fhir_password
        self.verify_ssl = verify_ssl

    def scrape_documentation(
        self,
        output_file: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Scrape SMILE CDR documentation pages.

        Args:
            output_file: Optional file to write results

        Returns:
            List of page data dicts
        """
        scraper = WebScraper(
            base_url=self.base_url,
            allowed_domain=self.base_url,
            max_depth=5,
            max_pages=50,
            verify_ssl=self.verify_ssl
        )

        results = scraper.scrape()

        if output_file:
            self._write_output(results, output_file)

        return results

    def scrape_authenticated(
        self,
        login_url: str,
        output_file: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Scrape authenticated SMILE CDR server docs.

        Args:
            login_url: URL for login form
            output_file: Optional output file

        Returns:
            List of page data dicts
        """
        scraper = AuthenticatedScraper(
            base_url=self.base_url,
            login_url=login_url,
            username=self.username,
            password=self.password,
            allowed_domain=self.base_url,
            verify_ssl=self.verify_ssl
        )

        if not scraper.login():
            logger.error("Failed to login to SMILE CDR")
            return []

        results = scraper.scrape()

        if output_file:
            self._write_output(results, output_file)

        return results

    def _write_output(
        self,
        results: List[Dict[str, Any]],
        output_file: str
    ):
        """Write scrape results to file."""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_file, "w", encoding="utf-8") as f:
            for page in results:
                f.write(f"# {page['title']}\n")
                f.write(f"URL: {page['url']}\n\n")
                f.write(page['text'])
                f.write("\n\n---\n\n")

        logger.info(f"Wrote {len(results)} pages to {output_file}")


class HealthcareCampaignRunner:
    """
    Runs healthcare email campaigns from Excel data.
    Based on Healthcarecampaign.py
    """

    def __init__(
        self,
        excel_file: str,
        sender_email: str,
        sender_password: str
    ):
        self.excel_file = excel_file
        self.sender_email = sender_email
        self.sender_password = sender_password

    def run(self) -> Dict[str, Any]:
        """
        Run the healthcare campaign.

        Returns:
            Summary of results
        """
        try:
            # Read the Excel file
            df = ExcelReader.read(self.excel_file)

            required_cols = ["Email", "Subject", "Body"]
            missing = set(required_cols) - set(df.columns)
            if missing:
                raise ValueError(f"Missing columns: {missing}")

            # Setup email sender
            smtp = SMTPServer(
                host="smtp.gmail.com",
                port=587,
                username=self.sender_email,
                password=self.sender_password
            )
            sender = EmailSender(smtp=smtp, from_email=self.sender_email)

            # Send emails
            results = {"sent": 0, "failed": 0, "errors": []}

            for idx, row in df.iterrows():
                try:
                    email = row["Email"]
                    subject = row["Subject"]
                    body = row["Body"]

                    if sender.send(email, subject, body):
                        results["sent"] += 1
                    else:
                        results["failed"] += 1

                except Exception as e:
                    logger.error(f"Error sending to row {idx}: {e}")
                    results["failed"] += 1
                    results["errors"].append({"row": idx, "error": str(e)})

            return results

        except Exception as e:
            logger.error(f"Campaign failed: {e}")
            return {"sent": 0, "failed": 0, "errors": [str(e)]}


from pathlib import Path
