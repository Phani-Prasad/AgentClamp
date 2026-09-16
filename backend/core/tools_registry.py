"""
Built-in Tools Registry — AgentClamp
Returns LangChain-compatible tools by name for use in LangGraph agents.
"""

import math
from typing import List, Optional
from langchain_core.tools import tool
from duckduckgo_search import DDGS


# ── Tool Definitions ──────────────────────────────────────────

@tool
def web_search(query: str) -> str:
    """Search the web for current information using DuckDuckGo.
    Use this when you need up-to-date facts, news, or information not in your training data.
    Input: a clear search query string.
    """
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=5))
        if not results:
            return "No results found."
        return "\n\n".join(
            f"**{r['title']}**\n{r['href']}\n{r['body']}" for r in results
        )
    except Exception as e:
        return f"Search error: {str(e)}"


@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression safely.
    Supports: +, -, *, /, **, sqrt, sin, cos, tan, log, abs, round.
    Example input: '2 ** 10' or 'sqrt(144)'.
    """
    allowed = {
        "__builtins__": {},
        "sqrt": math.sqrt, "sin": math.sin, "cos": math.cos,
        "tan": math.tan, "log": math.log, "log10": math.log10,
        "abs": abs, "round": round, "pow": pow, "pi": math.pi, "e": math.e,
    }
    try:
        result = eval(expression, allowed)  # noqa: S307
        return str(result)
    except Exception as e:
        return f"Calculation error: {str(e)}"


@tool
def get_current_datetime() -> str:
    """Return the current date and time in ISO format."""
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


@tool
def format_json(data: str) -> str:
    """Pretty-print a JSON string. Useful for formatting API responses."""
    import json
    try:
        parsed = json.loads(data)
        return json.dumps(parsed, indent=2)
    except Exception as e:
        return f"JSON error: {str(e)}"


# ── Registry ─────────────────────────────────────────────────

TOOL_REGISTRY = {
    "web_search":          web_search,
    "calculator":          calculator,
    "get_current_datetime": get_current_datetime,
    "format_json":         format_json,
}

TOOL_METADATA = {
    "web_search": {
        "label": "Web Search",
        "description": "Search the web via DuckDuckGo (no API key needed)",
        "icon": "🔍",
        "requires_config": False,
    },
    "calculator": {
        "label": "Calculator",
        "description": "Evaluate math expressions",
        "icon": "🔢",
        "requires_config": False,
    },
    "get_current_datetime": {
        "label": "Date & Time",
        "description": "Get the current UTC date and time",
        "icon": "🕐",
        "requires_config": False,
    },
    "format_json": {
        "label": "JSON Formatter",
        "description": "Pretty-print JSON strings",
        "icon": "📋",
        "requires_config": False,
    },
    "rag_retrieval": {
        "label": "RAG Retrieval",
        "description": "Retrieve context from a knowledge base",
        "icon": "📚",
        "requires_config": True,   # Needs a knowledge_base_id
    },
}


def get_tools_for_agent(
    tool_names: List[str],
    kb_id: Optional[str] = None,
) -> list:
    """
    Resolve a list of tool names to LangChain tool instances.
    RAG retrieval is injected dynamically when kb_id is provided.
    """
    resolved = []
    for name in tool_names:
        if name == "rag_retrieval":
            if kb_id:
                from core.rag_engine import build_rag_tool
                resolved.append(build_rag_tool(kb_id))
        elif name in TOOL_REGISTRY:
            resolved.append(TOOL_REGISTRY[name])
    return resolved


def get_available_tools() -> dict:
    """Return tool metadata for the frontend tool palette."""
    return TOOL_METADATA
