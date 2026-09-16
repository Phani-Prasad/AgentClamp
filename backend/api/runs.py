"""
Runs API — Fetch run history and results.
WebSocket streaming is in websocket.py.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from db.database import get_db
from db.models import AgentRun
from schemas.run import RunResponse

router = APIRouter(prefix="/runs", tags=["Runs"])


@router.get("/", response_model=List[RunResponse])
def list_runs(agent_id: str = None, limit: int = 50, db: Session = Depends(get_db)):
    q = db.query(AgentRun).order_by(AgentRun.created_at.desc())
    if agent_id:
        q = q.filter(AgentRun.agent_id == agent_id)
    return q.limit(limit).all()


@router.get("/{run_id}", response_model=RunResponse)
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.delete("/{run_id}", status_code=204)
def delete_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    db.delete(run)
    db.commit()
