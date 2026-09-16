"""
Knowledge Bases API — Upload documents and manage KB collections.
"""

import os
import shutil
import tempfile

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from db.database import get_db
from db.models import KnowledgeBase, Document
from schemas.knowledge_base import (
    KnowledgeBaseCreate, KnowledgeBaseUpdate,
    KnowledgeBaseResponse, DocumentResponse,
)
# Lazy imports in endpoints to speed up server startup

router = APIRouter(prefix="/knowledge-bases", tags=["Knowledge Bases"])

ALLOWED_TYPES = {
    "application/pdf", "text/plain", "text/markdown",
    "application/octet-stream",  # fallback for .md files
}


# ── Knowledge Base CRUD ───────────────────────────────────────

@router.get("/", response_model=List[KnowledgeBaseResponse])
def list_kbs(db: Session = Depends(get_db)):
    return db.query(KnowledgeBase).order_by(KnowledgeBase.created_at.desc()).all()


@router.post("/", response_model=KnowledgeBaseResponse, status_code=201)
def create_kb(payload: KnowledgeBaseCreate, db: Session = Depends(get_db)):
    kb = KnowledgeBase(**payload.model_dump())
    db.add(kb)
    db.commit()
    db.refresh(kb)
    return kb


@router.get("/{kb_id}", response_model=KnowledgeBaseResponse)
def get_kb(kb_id: str, db: Session = Depends(get_db)):
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise HTTPException(404, "Knowledge base not found")
    return kb


@router.patch("/{kb_id}", response_model=KnowledgeBaseResponse)
def update_kb(kb_id: str, payload: KnowledgeBaseUpdate, db: Session = Depends(get_db)):
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise HTTPException(404, "Knowledge base not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(kb, k, v)
    db.commit()
    db.refresh(kb)
    return kb


@router.delete("/{kb_id}", status_code=204)
def delete_kb_endpoint(kb_id: str, db: Session = Depends(get_db)):
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise HTTPException(404, "Knowledge base not found")
    from core.rag_engine import delete_kb
    delete_kb(kb_id)   # Remove ChromaDB collection
    db.delete(kb)
    db.commit()


# ── Document Upload ───────────────────────────────────────────

@router.get("/{kb_id}/documents", response_model=List[DocumentResponse])
def list_documents(kb_id: str, db: Session = Depends(get_db)):
    return db.query(Document).filter(Document.knowledge_base_id == kb_id).all()


@router.post("/{kb_id}/documents", response_model=DocumentResponse, status_code=201)
async def upload_document(
    kb_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise HTTPException(404, "Knowledge base not found")

    content_type = file.content_type or "application/octet-stream"

    # Create DB record
    doc = Document(
        knowledge_base_id=kb_id,
        filename=file.filename,
        content_type=content_type,
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Save to temp file and ingest
    try:
        suffix = os.path.splitext(file.filename)[-1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        doc.size_bytes = os.path.getsize(tmp_path)
        from core.rag_engine import ingest_document
        chunk_count = ingest_document(
            kb_id=kb_id,
            file_path=tmp_path,
            content_type=content_type,
            chunk_size=kb.chunk_size,
            chunk_overlap=kb.chunk_overlap,
        )
        doc.chunk_count = chunk_count
        doc.status = "ready"
        kb.document_count += 1

    except Exception as exc:
        doc.status = "error"
        doc.error = str(exc)
    finally:
        os.unlink(tmp_path)
        db.commit()
        db.refresh(doc)

    return doc


@router.delete("/{kb_id}/documents/{doc_id}", status_code=204)
def delete_document(kb_id: str, doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(
        Document.id == doc_id, Document.knowledge_base_id == kb_id
    ).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    db.delete(doc)
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if kb and kb.document_count > 0:
        kb.document_count -= 1
    db.commit()
