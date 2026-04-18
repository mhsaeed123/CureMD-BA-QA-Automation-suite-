"""
Email Campaign Generator
Based on ollamascraperrealtime.py, apolloleadsemailbuilder*.py, campaignmaileditor.py
"""
import re
import logging
from typing import Optional, Dict, Any, List
from ..llm.clients import LLMFactory
from ..llm.prompts import PromptTemplates
from ..web.search import duckduckgo_search, extract_company_info

logger = logging.getLogger(__name__)


class EmailGenerator:
    """
    Generates personalized cold outreach emails using AI.
    """

    def __init__(
        self,
        llm_provider: str = "ollama",
        model: Optional[str] = None
    ):
        self.llm_provider = llm_provider
        self.model = model
        self.client = LLMFactory.get_client(llm_provider)

    def generate_company_email(
        self,
        company_name: str,
        product_description: Optional[str] = None,
        founder_name: Optional[str] = None,
        specific_goal: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Generate a campaign email for a company.

        Returns:
            Dict with keys: subject, body, founder_name, product_description
        """
        # Fetch company info if not provided
        if not product_description or not founder_name:
            info = self._research_company(company_name)
            product_description = product_description or info.get("product_description")
            founder_name = founder_name or info.get("founder_name")

        if not product_description:
            product_description = "your products and services"

        # Determine specific goal based on content
        if not specific_goal:
            specific_goal = self._determine_goal(product_description)

        # Generate email
        subject = self._generate_subject(company_name, product_description)
        body = self._generate_body(
            company_name,
            founder_name,
            product_description,
            specific_goal
        )

        return {
            "subject": subject,
            "body": body,
            "founder_name": founder_name,
            "product_description": product_description
        }

    def _research_company(self, company_name: str) -> Dict[str, Any]:
        """Research company to extract relevant information."""
        try:
            results = duckduckgo_search(f"{company_name} founder contact product", max_results=5)
            return extract_company_info(results)
        except Exception as e:
            logger.warning(f"Company research failed for {company_name}: {e}")
            return {}

    def _determine_goal(self, product_description: str) -> str:
        """Determine the specific goal based on product description."""
        text_lower = product_description.lower()

        goals = [
            ("ai", "accelerating your AI initiatives"),
            ("web development", "enhancing your online presence"),
            ("mobile development", "building your mobile presence"),
            ("automation", "reducing operational costs and improving efficiency"),
            ("security", "strengthening your security posture"),
            ("data", "leveraging your data for better insights"),
            ("cloud", "optimizing your cloud infrastructure"),
            ("software", "modernizing your software development"),
        ]

        for keyword, goal in goals:
            if keyword in text_lower:
                return goal

        return "achieving your business objectives"

    def _generate_subject(
        self,
        company_name: str,
        product_description: str
    ) -> str:
        """Generate email subject line."""
        system_msg = PromptTemplates.SUBJECT_GENERATION
        user_msg = f"Company: {company_name}\nProduct: {product_description}"

        try:
            response = self.client.chat(
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": user_msg}
                ]
            )

            if self.llm_provider == "openai":
                subject = response.choices[0].message.content
            else:
                subject = response['message']['content']

            # Ensure subject is reasonable length
            if len(subject) > 100:
                subject = subject[:97] + "..."

            return subject.strip()

        except Exception as e:
            logger.error(f"Subject generation failed: {e}")
            return f"Quick question about {company_name}"

    def _generate_body(
        self,
        company_name: str,
        founder_name: Optional[str],
        product_description: str,
        specific_goal: str
    ) -> str:
        """Generate email body."""
        founder_first = ""
        if founder_name:
            founder_first = founder_name.split()[0] if " " in founder_name else founder_name

        system_msg = PromptTemplates.EMAIL_GENERATION

        body = f"""Hi {founder_first + ',' if founder_first else 'there,'}

I noticed that {company_name} is focused on {product_description}. At Xellex, we specialize in AI-powered automation, custom software development, and seamless integrations to help businesses like yours work smarter, not harder.

Whether you need:
* AI-driven automation to reduce manual work and improve efficiency
* Custom web and mobile applications built with the latest technologies
* Integration of tools like CRMs, ERPs, or cloud services

we've got you covered.

Would you be open to a quick chat to explore how we can help {company_name} achieve {specific_goal}?

Looking forward to your thoughts!

Best regards,
Team Xellex"""

        # Try to refine with AI if available
        try:
            refinement_prompt = f"""Refine the following campaign mail to be more engaging and persuasive. The greeting should be "Hi {founder_first}," if we have a name, or "Hi there," if not.

Original Text:
{body}

Respond with only the refined email."""

            response = self.client.chat(
                messages=[
                    {"role": "system", "content": PromptTemplates.TEXT_REFINEMENT},
                    {"role": "user", "content": refinement_prompt}
                ]
            )

            if self.llm_provider == "openai":
                refined = response.choices[0].message.content
            else:
                refined = response['message']['content']

            if refined and len(refined) > 50:
                return refined.strip()

        except Exception as e:
            logger.warning(f"Email refinement failed: {e}")

        return body


def clean_email_content(text: str) -> str:
    """Clean and sanitize email content."""
    # Remove any thinking tags or AI artifacts
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\[.*?\]", "", text)

    # Normalize whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()

    return text
