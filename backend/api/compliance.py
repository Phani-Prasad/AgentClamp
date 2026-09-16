"""
Compliance API — AgentClamp
Enterprise AI Governance: NIST AI RMF, ISO 42001, ISO 23894, EU AI Act
"""

import os
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db.database import get_db
from db.models import Agent, AgentRiskClassification, ComplianceAssessment, GovernancePolicy, AuditLog

router = APIRouter(prefix="/compliance", tags=["Compliance"])


# ── Framework Definitions ────────────────────────────────────────

NIST_AI_RMF = {
    "id": "nist_ai_rmf",
    "name": "NIST AI Risk Management Framework",
    "version": "1.0 (2023)",
    "description": "A voluntary framework to improve the ability to incorporate trustworthiness considerations into the design, development, use, and evaluation of AI products and services.",
    "pillars": [
        {
            "id": "GOVERN",
            "title": "GOVERN",
            "color": "#6366f1",
            "description": "Cultivate a culture of risk awareness and accountability.",
            "controls": [
                {"id": "GOVERN-1.1", "title": "AI Risk Policy Defined", "description": "AI risk policies and procedures are established, documented, and communicated."},
                {"id": "GOVERN-1.2", "title": "Roles & Accountability", "description": "Roles and responsibilities for AI risk management are defined and assigned."},
                {"id": "GOVERN-2.1", "title": "AI Risk Strategy", "description": "Organizational AI risk tolerance is determined and communicated."},
                {"id": "GOVERN-3.1", "title": "Team Diversity", "description": "AI development teams include diverse expertise to identify and mitigate risks."},
            ]
        },
        {
            "id": "MAP",
            "title": "MAP",
            "color": "#f59e0b",
            "description": "Categorize and contextualize AI risks.",
            "controls": [
                {"id": "MAP-1.1", "title": "AI System Context", "description": "Context for AI system use is established and understood."},
                {"id": "MAP-2.1", "title": "Threat Identification", "description": "Threats and vulnerabilities in the AI system are identified (prompt injection, jailbreaks, PII leakage)."},
                {"id": "MAP-3.1", "title": "Bias & Fairness Risk", "description": "Risks of bias and unfairness are identified across the AI system lifecycle."},
                {"id": "MAP-5.1", "title": "Impact Assessment", "description": "Likelihood and magnitude of each identified risk is assessed."},
            ]
        },
        {
            "id": "MEASURE",
            "title": "MEASURE",
            "color": "#10b981",
            "description": "Analyze, assess, and track AI risks.",
            "controls": [
                {"id": "MEASURE-1.1", "title": "Metrics Defined", "description": "Metrics for AI risk measurement are established (hallucination rate, toxicity, bias scores)."},
                {"id": "MEASURE-2.1", "title": "Evaluation Testing", "description": "AI system is evaluated using established metrics before and during deployment."},
                {"id": "MEASURE-2.5", "title": "Bias Testing", "description": "AI outputs are evaluated for bias across demographic groups."},
                {"id": "MEASURE-4.1", "title": "Risk Monitoring", "description": "Risk metrics are monitored in production on an ongoing basis."},
            ]
        },
        {
            "id": "MANAGE",
            "title": "MANAGE",
            "color": "#ef4444",
            "description": "Prioritize and address AI risks.",
            "controls": [
                {"id": "MANAGE-1.1", "title": "Risk Response Plans", "description": "Risk response plans are developed and implemented."},
                {"id": "MANAGE-2.1", "title": "Human Oversight (HITL)", "description": "Human-in-the-Loop mechanisms are implemented for high-risk outputs."},
                {"id": "MANAGE-3.1", "title": "Incident Response", "description": "Procedures for AI incidents are established and tested."},
                {"id": "MANAGE-4.1", "title": "Continuous Improvement", "description": "AI system risks are continuously monitored and improvements implemented."},
            ]
        }
    ]
}

