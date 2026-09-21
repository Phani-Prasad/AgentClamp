"""
Database Connection — AgentClamp
Supports SQLite (local dev) and PostgreSQL (cloud) via DATABASE_URL env var.
"""

import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from .models import Base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./agentclamp.db")

# SQLite needs check_same_thread=False; PostgreSQL doesn't
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _safe_add_column(conn, ddl: str):
    """Execute a DDL statement, silently ignore if column already exists."""
    try:
        conn.execute(text(ddl))
        conn.commit()
    except Exception:
        pass  # Column already exists — safe to ignore


DEFAULT_AGENTS = [
    {
        "id": "315a66a2-e661-402f-9859-9afc8065cb15",
        "name": "Search",
        "description": "Web searching for information and enterprise intelligence",
        "system_prompt": (
            "You are an Enterprise Web Search Agent responsible for retrieving accurate, relevant, and trustworthy information from the web.\n\n"
            "Your objectives are to:\n1. Understand the user's intent before searching.\n"
            "2. Prioritize official documentation, government websites, and reputable publications.\n"
            "3. Verify information by comparing multiple sources.\n"
            "4. Provide concise summaries followed by detailed explanations.\n"
            "5. Always cite the sources used."
        ),
        "provider": "groq",
        "model": "llama-3.3-70b-versatile",
        "temperature": 0.7,
        "tools": ["web_search", "get_current_datetime"],
        "guardrails_config": {
            "pii_detection": False,
            "prompt_injection": False,
            "bias_detection": False,
            "hallucination_check": False,
            "data_compliance": False,
            "regulatory_disclaimer": False,
            "competitors": []
        }
    },
    {
        "id": "758bf2d4-feb1-4e30-adab-3012861241d2",
        "name": "Finance agent",
        "description": "Financial domain expert with market analytics and regulatory compliance.",
        "system_prompt": "You are a senior financial analyst and compliance expert. Provide accurate, structured financial insights with appropriate risk disclosures.",
        "provider": "groq",
        "model": "llama-3.3-70b-versatile",
        "temperature": 0.7,
        "tools": ["web_search", "get_current_datetime", "calculator"],
        "guardrails_config": {
            "pii_detection": True,
            "prompt_injection": True,
            "bias_detection": False,
            "hallucination_check": False,
            "data_compliance": True,
            "regulatory_disclaimer": True,
            "competitors": ["tesla"]
        }
    },
    {
        "id": "282d01a0-05b4-4172-b2fe-b8855056004f",
        "name": "Calculate Agent",
        "description": "Intelligent arithmetic and mathematical calculation assistant.",
        "system_prompt": "You are an intelligent Calculator Agent responsible for solving mathematical, numerical, and statistical problems accurately.",
        "provider": "groq",
        "model": "llama-3.3-70b-versatile",
        "temperature": 0.2,
        "tools": ["calculator"],
        "guardrails_config": {
            "pii_detection": True,
            "prompt_injection": True,
            "bias_detection": False,
            "hallucination_check": False,
            "data_compliance": False,
            "regulatory_disclaimer": False,
            "competitors": []
        }
    }
]


def init_db() -> None:
    """Create all tables then run lightweight column migrations and auto-seed default agents."""
    from .models import Agent
    Base.metadata.create_all(bind=engine)

    with engine.connect() as conn:
        # Add is_approved (existing users get True so they aren't locked out)
        _safe_add_column(conn, "ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT 1")
        try:
            conn.execute(text("UPDATE users SET is_approved = 1 WHERE is_approved IS NULL"))
            conn.commit()
        except Exception:
            pass

        # Add role
        _safe_add_column(conn, "ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user'")
        try:
            conn.execute(text("UPDATE users SET role = 'user' WHERE role IS NULL"))
            conn.commit()
        except Exception:
            pass

    # Auto-seed default agents if database is empty (e.g. fresh Render container)
    db: Session = SessionLocal()
    try:
        if db.query(Agent).count() == 0:
            for agent_data in DEFAULT_AGENTS:
                agent = Agent(**agent_data)
                db.add(agent)
            db.commit()
            print(f"[DB Seed] Auto-seeded {len(DEFAULT_AGENTS)} default agents.")
    except Exception as e:
        print(f"[DB Seed] Notice: {e}")
        db.rollback()
    finally:
        db.close()


def get_db():
    """FastAPI dependency — yields a DB session and closes it after the request."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
