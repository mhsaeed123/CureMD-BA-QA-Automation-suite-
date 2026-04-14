from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.db import get_session
from app.models import Setting
from app.services.ai_service import AIProviderFactory

router = APIRouter(prefix="/ai", tags=["ai"])

class ChatRequest(BaseModel):
    provider: str  # 'openai' or 'ollama'
    prompt: str
    system_prompt: str = "You are a helpful assistant for FHIR mapping."

@router.post("/chat")
def chat(request: ChatRequest, session: Session = Depends(get_session)):
    # Fetch config from DB based on provider
    config = {}
    if request.provider == "openai":
        api_key_setting = session.get(Setting, "OPENAI_API_KEY")
        if not api_key_setting:
            raise HTTPException(status_code=400, detail="OPENAI_API_KEY not configured in Settings")
        config["api_key"] = api_key_setting.value
        config["model"] = "gpt-4" # Could also be a setting
    elif request.provider == "ollama":
        config["model"] = "llama2" # Could be a setting

    try:
        provider = AIProviderFactory.get_provider(request.provider, config)
        response = provider.generate_text(request.prompt, request.system_prompt)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
