"""
Multi-Provider LLM Client — AgentClamp
Routes to Groq, OpenAI, Anthropic, Google, Ollama via a single interface.
All providers use the OpenAI-compatible ChatOpenAI wrapper for LangChain.
"""

import os
from typing import Optional
from langchain_openai import ChatOpenAI

# ── Provider catalogue ─────────────────────────────────────────

PROVIDER_CATALOGUE = {
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "env_key": "GROQ_API_KEY",
        "models": [
            "groq/compound-mini",
            "groq/compound",
            "qwen/qwen3.8-27b",
            "openai/gpt-oss-20b",
            "openai/gpt-oss-120b",
        ],
        "label": "Groq (Free)",
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "env_key": "OPENAI_API_KEY",
        "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini"],
        "label": "OpenAI",
    },
    "anthropic": {
        "base_url": "https://api.anthropic.com/v1",
        "env_key": "ANTHROPIC_API_KEY",
        "models": [
            "claude-3-5-sonnet-20241022",
            "claude-3-haiku-20240307",
            "claude-3-opus-20240229",
        ],
        "label": "Anthropic",
    },
    "google": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
        "env_key": "GOOGLE_API_KEY",
        "models": ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
        "label": "Google Gemini",
    },
    "ollama": {
        "base_url": "http://localhost:11434/v1",
        "env_key": None,   # No key needed
        "models": ["llama3.2", "qwen2.5", "mistral", "phi4"],
        "label": "Ollama (Local)",
    },
    "together": {
        "base_url": "https://api.together.xyz/v1",
        "env_key": "TOGETHER_API_KEY",
        "models": [
            "meta-llama/Llama-3-70b-chat-hf",
            "mistralai/Mixtral-8x7B-Instruct-v0.1",
        ],
        "label": "Together AI",
    },
}


# ── Factory ────────────────────────────────────────────────────

def get_langchain_llm(
    provider: str,
    model: str,
    temperature: float = 0.7,
    api_key: Optional[str] = None,   # BYOK — overrides env var
) -> ChatOpenAI:
    """
    Return a LangChain ChatOpenAI instance pointing at the correct provider.
    All providers expose an OpenAI-compatible endpoint, so one class covers all.
    Supports both built-in catalogue and custom DB-stored providers.
    """
    # 1. Check if it is a custom provider stored in the DB
    custom_db_provider = None
    try:
        from db.database import SessionLocal
        from db.models import LLMProvider
        db = SessionLocal()
        try:
            custom_db_provider = db.query(LLMProvider).filter(
                (LLMProvider.provider_key == provider) | (LLMProvider.id == provider)
            ).first()
        finally:
            db.close()
    except Exception as e:
        print(f"[LLM Client] Database read error for custom provider: {e}")

    if custom_db_provider:
        resolved_key = api_key or custom_db_provider.api_key
        # Check if key is needed
        if not resolved_key and provider != "ollama" and "ollama" not in custom_db_provider.base_url:
            raise ValueError(
                f"No API key provided for custom provider '{custom_db_provider.name}'."
            )
        return ChatOpenAI(
            base_url=custom_db_provider.base_url,
            api_key=resolved_key or "ollama",
            model=model,
            temperature=temperature,
            streaming=True,
        )

    # 2. Fallback to built-in catalogue
    config = PROVIDER_CATALOGUE.get(provider)
    if not config:
        raise ValueError(f"Unknown provider: '{provider}'. Valid: {list(PROVIDER_CATALOGUE)}")

    # Resolve API key: BYOK > env var > placeholder for Ollama
    resolved_key = api_key or (os.getenv(config["env_key"]) if config["env_key"] else None)
    
    if not resolved_key:
        if provider == "ollama":
            resolved_key = "ollama"   # Ollama ignores the key value
        else:
            raise ValueError(
                f"No API key for provider '{provider}'. "
                f"Set {config['env_key']} in .env or pass api_key."
            )

    # Resolve local/Docker URL for Ollama if needed
    base_url = config["base_url"]
    if provider == "ollama":
        base_url = os.getenv("OLLAMA_BASE_URL", base_url)

    return ChatOpenAI(
        base_url=base_url,
        api_key=resolved_key,
        model=model,
        temperature=temperature,
        streaming=True,
    )


def get_provider_catalogue() -> dict:
    """Return the provider catalogue (for the frontend model selector) merging custom DB providers."""
    catalogue = {
        provider: {
            "label": cfg["label"],
            "models": cfg["models"],
            "requires_key": cfg["env_key"] is not None,
            "key_configured": bool(
                cfg["env_key"] and os.getenv(cfg["env_key"])
            ),
        }
        for provider, cfg in PROVIDER_CATALOGUE.items()
    }

    # Merge custom providers from database
    try:
        from db.database import SessionLocal
        from db.models import LLMProvider
        db = SessionLocal()
        try:
            custom_rows = db.query(LLMProvider).filter(LLMProvider.is_enabled == True).all()  # noqa: E712
            for row in custom_rows:
                catalogue[row.provider_key] = {
                    "label": f"{row.name} (Custom)",
                    "models": row.models or [],
                    "requires_key": True,
                    "key_configured": bool(row.api_key),
                    "is_custom": True,
                    "id": row.id,
                }
        finally:
            db.close()
    except Exception as e:
        print(f"[LLM Client] Error loading custom providers: {e}")

    return catalogue

