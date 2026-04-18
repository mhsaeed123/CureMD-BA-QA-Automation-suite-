"""
GitHub Client
Based on Projects/Scripts/github_client.py
"""
import httpx
import base64
import logging
from typing import List, Optional, Dict, Any
from ..core.config import settings

logger = logging.getLogger(__name__)


class GitHubClient:
    """Client for interacting with GitHub API."""

    def __init__(
        self,
        token: Optional[str] = None,
        username: Optional[str] = None
    ):
        self.token = token or settings.github_token
        self.username = username or settings.github_username
        self.base_url = "https://api.github.com"
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"token {self.token}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "CureMD-SuperApp/1.0"
            },
            timeout=30.0
        )

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

    async def get_repos(self) -> List[Dict[str, Any]]:
        """Get all repositories for the authenticated user."""
        try:
            response = await self.client.get(f"{self.base_url}/user/repos")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching repos: {e}")
            return []

    async def get_repo(self, owner: str, repo_name: str) -> Optional[Dict[str, Any]]:
        """Get a specific repository."""
        try:
            response = await self.client.get(
                f"{self.base_url}/repos/{owner}/{repo_name}"
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching repo: {e}")
            return None

    async def create_repo(
        self,
        name: str,
        description: Optional[str] = None,
        private: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Create a new repository."""
        try:
            payload = {
                "name": name,
                "description": description or "",
                "private": private,
                "auto_init": True
            }
            response = await self.client.post(
                f"{self.base_url}/user/repos",
                json=payload
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error creating repo: {e}")
            return None

    async def create_issue(
        self,
        owner: str,
        repo_name: str,
        title: str,
        body: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Create an issue in a repository."""
        try:
            payload = {"title": title, "body": body or ""}
            response = await self.client.post(
                f"{self.base_url}/repos/{owner}/{repo_name}/issues",
                json=payload
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error creating issue: {e}")
            return None

    async def create_file(
        self,
        owner: str,
        repo_name: str,
        file_path: str,
        content: str,
        commit_message: str
    ) -> Optional[Dict[str, Any]]:
        """Create or update a file in a repository."""
        try:
            content_encoded = base64.b64encode(content.encode()).decode()

            payload = {
                "message": commit_message,
                "content": content_encoded
            }
            response = await self.client.put(
                f"{self.base_url}/repos/{owner}/{repo_name}/contents/{file_path}",
                json=payload
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error creating file: {e}")
            return None

    async def get_file_content(
        self,
        owner: str,
        repo_name: str,
        file_path: str,
        ref: Optional[str] = None
    ) -> Optional[str]:
        """Get the content of a file from a repository."""
        try:
            params = {"ref": ref} if ref else {}
            response = await self.client.get(
                f"{self.base_url}/repos/{owner}/{repo_name}/contents/{file_path}",
                params=params
            )
            response.raise_for_status()
            data = response.json()

            if "content" in data:
                return base64.b64decode(data["content"]).decode()
            return None
        except httpx.HTTPError as e:
            logger.error(f"Error getting file content: {e}")
            return None

    async def list_commits(
        self,
        owner: str,
        repo_name: str,
        per_page: int = 30
    ) -> List[Dict[str, Any]]:
        """List commits in a repository."""
        try:
            response = await self.client.get(
                f"{self.base_url}/repos/{owner}/{repo_name}/commits",
                params={"per_page": per_page}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error listing commits: {e}")
            return []
