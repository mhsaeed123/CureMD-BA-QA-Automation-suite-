from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db import get_session
from app.models import Setting, SettingUpdate
from typing import List

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("/", response_model=List[Setting])
def read_settings(session: Session = Depends(get_session)):
    settings = session.exec(select(Setting)).all()
    return settings

@router.post("/", response_model=Setting)
def create_setting(setting: Setting, session: Session = Depends(get_session)):
    db_setting = session.get(Setting, setting.key)
    if db_setting:
        raise HTTPException(status_code=400, detail="Setting already exists")
    session.add(setting)
    session.commit()
    session.refresh(setting)
    return setting

@router.put("/{key}", response_model=Setting)
def update_setting(key: str, setting_update: SettingUpdate, session: Session = Depends(get_session)):
    db_setting = session.get(Setting, key)
    if not db_setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    db_setting.value = setting_update.value
    session.add(db_setting)
    session.commit()
    session.refresh(db_setting)
    return db_setting

@router.get("/{key}", response_model=Setting)
def read_setting(key: str, session: Session = Depends(get_session)):
    setting = session.get(Setting, key)
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting
