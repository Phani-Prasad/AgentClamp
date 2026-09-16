from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PolicyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = ""
    is_active: bool = True
    severity: str = "medium"
    scope_agent_id: Optional[str] = None
    trigger_type: str
    trigger_value: str = Field(..., min_length=1)
    action: str


class PolicyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    severity: Optional[str] = None
    scope_agent_id: Optional[str] = None
    trigger_type: Optional[str] = None
    trigger_value: Optional[str] = None
    action: Optional[str] = None


class PolicyResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    is_active: bool
    severity: str
    scope_agent_id: Optional[str]
    trigger_type: str
    trigger_value: str
    action: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class PolicyTestRequest(BaseModel):
    trigger_type: str
    trigger_value: str = Field(..., min_length=1)
    action: str
    sample_text: str = Field(..., min_length=1)
    sample_cost: Optional[float] = 0.0


class PolicyTestResponse(BaseModel):
    matched: bool
    action_taken: Optional[str]
    result_text: Optional[str]
    match_detail: Optional[str]
