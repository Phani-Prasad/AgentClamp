from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class RunRequest(BaseModel):
    message: str
    provider: Optional[str] = None   # Override agent's provider
    model: Optional[str] = None      # Override agent's model
    api_key: Optional[str] = None    # BYOK — user's own API key


class TraceStep(BaseModel):
    type: str          # "token" | "tool_start" | "tool_end" | "error"
    tool: Optional[str] = None
    input: Optional[Any] = None
    output: Optional[str] = None
    content: Optional[str] = None
    timestamp: float


class RunResponse(BaseModel):
    id: str
    agent_id: str
    status: str
    input: Optional[str]
    output: Optional[str]
    trace: List[Dict[str, Any]]
    token_usage: Dict[str, Any]
    cost_usd: float
    provider: Optional[str]
    model: Optional[str]
    duration_ms: Optional[int]
    error: Optional[str]
    langsmith_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
