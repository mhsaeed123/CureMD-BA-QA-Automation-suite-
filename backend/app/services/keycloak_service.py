import requests
import time
from typing import Optional, Dict

class KeycloakService:
    def __init__(self, base_url: str, realm: str, client_id: str, client_secret: str):
        self.base_url = base_url
        self.realm = realm
        self.client_id = client_id
        self.client_secret = client_secret
        self.token_url = f"{base_url}/realms/{realm}/protocol/openid-connect/token"
        self._token = None
        self._token_expiry = 0

    def get_token(self) -> str:
        if self._token and time.time() < self._token_expiry - 60:
            return self._token

        payload = {
            'grant_type': 'client_credentials',
            'client_id': self.client_id,
            'client_secret': self.client_secret
        }

        try:
            # Note: verify=False is used in many of your scripts, likely due to self-signed certs in dev.
            # In production, this should be True or configurable.
            response = requests.post(self.token_url, data=payload, verify=False)
            response.raise_for_status()
            data = response.json()
            self._token = data['access_token']
            self._token_expiry = time.time() + data['expires_in']
            return self._token
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to obtain Keycloak token: {str(e)}")

    def get_users(self, search: Optional[str] = None) -> list:
        token = self.get_token()
        url = f"{self.base_url}/admin/realms/{self.realm}/users"
        headers = {"Authorization": f"Bearer {token}"}
        params = {}
        if search:
            params['search'] = search

        response = requests.get(url, headers=headers, params=params, verify=False)
        response.raise_for_status()
        return response.json()
