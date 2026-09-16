from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class AgentCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    system_prompt: Optional[str] = "You are a helpful AI assistant."
    provider: str = "groq"
    model: str = "llama-3.3-70b-versatile"
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_iterations: int = Field(default=10, ge=1, le=50)
    tools: List[str] = []
    knowledge_base_id: Optional[str] = None
    guardrails_config: Dict[str, Any] = {}
    graph_definition: Dict[str, Any] = {}


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_iterations: Optional[int] = None
    tools: Optional[List[str]] = None
    knowledge_base_id: Optional[str] = None
    guardrails_config: Optional[Dict[str, Any]] = None
    graph_definition: Optional[Dict[str, Any]] = None


class AgentResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    system_prompt: Optional[str]
    provider: str
    model: str
    temperature: float
    max_iterations: int
    tools: List[str]
    knowledge_base_id: Optional[str]
    guardrails_config: Dict[str, Any]
    graph_definition: Dict[str, Any]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