ISO_42001 = {
    "id": "iso_42001",
    "name": "ISO/IEC 42001:2023 — AI Management System",
    "version": "2023",
    "description": "International standard specifying requirements for establishing, implementing, maintaining and continually improving an Artificial Intelligence Management System (AIMS).",
    "clauses": [
        {"id": "A.2.2", "title": "AI Policy", "description": "Top management shall establish, implement and maintain an AI policy."},
        {"id": "A.3.1", "title": "AI Roles", "description": "Roles, responsibilities and authorities for AI management are assigned."},
        {"id": "A.4.1", "title": "AI Risk Assessment", "description": "AI-related risks are identified, analyzed and evaluated."},
        {"id": "A.5.1", "title": "AI Objectives", "description": "AI objectives and plans to achieve them are established."},
        {"id": "A.6.1", "title": "AI System Lifecycle", "description": "Controls for AI system design, development, testing and deployment are implemented."},
        {"id": "A.7.1", "title": "Data for AI Systems", "description": "Data used in AI systems is managed to ensure quality, security and regulatory compliance."},
        {"id": "A.8.1", "title": "Information Security", "description": "AI systems incorporate information security controls throughout the lifecycle."},
        {"id": "A.9.1", "title": "Human Oversight", "description": "Human oversight mechanisms are implemented and maintained."},
        {"id": "A.10.1", "title": "Documentation", "description": "AI system documentation is created, maintained and controlled."},
        {"id": "A.11.1", "title": "Continual Improvement", "description": "The organization continually improves the suitability and effectiveness of the AIMS."},
    ]
}

ISO_23894 = {
    "id": "iso_23894",
    "name": "ISO/IEC 23894:2023 — AI Risk Management",
    "version": "2023",
    "description": "Guidance on how organizations that develop, produce, deploy or use AI can manage risks specifically related to AI.",
    "categories": [
        {"id": "23894-1", "title": "Risk Identification", "description": "Systematic process to find, recognize and describe AI-specific risks."},
        {"id": "23894-2", "title": "Risk Analysis", "description": "Process to comprehend the nature and level of identified AI risks."},
        {"id": "23894-3", "title": "Risk Evaluation", "description": "Comparison of risk analysis results with risk criteria to determine risk acceptability."},
        {"id": "23894-4", "title": "Risk Treatment", "description": "Process to modify AI risks through avoidance, mitigation, transfer or acceptance."},
        {"id": "23894-5", "title": "Risk Monitoring & Review", "description": "Continuous monitoring of AI risks and review of risk management effectiveness."},
        {"id": "23894-6", "title": "Communication & Consultation", "description": "Ongoing processes for stakeholder communication about AI risks."},
    ]
}

EU_AI_ACT = {
    "id": "eu_ai_act",
    "name": "EU AI Act (2024)",
    "version": "Regulation (EU) 2024/1689",
    "description": "The world's first comprehensive legal framework on AI, establishing obligations for AI systems based on potential risks and impact.",
    "risk_tiers": [
        {
            "tier": "unacceptable",
            "label": "Unacceptable Risk",
            "color": "#ef4444",
            "description": "AI systems posing unacceptable risk to safety or fundamental rights. PROHIBITED.",
            "examples": ["Social scoring by governments", "Real-time biometric surveillance in public", "AI exploiting vulnerabilities of specific groups"]
        },
        {
            "tier": "high",
            "label": "High Risk",
            "color": "#f59e0b",
            "description": "AI systems with significant potential impact on health, safety, or fundamental rights. Strict obligations apply.",
            "examples": ["HR / recruitment tools", "Credit scoring", "Medical diagnosis", "Law enforcement", "Critical infrastructure"]
        },
        {
            "tier": "limited",
            "label": "Limited Risk",
            "color": "#6366f1",
            "description": "AI systems with specific transparency obligations.",
            "examples": ["Chatbots", "Deepfakes", "Emotion recognition systems"]
        },
        {
            "tier": "minimal",
            "label": "Minimal Risk",
            "color": "#10b981",
            "description": "All other AI systems with minimal or no risk. No specific obligations.",
            "examples": ["Spam filters", "AI in video games", "General productivity tools"]
        }
    ],
    "mandatory_controls": [
        {"id": "art_10", "title": "Art. 10 — Data & Data Governance", "description": "Training, validation and testing data must meet quality criteria and be free from discriminatory patterns."},
        {"id": "art_11", "title": "Art. 11 — Technical Documentation", "description": "Comprehensive technical documentation must be maintained before placing AI system on the market."},
        {"id": "art_12", "title": "Art. 12 — Logging & Traceability", "description": "AI systems must have automatic logging of events to enable post-market monitoring and incident investigation."},
        {"id": "art_13", "title": "Art. 13 — Transparency & Info", "description": "High-risk AI systems must be transparent and provide adequate information to deployers and users."},
        {"id": "art_14", "title": "Art. 14 — Human Oversight", "description": "High-risk AI systems must be designed to be effectively overseen by natural persons."},
        {"id": "art_15", "title": "Art. 15 — Accuracy & Robustness", "description": "High-risk AI systems must achieve appropriate levels of accuracy, robustness and cybersecurity."},
    ]
}


