"""HTTP Utilities - HTTP Requests"""
import httpx
from typing import Any, Dict, Optional

async def http_get(url: str, headers: Dict = None, params: Dict = None) -> Dict[str, Any]:
    """GET request."""
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

async def http_post(url: str, data: Dict = None, json: Dict = None, headers: Dict = None) -> Dict[str, Any]:
    """POST request."""
    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=data, json=json, headers=headers)
        response.raise_for_status()
        return response.json()
