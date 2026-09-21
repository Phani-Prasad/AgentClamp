"""
SQLAlchemy Models — AgentClamp
Supports SQLite (local) and PostgreSQL (cloud) via DATABASE_URL env var.
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean,
    DateTime, JSON, ForeignKey
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()


def _uuid() -> str:
    return str(uuid.uuid4())

# ── User (Authentication) ──────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id              = Column(String, primary_key=True, default=_uuid)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    full_name       = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active       = Column(Boolean, default=True)
    is_approved     = Column(Boolean, default=False)   # Must be True to login
    role            = Column(String(50), default="user")  # "user" | "admin"
    created_at      = Column(DateTime, default=datetime.utcnow)


# ── LLM Provider (Org-Configured) ─────────────────────────────

class LLMProvider(Base):
    """
    Org-configured LLM provider.
    Orgs can add any OpenAI-compatible endpoint (Azure OpenAI, Ollama,
    vLLM, LM Studio, Together AI, custom deployments, etc.)
    """
    __tablename__ = "llm_providers"

    id           = Column(String, primary_key=True, default=_uuid)
    name         = Column(String(100), nullable=False)           # Display name, e.g. "Azure GPT-4o"
    provider_key = Column(String(50), nullable=False)            # Internal key, e.g. "azure_gpt4o"
    base_url     = Column(String(500), nullable=False)           # e.g. https://myorg.openai.azure.com/openai
    api_key      = Column(Text, nullable=True)                   # Stored as plaintext (use vault in prod)
    models       = Column(JSON, default=list)                    # ["gpt-4o", "gpt-4-turbo"]
    is_enabled   = Column(Boolean, default=True)
    is_default   = Column(Boolean, default=False)                # Org-wide default provider
    notes        = Column(Text, default="")                      # e.g. "Azure deployment for Finance dept"
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── Agent ──────────────────────────────────────────────────────

class Agent(Base):
    __tablename__ = "agents"

    id               = Column(String, primary_key=True, default=_uuid)
    name             = Column(String(255), nullable=False)
    description      = Column(Text, default="")
    system_prompt    = Column(Text, default="You are a helpful AI assistant.")

    # LLM config
    provider         = Column(String(50), default="groq")
    model            = Column(String(100), default="llama-3.3-70b-versatile")
    temperature      = Column(Float, default=0.7)
    max_iterations   = Column(Integer, default=10)

    # Features
    tools            = Column(JSON, default=list)   # ["web_search", "calculator", ...]
    knowledge_base_id = Column(String, ForeignKey("knowledge_bases.id"), nullable=True)
    guardrails_config = Column(JSON, default=dict)  # Guardrails AI config
    graph_definition  = Column(JSON, default=dict)  # React Flow graph JSON

    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    runs             = relationship("AgentRun", back_populates="agent", cascade="all, delete")
    knowledge_base   = relationship("KnowledgeBase", back_populates="agents")


# ── Agent Run ──────────────────────────────────────────────────

class AgentRun(Base):
    __tablename__ = "agent_runs"

    id           = Column(String, primary_key=True, default=_uuid)
    agent_id     = Column(String, ForeignKey("agents.id"), nullable=False)

    status       = Column(String(20), default="pending")  # pending|running|completed|failed
    input        = Column(Text)
    output       = Column(Text)
    trace        = Column(JSON, default=list)    # Step-by-step execution trace
    token_usage  = Column(JSON, default=dict)    # {prompt_tokens, completion_tokens, total}
    cost_usd     = Column(Float, default=0.0)    # Estimated cost in USD
    provider     = Column(String(50))
    model        = Column(String(100))
    duration_ms  = Column(Integer)
    error        = Column(Text, nullable=True)
    langsmith_url = Column(String(500), nullable=True)

    created_at   = Column(DateTime, default=datetime.utcnow)

    # Relationships
    agent        = relationship("Agent", back_populates="runs")


# ── Knowledge Base ─────────────────────────────────────────────

class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id              = Column(String, primary_key=True, default=_uuid)
    name            = Column(String(255), nullable=False)
    description     = Column(Text, default="")
    embedding_model = Column(String(100), default="all-MiniLM-L6-v2")
    chunk_size      = Column(Integer, default=512)
    chunk_overlap   = Column(Integer, default=50)
    document_count  = Column(Integer, default=0)
    created_at      = Column(DateTime, default=datetime.utcnow)

    # Relationships
    documents       = relationship("Document", back_populates="knowledge_base", cascade="all, delete")
    agents          = relationship("Agent", back_populates="knowledge_base")


class Document(Base):
    __tablename__ = "documents"

    id                = Column(String, primary_key=True, default=_uuid)
    knowledge_base_id = Column(String, ForeignKey("knowledge_bases.id"), nullable=False)
    filename          = Column(String(255))
    content_type      = Column(String(100))
    size_bytes        = Column(Integer, default=0)
    chunk_count       = Column(Integer, default=0)
    status            = Column(String(20), default="processing")  # processing|ready|error
    error             = Column(Text, nullable=True)
    created_at        = Column(DateTime, default=datetime.utcnow)

    # Relationships
    knowledge_base    = relationship("KnowledgeBase", back_populates="documents")


# ── Governance Policy (Dynamic Policy Builder) ─────────────────

class GovernancePolicy(Base):
    """
    User-defined governance policy rule for the Dynamic Policy Builder.
    Evaluated dynamically at runtime against agent prompts/outputs.
    """
    __tablename__ = "governance_policies"

    id             = Column(String, primary_key=True, default=_uuid)
    name           = Column(String(255), nullable=False)
    description    = Column(Text, default="")
    is_active      = Column(Boolean, default=True)
    severity       = Column(String(20), default="medium")  # critical|high|medium|low

    # Scope: null = applies to ALL agents
    scope_agent_id = Column(String, ForeignKey("agents.id", ondelete="SET NULL"), nullable=True)

    # Trigger: what condition to detect
    trigger_type   = Column(String(50), nullable=False)   # keyword|regex|cost_threshold|tool_call
    trigger_value  = Column(Text, nullable=False)          # e.g. "SSN", r"\d{16}", "2.50", "write_file"

    # Action: what to do when triggered
    action         = Column(String(50), nullable=False)   # block|mask|hitl|alert|redact

    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    scope_agent    = relationship("Agent", foreign_keys=[scope_agent_id])


# ── Audit Log ─────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id         = Column(String, primary_key=True, default=_uuid)
    action     = Column(String(100))   # "agent.create", "agent.run", "kb.upload"
    resource   = Column(String(100))   # resource type
    resource_id = Column(String)
    details    = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── EU AI Act Risk Classification (per Agent) ─────────────────

class AgentRiskClassification(Base):
    """
    Stores the EU AI Act risk tier classification for each agent.
    Risk Tiers: unacceptable | high | limited | minimal
    """
    __tablename__ = "agent_risk_classifications"

    id              = Column(String, primary_key=True, default=_uuid)
    agent_id        = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, unique=True)

    # EU AI Act Risk Tier
    risk_tier       = Column(String(20), default="minimal")  # unacceptable|high|limited|minimal
    rationale       = Column(Text, default="")               # Explanation of classification
    use_case        = Column(String(255), default="")        # e.g. "Customer support chatbot"
    sector          = Column(String(100), default="")        # e.g. "Finance", "Healthcare", "HR"

    # Mandatory controls checklist (JSON booleans)
    controls        = Column(JSON, default=dict)
    # {
    #   "human_oversight": False,      # Art. 14 - Human Oversight
    #   "logging_traceability": False, # Art. 12 - Logging & Traceability
    #   "transparency": False,         # Art. 13 - Transparency
    #   "accuracy_robustness": False,  # Art. 15 - Accuracy & Robustness
    #   "data_governance": False,      # Art. 10 - Data & Data Governance
    # }

    classified_by   = Column(String(255), default="auto")    # "auto" or user email
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    agent           = relationship("Agent", foreign_keys=[agent_id])


# ── Compliance Assessment (Point-in-Time Audit) ───────────────

class ComplianceAssessment(Base):
    """
    Stores point-in-time compliance audit results mapped to
    NIST AI RMF, ISO 42001, ISO 23894, and EU AI Act controls.
    """
    __tablename__ = "compliance_assessments"

    id              = Column(String, primary_key=True, default=_uuid)
    framework       = Column(String(50), nullable=False)  # nist_ai_rmf|iso_42001|iso_23894|eu_ai_act
    overall_score   = Column(Float, default=0.0)          # 0.0 - 100.0 readiness score
    controls_total  = Column(Integer, default=0)
    controls_passed = Column(Integer, default=0)

    # Detailed control results (JSON array of control objects)
    control_results = Column(JSON, default=list)
    # [{ "id": "GOVERN-1.1", "title": "...", "status": "pass|fail|partial", "evidence": "..." }]

    findings        = Column(Text, default="")            # Summary of key findings
    recommendations = Column(Text, default="")            # Remediation recommendations
    assessed_by     = Column(String(255), default="auto")

    created_at      = Column(DateTime, default=datetime.utcnow)

