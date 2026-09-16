"""
LangGraph Agent Runner — AgentClamp
Executes agents as stateful ReAct graphs with real-time streaming.
"""

import time
import uuid
import asyncio
from typing import AsyncGenerator, Optional, List

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from typing import TypedDict, Annotated, Sequence
import operator

from core.litellm_client import get_langchain_llm
from core.tools_registry import get_tools_for_agent
from langchain_core.messages import BaseMessage
from core.guardrails_engine import GuardrailsEngine


# ── Graph State ───────────────────────────────────────────────

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]


# ── Runner ────────────────────────────────────────────────────

class LangGraphRunner:
    """
    Wraps a LangGraph ReAct agent graph.
    Supports streaming via astream_events so the frontend sees
    tokens and tool calls in real time over WebSocket.
    """

    def __init__(self, agent_config: dict, api_key: Optional[str] = None):
        self.agent_config = agent_config
        self.api_key = api_key
        self.guardrails = GuardrailsEngine(agent_config.get("guardrails_config", {}))

    def _build_graph(self, tools: list):
        llm = get_langchain_llm(
            provider=self.agent_config.get("provider", "groq"),
            model=self.agent_config.get("model", "llama-3.3-70b-versatile"),
            temperature=self.agent_config.get("temperature", 0.7),
            api_key=self.api_key,
        )

        llm_with_tools = llm.bind_tools(tools) if tools else llm
        system_prompt = self.agent_config.get(
            "system_prompt", "You are a helpful AI assistant."
        )

        def call_model(state: AgentState):
            msgs = list(state["messages"])
            # Inject system prompt on first call
            if not any(isinstance(m, SystemMessage) for m in msgs):
                msgs = [SystemMessage(content=system_prompt)] + msgs
            response = llm_with_tools.invoke(msgs)
            return {"messages": [response]}

        def should_continue(state: AgentState):
            last = state["messages"][-1]
            if hasattr(last, "tool_calls") and last.tool_calls:
                return "tools"
            return END

        workflow = StateGraph(AgentState)
        workflow.add_node("agent", call_model)
        workflow.set_entry_point("agent")

        if tools:
            workflow.add_node("tools", ToolNode(tools))
            workflow.add_edge("tools", "agent")
            workflow.add_conditional_edges(
                "agent", should_continue, {"tools": "tools", END: END}
            )
        else:
            workflow.add_edge("agent", END)

        return workflow.compile()

    async def run_stream(
        self,
        user_input: str,
        run_id: str,
        kb_id: Optional[str] = None,
        incoming_queue: Optional[asyncio.Queue] = None,
    ) -> AsyncGenerator[dict, None]:
        """
        Stream agent execution as server-sent events (dict payloads).
        Event types:  run_start | token | tool_start | tool_end | run_end | error | guardrail_alert
        """
        start_time = time.time()
        
        # 1. Validate Input (Prompt Injection, PII scrubbing, etc.)
        injection = self.guardrails.detect_prompt_injection(user_input)
        if injection["flagged"]:
            yield {"type": "run_start", "run_id": run_id, "timestamp": start_time}
            yield {"type": "token", "content": f"⚠️ *[Security Violation]* Prompt Injection Blocked: {injection['reason']}", "run_id": run_id}
            yield {
                "type": "guardrail_alert",
                "run_id": run_id,
                "policy": "prompt_injection",
                "policy_category": injection.get("category"),
                "reason": injection["reason"],
                "flagged_text": user_input,
                "action": "blocked"
            }
            yield {
                "type": "run_end",
                "run_id": run_id,
                "output": "⚠️ *[Security Violation]* Prompt Injection Blocked.",
                "trace": [],
                "duration_ms": int((time.time() - start_time) * 1000),
                "cost_usd": 0.0,
                "provider": self.agent_config.get("provider"),
                "model": self.agent_config.get("model"),
                "timestamp": time.time(),
            }
            return

        sanitized_input = self.guardrails.validate_input(user_input)
        if sanitized_input != user_input:
            print(f"🛡️ [GUARDRAILS] Input scrubbed: {sanitized_input}")
        
        tools = get_tools_for_agent(
            self.agent_config.get("tools", []), kb_id=kb_id
        )
        graph = self._build_graph(tools)
        
        initial_state = {"messages": [HumanMessage(content=sanitized_input)]}

        yield {"type": "run_start", "run_id": run_id, "timestamp": start_time}

        full_response = ""
        trace_steps: List[dict] = []

        try:
            async for event in graph.astream_events(initial_state, version="v2"):
                kind = event.get("event", "")

                if kind == "on_chat_model_stream":
                    chunk = event.get("data", {}).get("chunk")
                    if chunk and getattr(chunk, "content", None):
                        full_response += chunk.content
                        yield {"type": "token", "content": chunk.content, "run_id": run_id}

                # ── Tool start ────────────────────────────────
                elif kind == "on_tool_start":
                    step = {
                        "type": "tool_start",
                        "tool": event.get("name", "unknown"),
                        "input": event.get("data", {}).get("input", {}),
                        "timestamp": time.time(),
                    }
                    trace_steps.append(step)
                    yield step

                # ── Tool end ──────────────────────────────────
                elif kind == "on_tool_end":
                    output = event.get("data", {}).get("output", "")
                    step = {
                        "type": "tool_end",
                        "tool": event.get("name", "unknown"),
                        "output": str(output)[:1000],
                        "timestamp": time.time(),
                    }
                    trace_steps.append(step)
                    yield step

        except Exception as exc:
            yield {"type": "error", "error": str(exc), "run_id": run_id}
            return

        # 2. Validate Output (Competitors, PII, bias, hallucinations, regulatory)
        validation = self.guardrails.validate_output(full_response, user_input=user_input)
        
        # If competitor blocks or other hard flags are present:
        if validation["flagged"]:
            full_response = validation["text"]
            yield {"type": "token", "content": "\n\n⚠️ *Content moderated by Guardrails.*", "run_id": run_id}
            
        # If output needs Human-In-The-Loop review:
        elif validation.get("hitl_required") and incoming_queue is not None:
            yield {
                "type": "guardrail_alert",
                "run_id": run_id,
                "hitl_required": True,
                "policy": validation["hitl_policy"],
                "reason": validation["reason"],
                "flagged_text": full_response,
                "output": validation["text"]
            }
            
            # Wait for operator response over WebSocket (relayed via incoming_queue)
            decision = None
            while True:
                client_msg = await incoming_queue.get()
                if client_msg.get("type") in ("disconnect", "error"):
                    return  # user closed browser or aborted
                if client_msg.get("action") == "resume":
                    decision = client_msg
                    break
            
            decision["policy"] = validation["hitl_policy"]
            self.hitl_decision = decision
            
            action = decision.get("decision", "approve") # approve, edit, block
            
            if action == "block":
                full_response = "⚠️ *Response blocked by operator review due to safety policy violations.*"
                yield {"type": "token", "content": f"\n\n{full_response}", "run_id": run_id}
            elif action == "edit":
                full_response = decision.get("edited_output", validation["text"])
                yield {"type": "token", "content": f"\n\n✏️ *[Operator Edited Response]:*\n{full_response}", "run_id": run_id}
            else: # approve
                full_response = validation["text"]
                yield {"type": "token", "content": "\n\n✅ *[Operator Approved Response]*", "run_id": run_id}
        
        # Else standard non-HITL path
        elif validation.get("hitl_required") and incoming_queue is None:
            # Fallback if run from a CLI or non-HITL environment (auto-include warning and proceed)
            full_response = validation["text"]

        duration_ms = int((time.time() - start_time) * 1000)
        
        # Estimate Cost (Accurate per-provider rates)
        # Rates are USD per 1,000 tokens (approx. input/output average)
        MODEL_RATES = {
            "gpt-4o": 0.0075,
            "gpt-4o-mini": 0.0003,
            "gpt-4-turbo": 0.0150,
            "claude-3-5-sonnet-20241022": 0.0090,
            "claude-3-haiku-20240307": 0.00075,
            "llama-3.3-70b-versatile": 0.00069,
            "llama-3.1-8b-instant": 0.00007,
            "gemini-2.0-flash": 0.00015,
            "gemini-1.5-pro": 0.00375,
            "gemini-1.5-flash": 0.0001875,
        }
        
        provider = self.agent_config.get("provider", "").lower()
        model_name = self.agent_config.get("model", "").lower()
        
        if provider == "ollama":
            cost_usd = 0.0
        else:
            # Estimate token count (average 1.3 tokens per word, counting both input & output)
            input_words = len(user_input.split())
            output_words = len(full_response.split())
            total_tokens = (input_words + output_words) * 1.3
            
            # Find matching rate or default to generic low rate
            rate_per_token = 0.000001
            for model_key, rate in MODEL_RATES.items():
                if model_key in model_name:
                    rate_per_token = rate / 1000.0
                    break
            
            cost_usd = round(total_tokens * rate_per_token, 6)

        yield {
            "type": "run_end",
            "run_id": run_id,
            "output": full_response,
            "trace": trace_steps,
            "duration_ms": duration_ms,
            "cost_usd": cost_usd,
            "provider": self.agent_config.get("provider"),
            "model": self.agent_config.get("model"),
            "timestamp": time.time(),
        }