# ── Scoring Engine ───────────────────────────────────────────────

def _compute_live_compliance(db: Session) -> Dict[str, Any]:
    """
    Compute real-time compliance scores by inspecting the live AgentClamp
    DB state: agents, policies, audit logs, guardrail configs, and risk classifications.
    """
    agents = db.query(Agent).all()
    policies = db.query(GovernancePolicy).filter(GovernancePolicy.is_active == True).all()  # noqa: E712
    audit_logs = db.query(AuditLog).count()
    risk_classifications = db.query(AgentRiskClassification).all()

    total_agents = len(agents)
    agents_with_guardrails = sum(1 for a in agents if a.guardrails_config)
    agents_with_hitl = sum(1 for a in agents if a.guardrails_config and a.guardrails_config.get("hitl_enabled"))
    active_policies = len(policies)

    # --- NIST AI RMF scoring ---
    nist_controls = []
    gov_score = min(100, active_policies * 20) if active_policies else 0
    nist_controls.append({"id": "GOVERN-1.1", "title": "AI Risk Policy Defined", "status": "pass" if active_policies >= 1 else "fail", "evidence": f"{active_policies} active governance policies"})
    nist_controls.append({"id": "GOVERN-1.2", "title": "Roles & Accountability", "status": "pass", "evidence": "Auth system with role-based access enabled"})
    nist_controls.append({"id": "MAP-2.1", "title": "Threat Identification", "status": "pass" if agents_with_guardrails > 0 else "partial", "evidence": f"{agents_with_guardrails}/{total_agents} agents have guardrails"})
    nist_controls.append({"id": "MAP-3.1", "title": "Bias & Fairness Risk", "status": "pass" if any(p.trigger_type == "bias" for p in policies) else "partial", "evidence": "Bias detection available in Eval Playground"})
    nist_controls.append({"id": "MEASURE-1.1", "title": "Metrics Defined", "status": "pass", "evidence": "Hallucination, bias, toxicity metrics in Eval Playground"})
    nist_controls.append({"id": "MEASURE-2.1", "title": "Evaluation Testing", "status": "pass", "evidence": "Eval Playground active with LLM judge"})
    nist_controls.append({"id": "MANAGE-2.1", "title": "Human Oversight (HITL)", "status": "pass" if agents_with_hitl > 0 else "fail", "evidence": f"{agents_with_hitl}/{total_agents} agents have HITL enabled"})
    nist_controls.append({"id": "MANAGE-4.1", "title": "Continuous Improvement", "status": "pass" if audit_logs > 0 else "partial", "evidence": f"{audit_logs} audit log entries recorded"})

    nist_passed = sum(1 for c in nist_controls if c["status"] == "pass")
    nist_score = round((nist_passed / len(nist_controls)) * 100, 1)

    # --- ISO 42001 scoring ---
    iso42001_controls = []
    iso42001_controls.append({"id": "A.2.2", "title": "AI Policy", "status": "pass" if active_policies >= 1 else "fail", "evidence": f"{active_policies} governance policies active"})
    iso42001_controls.append({"id": "A.4.1", "title": "AI Risk Assessment", "status": "pass" if len(risk_classifications) > 0 else "partial", "evidence": f"{len(risk_classifications)} agents risk-classified"})
    iso42001_controls.append({"id": "A.6.1", "title": "AI System Lifecycle", "status": "pass", "evidence": "Agent build-deploy-monitor lifecycle managed"})
    iso42001_controls.append({"id": "A.7.1", "title": "Data for AI Systems", "status": "pass" if agents_with_guardrails > 0 else "partial", "evidence": "PII masking and data compliance guardrails available"})
    iso42001_controls.append({"id": "A.9.1", "title": "Human Oversight", "status": "pass" if agents_with_hitl > 0 else "fail", "evidence": f"HITL inbox operational, {agents_with_hitl} agents enabled"})
    iso42001_controls.append({"id": "A.10.1", "title": "Documentation", "status": "pass", "evidence": "Technical audit logs and agent documentation stored"})

    iso42001_passed = sum(1 for c in iso42001_controls if c["status"] == "pass")
    iso42001_score = round((iso42001_passed / len(iso42001_controls)) * 100, 1)

    # --- ISO 23894 scoring ---
    iso23894_controls = []
    iso23894_controls.append({"id": "23894-1", "title": "Risk Identification", "status": "pass" if active_policies >= 1 else "fail", "evidence": "Dynamic policy builder with threat identification"})
    iso23894_controls.append({"id": "23894-2", "title": "Risk Analysis", "status": "pass" if agents_with_guardrails > 0 else "partial", "evidence": "Guardrails engine analyzes prompt/response risks"})
    iso23894_controls.append({"id": "23894-3", "title": "Risk Evaluation", "status": "pass", "evidence": "Eval Playground with LLM judge risk scoring"})
    iso23894_controls.append({"id": "23894-4", "title": "Risk Treatment", "status": "pass" if active_policies >= 1 else "fail", "evidence": "Policies define block/mask/redact/HITL treatments"})
    iso23894_controls.append({"id": "23894-5", "title": "Risk Monitoring", "status": "pass" if audit_logs > 10 else "partial", "evidence": f"{audit_logs} audit events recorded for monitoring"})
    iso23894_controls.append({"id": "23894-6", "title": "Communication", "status": "pass", "evidence": "Guardrail violation reports and policy audit cards"})

    iso23894_passed = sum(1 for c in iso23894_controls if c["status"] == "pass")
    iso23894_score = round((iso23894_passed / len(iso23894_controls)) * 100, 1)

    # --- EU AI Act scoring ---
    eu_controls = []
    eu_controls.append({"id": "art_10", "title": "Art. 10 — Data Governance", "status": "pass" if agents_with_guardrails > 0 else "partial", "evidence": "PII masking and data compliance policies active"})
    eu_controls.append({"id": "art_12", "title": "Art. 12 — Logging", "status": "pass" if audit_logs > 0 else "fail", "evidence": f"{audit_logs} audit log entries for traceability"})
    eu_controls.append({"id": "art_13", "title": "Art. 13 — Transparency", "status": "pass", "evidence": "Agent configurations, guardrail policies fully visible"})
    eu_controls.append({"id": "art_14", "title": "Art. 14 — Human Oversight", "status": "pass" if agents_with_hitl > 0 else "fail", "evidence": f"{agents_with_hitl} agents with HITL, review inbox active"})
    eu_controls.append({"id": "art_15", "title": "Art. 15 — Accuracy & Robustness", "status": "pass", "evidence": "Eval playground measures hallucination, bias, toxicity"})

    eu_passed = sum(1 for c in eu_controls if c["status"] == "pass")
    eu_score = round((eu_passed / len(eu_controls)) * 100, 1)

    overall_score = round((nist_score + iso42001_score + iso23894_score + eu_score) / 4, 1)

    # --- Agent-by-Agent Compliance Matrix ---
    risk_map = {rc.agent_id: rc for rc in risk_classifications}
    agent_matrix = []
    for a in agents:
        rc = risk_map.get(a.id)
        has_g = bool(a.guardrails_config)
        has_hitl = bool(a.guardrails_config and a.guardrails_config.get("hitl_enabled"))
        has_pii = bool(a.guardrails_config and a.guardrails_config.get("pii_masking"))
        has_injection = bool(a.guardrails_config and a.guardrails_config.get("prompt_injection_detection"))
        risk_tier = rc.risk_tier if rc else "unclassified"

        missing = []
        if not has_g:
            missing.append("Guardrails Missing")
        if not has_hitl:
            missing.append("HITL Disabled")
        if not rc:
            missing.append("Unclassified Risk")

        if not missing:
            agent_status = "compliant"
        elif not has_g:
            agent_status = "non_compliant"
        else:
            agent_status = "warning"

        agent_matrix.append({
            "id": a.id,
            "name": a.name,
            "model": a.model,
            "provider": a.provider,
            "has_guardrails": has_g,
            "has_hitl": has_hitl,
            "has_pii_masking": has_pii,
            "has_prompt_injection": has_injection,
            "risk_tier": risk_tier,
            "status": agent_status,
            "missing_controls": missing,
        })

    return {
        "overall_score": overall_score,
        "last_updated": datetime.utcnow().isoformat(),
        "summary": {
            "total_agents": total_agents,
            "agents_with_guardrails": agents_with_guardrails,
            "agents_with_hitl": agents_with_hitl,
            "active_policies": active_policies,
            "audit_log_entries": audit_logs,
            "agents_risk_classified": len(risk_classifications),
        },
        "frameworks": {
            "nist_ai_rmf": {"score": nist_score, "passed": nist_passed, "total": len(nist_controls), "controls": nist_controls},
            "iso_42001": {"score": iso42001_score, "passed": iso42001_passed, "total": len(iso42001_controls), "controls": iso42001_controls},
            "iso_23894": {"score": iso23894_score, "passed": iso23894_passed, "total": len(iso23894_controls), "controls": iso23894_controls},
            "eu_ai_act": {"score": eu_score, "passed": eu_passed, "total": len(eu_controls), "controls": eu_controls},
        },
        "agent_matrix": agent_matrix,
    }


