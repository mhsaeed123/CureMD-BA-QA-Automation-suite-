"""
LLM Prompt Templates
Centralized prompt management for all AI interactions.
"""
from typing import Dict, Optional


class PromptTemplates:
    """Centralized prompt templates for various AI tasks."""

    # Web Search Decision
    SEARCH_DECISION = """You are not an AI assistant. Your only task is to decide if the last user prompt requires a Google search for the assistant to respond correctly.

If the assistant should search google for more data before responding, simply respond "True".
If the conversation already has the context needed, respond "False".

Do not generate any explanations. Only generate "True" or "False"."""

    # Query Generation
    QUERY_GENERATION = """You are an AI web search query generator. You will be given a prompt that requires web search data.

Generate the best possible DuckDuckGo query to find that data. Do not respond with anything but a query that an expert human search engine user would type. Keep queries simple and effective."""

    # Search Result Selection
    RESULT_SELECTION = """You are an AI trained to select the best search result.

Given a list of search results and a user prompt, select the index (0-9) of the best result to click for data needed to respond correctly.

Respond with only the integer index."""

    # Content Verification
    CONTENT_VERIFICATION = """You are an AI designed to verify if scraped web page content contains the data needed to respond to a user prompt.

Respond "True" if the page text contains reliable and necessary data, "False" otherwise.

Only respond "True" or "False"."""

    # Email Generation
    EMAIL_GENERATION = """You are an AI assistant that generates personalized cold outreach emails.

Generate a concise, engaging email based on the company information provided.
The email should:
- Have a compelling opening line
- Mention what the company does specifically
- Show how Xellex can help them achieve a specific goal
- End with a soft call to action

Keep it under 200 words. Do not use placeholder brackets."""

    # Campaign Subject Line
    SUBJECT_GENERATION = """Generate a compelling email subject line for a cold outreach email.

The subject should:
- Be under 50 characters
- Be specific to the company
- Create curiosity without being clickbait

Respond with only the subject line."""

    # Summarization
    SUMMARIZATION = """You are an AI assistant that summarizes content for cold outreach.

Summarize the following product/service description in a concise and engaging way suitable for opening a cold email:

{content}"""

    # Text Refinement
    TEXT_REFINEMENT = """Refine the following text to be more engaging and persuasive.

Original Text:
{text}

{instructions}

Respond with only the refined text."""

    # Healthcare FHIR Mapping
    FHIR_MAPPING = """You are an AI assistant specialized in FHIR healthcare data mapping.

Map the following healthcare data to appropriate FHIR resources:
{data}

Provide the FHIR resource type, required fields, and any extensions needed."""

    @classmethod
    def get_search_decision_messages(cls, conversation_history: str) -> list:
        return [
            {"role": "system", "content": cls.SEARCH_DECISION},
            {"role": "assistant", "content": conversation_history}
        ]

    @classmethod
    def get_query_generation_messages(cls, user_prompt: str) -> list:
        return [
            {"role": "system", "content": cls.QUERY_GENERATION},
            {"role": "user", "content": user_prompt}
        ]

    @classmethod
    def get_email_generation_messages(
        cls,
        company_name: str,
        founder_name: Optional[str],
        product_description: str,
        specific_goal: str
    ) -> list:
        founder_greeting = f"Hi {founder_name}," if founder_name else "Hi there,"
        content = f"""{founder_greeting}

I noticed that {company_name} is focused on {product_description}. At Xellex, we specialize in AI-powered automation, custom software development, and seamless integrations to help businesses like yours work smarter, not harder.

Whether you need:
* AI-driven automation to reduce manual work and improve efficiency
* Custom web and mobile applications
* Integration of tools like CRMs, ERPs, or cloud services

we've got you covered.

Would you be open to a quick chat to explore how we can help {company_name} achieve {specific_goal}?

Best regards,
Team Xellex"""
        return [
            {"role": "system", "content": cls.EMAIL_GENERATION},
            {"role": "user", "content": content}
        ]
