"""
Keycloak Auth Service
====================
Reused from CureMD Developer Portal Python.
"""

import logging
import time
from typing import Dict, List, Optional

import httpx

from config import get_config as get_settings

logger = logging.getLogger(__name__)


class KeycloakService:
    """Keycloak authentication service."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        realm: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
    ):
        import os
        settings = get_settings()
        auth_settings = getattr(settings, 'auth', None)
        if auth_settings:
            self.base_url = base_url or getattr(auth_settings, 'keycloak_base_url', None)
            self.realm = realm or getattr(auth_settings, 'keycloak_realm', None)
            self.client_id = client_id or getattr(auth_settings, 'keycloak_client_id', None)
            self.client_secret = client_secret or getattr(auth_settings, 'keycloak_client_secret', None)
        else:
            self.base_url = base_url or os.environ.get('KEYCLOAK_BASE_URL')
            self.realm = realm or os.environ.get('KEYCLOAK_REALM')
            self.client_id = client_id or os.environ.get('KEYCLOAK_CLIENT_ID')
            self.client_secret = client_secret or os.environ.get('KEYCLOAK_CLIENT_SECRET')
        self._token: Optional[str] = None
        self._token_expiry: float = 0

    def _is_configured(self) -> bool:
        return all([self.base_url, self.realm, self.client_id, self.client_secret])

    async def get_token(self) -> str:
        """Get or refresh the access token."""
        if self._token and time.time() < self._token_expiry - 60:
            return self._token

        if not self._is_configured():
            raise ValueError("Keycloak is not configured. Set KEYCLOAK_* env vars.")

        token_url = f"{self.base_url}/realms/{self.realm}/protocol/openid-connect/token"
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }

        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.post(token_url, data=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()

        self._token = data["access_token"]
        self._token_expiry = time.time() + data["expires_in"]
        return self._token

    async def get_users(self, search: Optional[str] = None) -> List[Dict]:
        """Search users in Keycloak."""
        token = await self.get_token()
        url = f"{self.base_url}/admin/realms/{self.realm}/users"
        headers = {"Authorization": f"Bearer {token}"}
        params = {}
        if search:
            params["search"] = search

        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.get(url, headers=headers, params=params, timeout=30)
            resp.raise_for_status()
            return resp.json()
