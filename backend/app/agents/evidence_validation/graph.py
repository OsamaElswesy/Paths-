"""
PATHS Backend — Evidence Validation Agent Graph (LangGraph).

Pipeline:
  validate_inputs → load_candidate_data
      → check_experience_timeline → check_experience_inflation
      → check_education_timeline → check_certifications
      → check_skill_backing → check_profile_completeness
      → compute_trust_score → build_summary → finalize

All nodes are pure analytical — no writes to the database.
The result is returned to the caller who decides whether to surface
it in the UI or attach it to an Application record.
"""

import uuid
import logging

from langgraph.graph import StateGraph, END

from app.agents.evidence_validation.state import EvidenceValidationState
from app.agents.evidence_validation.nodes import (
    validate_inputs,
    load_candidate_data,
    check_experience_timeline,
    check_experience_inflation,
    check_education_timeline,
    check_certifications,
    check_skill_backing,
    check_profile_completeness,
    compute_trust_score,
    build_summary,
    finalize,
    handle_failure,
)

logger = logging.getLogger(__name__)


def _failed(state: EvidenceValidationState) -> str:
    return "failed" if state.get("status") == "failed" else "ok"


def build_evidence_validation_graph() -> StateGraph:
    graph = StateGraph(EvidenceValidationState)

    graph.add_node("validate_inputs", validate_inputs)
    graph.add_node("load_candidate_data", load_candidate_data)
    graph.add_node("check_experience_timeline", check_experience_timeline)
    graph.add_node("check_experience_inflation", check_experience_inflation)
    graph.add_node("check_education_timeline", check_education_timeline)
    graph.add_node("check_certifications", check_certifications)
    graph.add_node("check_skill_backing", check_skill_backing)
    graph.add_node("check_profile_completeness", check_profile_completeness)
    graph.add_node("compute_trust_score", compute_trust_score)
    graph.add_node("build_summary", build_summary)
    graph.add_node("finalize", finalize)
    graph.add_node("handle_failure", handle_failure)

    graph.set_entry_point("validate_inputs")

    graph.add_conditional_edges("validate_inputs", _failed, {"failed": "handle_failure", "ok": "load_candidate_data"})
    graph.add_conditional_edges("load_candidate_data", _failed, {"failed": "handle_failure", "ok": "check_experience_timeline"})

    # All check nodes are sequential and non-failing — they accumulate findings
    graph.add_edge("check_experience_timeline", "check_experience_inflation")
    graph.add_edge("check_experience_inflation", "check_education_timeline")
    graph.add_edge("check_education_timeline", "check_certifications")
    graph.add_edge("check_certifications", "check_skill_backing")
    graph.add_edge("check_skill_backing", "check_profile_completeness")
    graph.add_edge("check_profile_completeness", "compute_trust_score")
    graph.add_edge("compute_trust_score", "build_summary")
    graph.add_edge("build_summary", "finalize")
    graph.add_edge("finalize", END)
    graph.add_edge("handle_failure", END)

    return graph.compile()


def run_evidence_validation(candidate_id: str) -> EvidenceValidationState:
    """
    Run the full evidence validation pipeline for a candidate.

    Returns the final EvidenceValidationState. Key outputs:
      state["trust_score"]          0–100 (100 = no issues)
      state["validation_status"]    "validated" | "needs_review" | "flagged"
      state["findings"]             list of {check, severity, message, detail}
      state["critical_count"]       number of critical findings
      state["warning_count"]        number of warnings
      state["computed_years_experience"]
      state["summary"]              human-readable summary
    """
    run_id = str(uuid.uuid4())[:8]
    initial: EvidenceValidationState = {
        "run_id": run_id,
        "candidate_id": candidate_id,
        "findings": [],
        "status": "running",
        "errors": [],
        "data_warnings": [],
    }

    app = build_evidence_validation_graph()
    logger.info("[evidence_val][run=%s] Starting validation for candidate %s", run_id, candidate_id)
    return app.invoke(initial)
