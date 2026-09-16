"""
Providers API — Built-in catalogue + Org-configured custom LLM providers.
Org admins can add any OpenAI-compatible endpoint via the UI.
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from db.database import get_db
from db.models import LLMProvider
from schemas.provider import (
    LLMProviderCreate, LLMProviderUpdate,
    LLMProviderResponse, TestConnectionRequest
)
from core.litellm_client import get_provider_catalogue
from core.tools_registry import get_available_tools

router = APIRouter(prefix="/providers", tags=["Providers"])


# ── Built-in catalogue (read-only, from litellm_client.py) ──────────────────

@router.get("/")
def list_catalogue():
    """Return the built-in provider catalogue (Groq, OpenAI, Anthropic, etc.)."""
    return get_provider_catalogue()


@router.get("/tools")
def list_tools():
    """Return all available built-in tools."""
    return get_available_tools()


# ── Org-Configured Custom Providers (CRUD) ───────────────────────────────────

@router.get("/custom", response_model=List[LLMProviderResponse])
def list_custom_providers(db: Session = Depends(get_db)):
    """
    Return all org-configured custom LLM providers.
    API keys are masked in the response.
    """
    rows = db.query(LLMProvider).order_by(LLMProvider.created_at.desc()).all()
    return [LLMProviderResponse.from_orm_masked(r) for r in rows]


@router.post("/custom", response_model=LLMProviderResponse, status_code=201)
def create_custom_provider(payload: LLMProviderCreate, db: Session = Depends(get_db)):
    """Add a new custom LLM provider (e.g. Azure OpenAI, Ollama, vLLM)."""
    # Ensure provider_key is unique
    existing = db.query(LLMProvider).filter(
        LLMProvider.provider_key == payload.provider_key
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A provider with key '{payload.provider_key}' already exists."
        )

    # If this is being set as default, clear any existing default
    if payload.is_default:
        db.query(LLMProvider).filter(LLMProvider.is_default == True).update(  # noqa: E712
            {"is_default": False}
        )

    provider = LLMProvider(**payload.model_dump())
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return LLMProviderResponse.from_orm_masked(provider)


@router.get("/custom/{provider_id}", response_model=LLMProviderResponse)
def get_custom_provider(provider_id: str, db: Session = Depends(get_db)):
    provider = db.query(LLMProvider).filter(LLMProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Custom provider not found")
    return LLMProviderResponse.from_orm_masked(provider)


@router.patch("/custom/{provider_id}", response_model=LLMProviderResponse)
def update_custom_provider(provider_id: str, payload: LLMProviderUpdate, db: Session = Depends(get_db)):
    """Update a custom provider's config (URL, key, models, enabled status)."""
    provider = db.query(LLMProvider).filter(LLMProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Custom provider not found")

    updates = payload.model_dump(exclude_none=True)

    # If setting as default, clear existing default
    if updates.get("is_default"):
        db.query(LLMProvider).filter(
            LLMProvider.is_default == True,  # noqa: E712
            LLMProvider.id != provider_id
        ).update({"is_default": False})

    for k, v in updates.items():
        setattr(provider, k, v)
    provider.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(provider)
    return LLMProviderResponse.from_orm_masked(provider)


@router.delete("/custom/{provider_id}", status_code=204)
def delete_custom_provider(provider_id: str, db: Session = Depends(get_db)):
    provider = db.query(LLMProvider).filter(LLMProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Custom provider not found")
    db.delete(provider)
    db.commit()


# ── Test Connection ───────────────────────────────────────────────────────────

@router.post("/test-connection")
async def test_connection(payload: TestConnectionRequest):
    """
    Validate that an OpenAI-compatible endpoint is reachable and accepts requests.
    Sends a minimal chat completion to verify the URL + key combination works.
    """
    url = payload.base_url.rstrip("/") + "/chat/completions"
    headers = {"Content-Type": "application/json"}
    if payload.api_key:
        headers["Authorization"] = f"Bearer {payload.api_key}"

    body = {
        "model": payload.model,
        "messages": [{"role": "user", "content": "Say 'ok'"}],
        "max_tokens": 5,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, json=body, headers=headers)

        if res.status_code in (200, 201):
            return {"success": True, "message": "Connection successful ✅"}
        else:
            detail = res.json().get("error", {}).get("message", res.text[:200])
            return {"success": False, "message": f"HTTP {res.status_code}: {detail}"}

    except httpx.ConnectError:
        return {"success": False, "message": f"Cannot reach {payload.base_url} — check the URL and network"}
    except httpx.TimeoutException:
        return {"success": False, "message": "Request timed out after 15s — endpoint too slow or unreachable"}
    except Exception as e:
        return {"success": False, "message": str(e)}

