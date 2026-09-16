"""
Pydantic Schemas — LLM Providers
"""

from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from datetime import datetime


class LLMProviderCreate(BaseModel):
    name: str
    provider_key: str
    base_url: str
    api_key: Optional[str] = None
    models: List[str] = []
    is_enabled: bool = True
    is_default: bool = False
    notes: str = ""


class LLMProviderUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    models: Optional[List[str]] = None
    is_enabled: Optional[bool] = None
    is_default: Optional[bool] = None
    notes: Optional[str] = None


class LLMProviderResponse(BaseModel):
    id: str
    name: str
    provider_key: str
    base_url: str
    # Never return the raw API key — mask it
    api_key_masked: Optional[str] = None
    models: List[str]
    is_enabled: bool
    is_default: bool
    notes: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_masked(cls, obj):
        """Mask the API key before returning to client."""
        key = obj.api_key or ""
        masked = f"{key[:6]}{'*' * max(0, len(key) - 10)}{key[-4:]}" if len(key) > 10 else ("*" * len(key) if key else None)
        return cls(
            id=obj.id,
            name=obj.name,
            provider_key=obj.provider_key,
            base_url=obj.base_url,
            api_key_masked=masked,
            models=obj.models or [],
            is_enabled=obj.is_enabled,
            is_default=obj.is_default,
            notes=obj.notes or "",
            created_at=obj.created_at,
            updated_at=obj.updated_at,
        )


class TestConnectionRequest(BaseModel):
    base_url: str
    api_key: Optional[str] = None
    model: str = "gpt-3.5-turbo"
