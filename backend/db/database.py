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


def init_db() -> None:
    """Create all tables then run lightweight column migrations."""
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


def get_db():
    """FastAPI dependency — yields a DB session and closes it after the request."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
