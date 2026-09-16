"""
WebSocket — Real-time agent streaming endpoint.
Clients connect, send a message, and receive a stream of typed events.
"""

import json
import uuid
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Agent, AgentRun
# LangGraphRunner is lazy-loaded inside the endpoint

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/run/{agent_id}")
async def websocket_run(
    websocket: WebSocket,
    agent_id: str,
    db: Session = Depends(get_db),
):
    """
    WebSocket protocol:
      Client → { "message": "...", "api_key": "..." (optional BYOK) }
      Server → stream of JSON events:
        { "type": "run_start", "run_id": "..." }
        { "type": "token",     "content": "..." }
        { "type": "tool_start","tool": "...", "input": {...} }
        { "type": "tool_end",  "tool": "...", "output": "..." }
        { "type": "run_end",   "output": "...", "trace": [...], "duration_ms": N }
        { "type": "error",     "error": "..." }
    """
    import asyncio
    from db.models import Agent, AgentRun, AuditLog
    await websocket.accept()

    # Fetch agent config
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        await websocket.send_json({"type": "error", "error": "Agent not found"})
        await websocket.close()
        return

    # Background task to read incoming client messages asynchronously
    incoming_queue = asyncio.Queue()
    
    async def read_incoming():
        try:
            while True:
                msg = await websocket.receive_json()
                await incoming_queue.put(msg)
        except WebSocketDisconnect:
            await incoming_queue.put({"type": "disconnect"})
        except Exception as e:
            await incoming_queue.put({"type": "error", "error": str(e)})

    reader_task = asyncio.create_task(read_incoming())

    try:
        # Get the first message (containing input and BYOK)
        first_msg = await incoming_queue.get()
        if first_msg.get("type") in ("disconnect", "error"):
            return

        user_input = first_msg.get("message", "").strip()
        api_key = first_msg.get("api_key")           # Optional BYOK

        if not user_input:
            await websocket.send_json({"type": "error", "error": "Empty message"})
            return

        # Create a pending run record
        run_id = str(uuid.uuid4())
        import os
        langsmith_url = None
        if os.getenv("LANGCHAIN_TRACING_V2") == "true":
            langsmith_url = f"https://smith.langchain.com/o/current/projects/p/current/runs/{run_id}"

        run = AgentRun(
            id=run_id,
            agent_id=agent_id,
            status="running",
            input=user_input,
            provider=agent.provider,
            model=agent.model,
            langsmith_url=langsmith_url,
        )
        db.add(run)
        db.commit()

        # Check if a multi-agent visual flow is active in the graph definition
        graph_def = agent.graph_definition or {}
        active_template = graph_def.get("active_template", "Default Flow")
        templates_dict = graph_def.get("templates", {})
        active_flow = templates_dict.get(active_template, {})
        nodes = active_flow.get("nodes", [])
        edges = active_flow.get("edges", [])

        # Build sequential execution path starting from inputNode
        execution_path = []
        input_node = next((n for n in nodes if n.get("type") == "inputNode"), None)
        
        if input_node and edges:
            current_node = input_node
            visited = set()
            while True:
                outgoing = [e for e in edges if e.get("source") == current_node.get("id")]
                if not outgoing:
                    break
                
                # Pick the first outgoing edge (linear pipeline execution)
                next_node = next((n for n in nodes if n.get("id") == outgoing[0].get("target")), None)
                if not next_node or next_node.get("id") in visited:
                    break
                
                visited.add(next_node.get("id"))
                if next_node.get("type") in ("agentNode", "guardrailNode", "outputNode"):
                    execution_path.append(next_node)
                current_node = next_node
                if next_node.get("type") == "outputNode":
                    break

        has_multi_agent_path = any(n.get("type") == "agentNode" for n in execution_path)

        full_output = ""
        trace_steps = []
        duration_ms = 0

        if has_multi_agent_path:
            total_duration_ms = 0
            current_query = user_input
            
            # Send initial run_start
            yield_run_start = {
                "type": "run_start",
                "run_id": run_id,
                "timestamp": datetime.utcnow().timestamp(),
                "active_node_id": input_node.get("id") if input_node else None
            }
            await websocket.send_json(yield_run_start)
            
            for step_idx, node in enumerate(execution_path):
                node_type = node.get("type")
                node_id = node.get("id")
                
                if node_type == "agentNode":
                    # Parse agent ID from node ID robustly (supporting UUIDs with hyphens and optional timestamps)
                    node_agent_id = node_id
                    if node_agent_id.startswith("agent-"):
                        node_agent_id = node_agent_id[6:] # Strip "agent-" prefix
                    
                    # Strip trailing timestamp suffix if present (e.g. -1716382949000)
                    rparts = node_agent_id.rsplit("-", 1)
                    if len(rparts) == 2 and rparts[1].isdigit() and len(rparts[1]) >= 10:
                        node_agent_id = rparts[0]
                        
                    # Fetch specific agent from db
                    subagent = db.query(Agent).filter(Agent.id == node_agent_id).first()
                    if not subagent:
                        subagent = agent # fallback
                        
                    subagent_config = {
                        "provider":       subagent.provider,
                        "model":          subagent.model,
                        "temperature":    subagent.temperature,
                        "max_iterations": subagent.max_iterations,
                        "system_prompt":  subagent.system_prompt,
                        "tools":          subagent.tools or [],
                        "guardrails_config": subagent.guardrails_config or {},
                    }
                    
                    from core.langgraph_runner import LangGraphRunner
                    sub_runner = LangGraphRunner(agent_config=subagent_config, api_key=api_key)
                    
                    # Notify client this agent is starting to stream
                    agent_start_event = {
                        "type": "token",
                        "content": f"\n\n**🤖 [{subagent.name}]** is processing:\n",
                        "run_id": run_id,
                        "active_node_id": node_id
                    }
                    await websocket.send_json(agent_start_event)
                    
                    subagent_output = ""
                    
                    # Stream execution of the subagent
                    async for event in sub_runner.run_stream(
                        user_input=current_query,
                        run_id=run_id,
                        kb_id=subagent.knowledge_base_id,
                        incoming_queue=incoming_queue,
                    ):
                        event["active_node_id"] = node_id
                        if event["type"] == "token":
                            subagent_output += event.get("content", "")
                            await websocket.send_json(event)
                        elif event["type"] in ("tool_start", "tool_end"):
                            trace_steps.append(event)
                            await websocket.send_json(event)
                        elif event["type"] == "guardrail_alert":
                            await websocket.send_json(event)
                        elif event["type"] == "run_end":
                            subagent_output = event.get("output", subagent_output)
                            total_duration_ms += event.get("duration_ms", 0)
                            
                    current_query = subagent_output
                    full_output = subagent_output
                    
                elif node_type == "guardrailNode":
                    # Visual representation of a guardrail node scan
                    guardrail_event = {
                        "type": "token",
                        "content": f"\n\n🛡️ *[Guardrail: {node.get('data', {}).get('label', 'Safety')}] Scanning inputs...*\n",
                        "run_id": run_id,
                        "active_node_id": node_id
                    }
                    await websocket.send_json(guardrail_event)
                    await asyncio.sleep(0.8) # dynamic highlight delay
                    
                elif node_type == "outputNode":
                    # Highlight output node
                    output_event = {
                        "type": "token",
                        "content": "",
                        "run_id": run_id,
                        "active_node_id": node_id
                    }
                    await websocket.send_json(output_event)
            
            # Send final run_end event
            final_event = {
                "type": "run_end",
                "run_id": run_id,
                "output": current_query,
                "trace": trace_steps,
                "duration_ms": total_duration_ms,
                "cost_usd": round(len(current_query.split()) * 1.3 * 0.0000001, 6),
                "provider": agent.provider,
                "model": agent.model,
                "timestamp": datetime.utcnow().timestamp(),
                "active_node_id": execution_path[-1].get("id") if execution_path else None
            }
            await websocket.send_json(final_event)
            
            duration_ms = total_duration_ms

        else:
            # ORIGINAL SINGLE-AGENT FALLBACK
            # Build agent config dict from ORM object
            agent_config = {
                "provider":       agent.provider,
                "model":          agent.model,
                "temperature":    agent.temperature,
                "max_iterations": agent.max_iterations,
                "system_prompt":  agent.system_prompt,
                "tools":          agent.tools or [],
                "guardrails_config": agent.guardrails_config or {},
            }

            from core.langgraph_runner import LangGraphRunner
            runner = LangGraphRunner(agent_config=agent_config, api_key=api_key)

            async for event in runner.run_stream(
                user_input=user_input,
                run_id=run_id,
                kb_id=agent.knowledge_base_id,
                incoming_queue=incoming_queue,
            ):
                await websocket.send_json(event)

                if event["type"] == "token":
                    full_output += event.get("content", "")
                elif event["type"] in ("tool_start", "tool_end"):
                    trace_steps.append(event)
                elif event["type"] == "guardrail_alert":
                    if event.get("hitl_required"):
                        run.status = "pending_review"
                        run.output = event.get("output", full_output)
                        run.trace = trace_steps
                        db.commit()

                    # Create an AuditLog entry for safety policy violation
                    action_type = "guardrails.pending_review" if event.get("hitl_required") else ("guardrails.block" if event.get("action") == "blocked" else "guardrails.violation")
                    audit = AuditLog(
                        action=action_type,
                        resource="agent_run",
                        resource_id=run_id,
                        details={
                            "agent_id": agent.id,
                            "agent_name": agent.name,
                            "policy": event.get("policy"),
                            "policy_category": event.get("policy_category"),
                            "reason": event.get("reason"),
                            "flagged_text": event.get("flagged_text"),
                            "action": "paused" if event.get("hitl_required") else (event.get("action") or "blocked")
                        }
                    )
                    db.add(audit)
                    db.commit()
                elif event["type"] == "run_end":
                    # If HITL decision was made, log the final resolution
                    decision = getattr(runner, "hitl_decision", None)
                    if decision:
                        action_taken = decision.get("decision", "approve")
                        audit = AuditLog(
                            action=f"guardrails.{action_taken}",
                            resource="agent_run",
                            resource_id=run_id,
                            details={
                                "agent_id": agent.id,
                                "agent_name": agent.name,
                                "policy": decision.get("policy"),
                                "action": action_taken,
                                "edited_output": decision.get("edited_output")
                            }
                        )
                        db.add(audit)
                        db.commit()
                    
                    full_output = event.get("output", full_output)
                    trace_steps = event.get("trace", trace_steps)
                    duration_ms = event.get("duration_ms", 0)
                    run.cost_usd = event.get("cost_usd", 0.0)
                elif event["type"] == "error":
                    run.status = "failed"
                    run.error = event.get("error")
                    db.commit()
                    return

        # Persist completed run
        run.status = "completed"
        run.output = full_output
        run.trace = trace_steps
        run.duration_ms = duration_ms
        db.commit()

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_json({"type": "error", "error": str(exc)})
        except Exception:
            pass
    finally:
        # Cancel the reader task to prevent leaks
        reader_task.cancel()