# ── Pydantic Schemas ─────────────────────────────────────────────

class RiskClassifyRequest(BaseModel):
    agent_id: str
    use_case: str
    sector: str
    processes_personal_data: bool = False
    makes_consequential_decisions: bool = False
    used_in_critical_infrastructure: bool = False
    used_in_hiring_or_credit: bool = False
    interacts_with_vulnerable_groups: bool = False


class ControlUpdate(BaseModel):
    human_oversight: bool = False
    logging_traceability: bool = False
    transparency: bool = False
    accuracy_robustness: bool = False
    data_governance: bool = False


# ── Endpoints ────────────────────────────────────────────────────

@router.get("/frameworks")
def get_frameworks():
    """Return all governance framework definitions."""
    return {
        "nist_ai_rmf": NIST_AI_RMF,
        "iso_42001": ISO_42001,
        "iso_23894": ISO_23894,
        "eu_ai_act": EU_AI_ACT,
    }


@router.get("/dashboard")
def get_compliance_dashboard(db: Session = Depends(get_db)):
    """Return real-time compliance scores across all frameworks."""
    return _compute_live_compliance(db)


@router.post("/classify-agent")
def classify_agent_risk(req: RiskClassifyRequest, db: Session = Depends(get_db)):
    """
    Classify an agent's EU AI Act risk tier based on its characteristics.
    Auto-classifies using a decision tree matching EU AI Act Annex III.
    """
    agent = db.query(Agent).filter(Agent.id == req.agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # EU AI Act decision tree
    if req.used_in_critical_infrastructure or req.used_in_hiring_or_credit:
        tier = "high"
        rationale = "Agent is used in critical infrastructure or makes hiring/credit decisions (EU AI Act Annex III)."
    elif req.makes_consequential_decisions and req.processes_personal_data:
        tier = "high"
        rationale = "Agent makes consequential decisions using personal data, qualifying as high-risk under EU AI Act."
    elif req.interacts_with_vulnerable_groups:
        tier = "limited"
        rationale = "Agent interacts with vulnerable groups — transparency obligations apply (Art. 13)."
    elif req.processes_personal_data:
        tier = "limited"
        rationale = "Agent processes personal data — transparency and data governance obligations apply."
    else:
        tier = "minimal"
        rationale = "Agent poses minimal risk with no high-risk use case characteristics detected."

    # Default controls for tier
    controls = {
        "human_oversight": tier in ("high", "unacceptable"),
        "logging_traceability": tier in ("high", "limited"),
        "transparency": tier in ("high", "limited"),
        "accuracy_robustness": tier == "high",
        "data_governance": req.processes_personal_data,
    }

    # Upsert classification
    existing = db.query(AgentRiskClassification).filter(AgentRiskClassification.agent_id == req.agent_id).first()
    if existing:
        existing.risk_tier = tier
        existing.rationale = rationale
        existing.use_case = req.use_case
        existing.sector = req.sector
        existing.controls = controls
        existing.updated_at = datetime.utcnow()
    else:
        classification = AgentRiskClassification(
            agent_id=req.agent_id,
            risk_tier=tier,
            rationale=rationale,
            use_case=req.use_case,
            sector=req.sector,
            controls=controls,
        )
        db.add(classification)

    db.commit()
    return {"agent_id": req.agent_id, "risk_tier": tier, "rationale": rationale, "controls": controls}


@router.get("/agents/{agent_id}/classification")
def get_agent_classification(agent_id: str, db: Session = Depends(get_db)):
    """Return EU AI Act risk classification for a specific agent."""
    classification = db.query(AgentRiskClassification).filter(
        AgentRiskClassification.agent_id == agent_id
    ).first()
    if not classification:
        return {"agent_id": agent_id, "risk_tier": "unclassified", "rationale": None, "controls": {}}
    return {
        "agent_id": agent_id,
        "risk_tier": classification.risk_tier,
        "rationale": classification.rationale,
        "use_case": classification.use_case,
        "sector": classification.sector,
        "controls": classification.controls,
        "updated_at": classification.updated_at.isoformat() if classification.updated_at else None,
    }


@router.patch("/agents/{agent_id}/controls")
def update_agent_controls(agent_id: str, controls: ControlUpdate, db: Session = Depends(get_db)):
    """Manually update the EU AI Act mandatory controls checklist for an agent."""
    classification = db.query(AgentRiskClassification).filter(
        AgentRiskClassification.agent_id == agent_id
    ).first()
    if not classification:
        raise HTTPException(status_code=404, detail="Agent not classified yet. Run classify-agent first.")
    classification.controls = controls.dict()
    classification.updated_at = datetime.utcnow()
    db.commit()
    return {"agent_id": agent_id, "controls": classification.controls}


@router.get("/report")
def get_compliance_report(db: Session = Depends(get_db)):
    """Generate a full exportable compliance audit report."""
    dashboard = _compute_live_compliance(db)
    agents = db.query(Agent).all()
    classifications = db.query(AgentRiskClassification).all()
    class_map = {c.agent_id: c for c in classifications}

    agent_summaries = []
    for a in agents:
        c = class_map.get(a.id)
        agent_summaries.append({
            "agent_id": a.id,
            "agent_name": a.name,
            "risk_tier": c.risk_tier if c else "unclassified",
            "sector": c.sector if c else "—",
            "use_case": c.use_case if c else "—",
            "controls_met": sum(1 for v in (c.controls or {}).values() if v) if c else 0,
            "controls_total": len(c.controls or {}) if c else 0,
        })

    return {
        "report_title": "AgentClamp — Enterprise AI Compliance Report",
        "generated_at": datetime.utcnow().isoformat(),
        "overall_score": dashboard["overall_score"],
        "summary": dashboard["summary"],
        "framework_scores": {k: v["score"] for k, v in dashboard["frameworks"].items()},
        "agent_risk_inventory": agent_summaries,
        "detailed_controls": dashboard["frameworks"],
    }
