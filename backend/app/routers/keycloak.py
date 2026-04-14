from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.db import get_session
from app.models import Setting
from app.services.keycloak_service import KeycloakService

router = APIRouter(prefix="/keycloak", tags=["keycloak"])

def get_keycloak_service(session: Session = Depends(get_session)) -> KeycloakService:
    base_url = session.get(Setting, "KEYCLOAK_BASE_URL")
    realm = session.get(Setting, "KEYCLOAK_REALM")
    client_id = session.get(Setting, "KEYCLOAK_CLIENT_ID")
    client_secret = session.get(Setting, "KEYCLOAK_CLIENT_SECRET")

    if not all([base_url, realm, client_id, client_secret]):
        raise HTTPException(status_code=400, detail="Keycloak configuration missing in Settings")

    return KeycloakService(
        base_url=base_url.value,
        realm=realm.value,
        client_id=client_id.value,
        client_secret=client_secret.value
    )

@router.get("/token")
def get_token(service: KeycloakService = Depends(get_keycloak_service)):
    try:
        token = service.get_token()
        return {"access_token": token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users")
def get_users(search: str = None, service: KeycloakService = Depends(get_keycloak_service)):
    try:
        users = service.get_users(search)
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
