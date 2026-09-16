# ─────────────────────────────────────────────
#  AgentClamp — Backend Dockerfile
#  Python 3.12 + FastAPI + LangGraph + Guardrails
# ─────────────────────────────────────────────

FROM python:3.12-slim

# Non-root user (enterprise security requirement)
RUN groupadd -r agentclamp && useradd -r -g agentclamp agentclamp

# System dependencies for:
#   - sentence-transformers (build tools)
#   - presidio/spacy (libgomp for tokenizer)
#   - chromadb (sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer cache — only rebuilds if requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download spaCy model so guardrails work at cold start (no internet needed at runtime)
RUN python -m spacy download en_core_web_lg

# Copy application code
COPY . .

# Create directories for persistent data (will be overridden by Docker volumes)
RUN mkdir -p /app/data /app/chroma_db /app/output \
    && chown -R agentclamp:agentclamp /app

# Switch to non-root user
USER agentclamp

# Health check — Docker will restart container if backend goes unhealthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
