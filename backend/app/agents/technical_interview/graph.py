"""
PATHS Backend — Technical Interview Agent Graph (LangGraph).

Pipeline:
  validate_inputs → load_context → score_dimensions → check_skill_coverage
      → compute_composite → extract_strengths_concerns → build_summary
      → persist_score → finalize

Any node can route to handle_failure by returning {"status": "failed"}.
"""

import uuid
import logging

from langgraph.graph import StateGraph, END

from app.agents.technical_interview.state import TechnicalInterviewState
from app.agents.technical_interview.nodes import (
    validate_inputs,
    load_context,
    score_dimensions,
    check_skill_coverage,
    compute_composite,
    extract_strengths_concerns,
    build_summary,
    persist_score,
    finalize,
    handle_failure,
)

logger = logging.getLogger(__name__)


def _failed(state: TechnicalInterviewState) -> str:
    return "failed" if state.get("status") == "failed" else "ok"


def build_technical_interview_graph() -> StateGraph:
    graph = StateGraph(TechnicalInterviewState)

    graph.add_node("validate_inputs", validate_inputs)
    graph.add_node("load_context", load_context)
    graph.add_node("score_dimensions", score_dimensions)
    graph.add_node("check_skill_coverage", check_skill_coverage)
    graph.add_node("compute_composite", compute_composite)
    graph.add_node("extract_strengths_concerns", extract_strengths_concerns)
    graph.add_node("build_summary", build_summary)
    graph.add_node("persist_score", persist_score)
    graph.add_node("finalize", finalize)
    graph.add_node("handle_failure", handle_failure)

    graph.set_entry_point("validate_inputs")

    graph.add_conditional_edges("validate_inputs", _failed, {"failed": "handle_failure", "ok": "load_context"})
    graph.add_conditional_edges("load_context", _failed, {"failed": "handle_failure", "ok": "score_dimensions"})
    graph.add_edge("score_dimensions", "check_skill_coverage")
    graph.add_edge("check_skill_coverage", "compute_composite")
    graph.add_edge("compute_composite", "extract_strengths_concerns")
    graph.add_edge("extract_strengths_concerns", "build_summary")
    graph.add_conditional_edges("build_summary", _failed, {"failed": "handle_failure", "ok": "persist_score"})
    graph.add_conditional_edges("persist_score", _failed, {"failed": "handle_failure", "ok": "finalize"})
    graph.add_edge("finalize", END)
    graph.add_edge("handle_failure", END)

    return graph.compile()


def run_technical_interview_evaluation(
    session_id: str,
    candidate_id: str,
    job_id: str,
    interview_notes: str,
    structured_answers: list | None = None,
) -> TechnicalInterviewState:
    """
    Run the Technical Interview evaluation pipeline.

    Returns the final TechnicalInterviewState. Key outputs:
      state["status"]              "completed" | "failed"
      state["overall_score"]       0–100
      state["recommendation"]      "proceed" | "hold" | "reject"
      state["matched_skills"]      skills confirmed in interview
      state["missing_skills"]      required skills not evidenced
      state["dimension_scores"]    per-dimension breakdown
    """
    run_id = str(uuid.uuid4())[:8]
    initial: TechnicalInterviewState = {
        "run_id": run_id,
        "session_id": session_id,
        "candidate_id": candidate_id,
        "job_id": job_id,
        "interview_notes": interview_notes,
        "structured_answers": structured_answers or [],
        "status": "running",
        "errors": [],
        "data_warnings": [],
    }

    app = build_technical_interview_graph()
    logger.info("[tech_interview][run=%s] Starting evaluation for session %s", run_id, session_id)
    result = app.invoke(initial)
    return result
