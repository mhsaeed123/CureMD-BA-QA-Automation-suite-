from typing import Optional
from sqlmodel import Field, SQLModel

class Setting(SQLModel, table=True):
    key: str = Field(primary_key=True)
    value: str
    description: Optional[str] = None
    category: str = "general"  # e.g., 'fhir', 'keycloak', 'ai'

class SettingUpdate(SQLModel):
    value: str
