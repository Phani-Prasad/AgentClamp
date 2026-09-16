"""
RAG Engine — AgentClamp
Document ingestion + retrieval via ChromaDB and sentence-transformers.
"""

import os
from typing import List, Optional
from langchain_core.tools import tool
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    PyPDFLoader, TextLoader
)

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
EMBEDDING_MODEL    = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

_embeddings_cache: Optional[HuggingFaceEmbeddings] = None


def _get_embeddings() -> HuggingFaceEmbeddings:
    """Lazy-load embeddings model (cached after first load)."""
    global _embeddings_cache
    if _embeddings_cache is None:
        _embeddings_cache = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"},
        )
    return _embeddings_cache


def _get_vectorstore(kb_id: str) -> Chroma:
    return Chroma(
        collection_name=f"kb_{kb_id}",
        embedding_function=_get_embeddings(),
        persist_directory=CHROMA_PERSIST_DIR,
    )


# ── Ingestion ─────────────────────────────────────────────────

def ingest_document(
    kb_id: str,
    file_path: str,
    content_type: str,
    chunk_size: int = 512,
    chunk_overlap: int = 50,
) -> int:
    """
    Load, split, embed, and store a document in ChromaDB.
    Returns the number of chunks created.
    """
    # Load
    if content_type == "application/pdf" or file_path.endswith(".pdf"):
        loader = PyPDFLoader(file_path)
    else:
        loader = TextLoader(file_path, encoding="utf-8")

    docs = loader.load()

    # Split
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size, chunk_overlap=chunk_overlap
    )
    chunks = splitter.split_documents(docs)

    if not chunks:
        return 0

    # Store
    vs = _get_vectorstore(kb_id)
    vs.add_documents(chunks)

    return len(chunks)


def delete_kb(kb_id: str) -> None:
    """Delete all vectors for a knowledge base."""
    vs = _get_vectorstore(kb_id)
    vs.delete_collection()


# ── Retrieval Tool (injected into LangGraph) ──────────────────

def build_rag_tool(kb_id: str):
    """
    Dynamically build a LangChain tool for retrieving from a specific KB.
    Returned tool is injected into LangGraph's tool node.
    """
    vs = _get_vectorstore(kb_id)

    @tool
    def rag_retrieval(query: str) -> str:
        """Search the knowledge base for relevant information.
        Use this tool when the user asks about documents, policies, manuals,
        or any content that may be stored in the knowledge base.
        Input: a clear search query.
        """
        try:
            docs = vs.similarity_search(query, k=4)
            if not docs:
                return "No relevant documents found."
            return "\n\n---\n\n".join(
                f"[Source: {os.path.basename(d.metadata.get('source', 'unknown'))}]\n{d.page_content}"
                for d in docs
            )
        except Exception as e:
            return f"Retrieval error: {str(e)}"

    return rag_retrieval
