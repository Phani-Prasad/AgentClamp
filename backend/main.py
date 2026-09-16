"""
AgentClamp — FastAPI Application Entry Point
"""

import os
from dotenv import load_dotenv
load_dotenv()

# ── Ultra-Light Startup ───────────────────────────────────────
from fastapi import FastAPI, Request
from contextlib import asynccontextmanager

_initialized = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _initialized
    print("\n" + "=" * 30)
    print("  AGENTCLAMP IS LIVE!")
    # Lazy load the real stuff
    try:
        from db.database import init_db
        init_db()
        print("[DB] Database initialized")
    except Exception as e:
        print(f"[DB] Database warning: {e}")
        
    try:
        import traceback
        from core.guardrails_engine import GuardrailsEngine
        print("[Guardrails] Guardrails Engine: Loaded")
    except Exception as e:
        print(f"[Guardrails] Guardrails not ready: {e}")
        traceback.print_exc()
        
    _initialized = True
    yield

app = FastAPI(title="AgentClamp Platform", lifespan=lifespan)

# Manual CORS — MUST be first
@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        from fastapi.responses import Response
        res = Response()
    else:
        res = await call_next(request)
    res.headers["Access-Control-Allow-Origin"] = "*"
    res.headers["Access-Control-Allow-Methods"] = "*"
    res.headers["Access-Control-Allow-Headers"] = "*"
    return res

@app.get("/health")
def health():
    return {"status": "ok", "init": _initialized}

from api.agents import router as r1
from api.runs import router as r2
from api.knowledge_bases import router as r3
from api.providers import router as r4
from api.websocket import router as r5
from api.analytics import router as r6
from api.governance import router as r7
from api.auth import router as r8

app.include_router(r1, prefix="/api/v1")
app.include_router(r2, prefix="/api/v1")
app.include_router(r3, prefix="/api/v1")
app.include_router(r4, prefix="/api/v1")
app.include_router(r6, prefix="/api/v1")
app.include_router(r7, prefix="/api/v1")
app.include_router(r8, prefix="/api/v1")
app.include_router(r5)

print("[Router] All routers loaded successfully")

# ── Dev runner ────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
