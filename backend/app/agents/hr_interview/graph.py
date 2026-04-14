"""
PATHS Backend — HR Interview Agent Graph (LangGraph).

Pipeline:
  validate_inputs → load_context → score_dimensions → compute_composite
      → extract_strengths_concerns → build_summary → persist_score → finalize

Any node can transition to handle_failure by returning {"status": "failed"}.
No LLM is required in v1 — all scoring is deterministic keyword-rubric based.
"""

import uuid
import logging

from langgraph.graph import StateGraph, END

from app.agents.hr_interview.state import HRInterviewState
from app.agents.hr_interview.nodes import (
    validate_inputs,
    load_context,
    score_dimensions,
    compute_composite,
    extract_strengths_concerns,
    build_summary,
    persist_score,
    finalize,
    handle_failure,
)

logger = logging.getLogger(__name__)


def _failed(state: HRInterviewState) -> str:
    return "failed" if state.get("status") == "failed" else "ok"


def build_hr_interview_graph() -> StateGraph:
    graph = StateGraph(HRInterviewState)

    graph.add_node("validate_inputs", validate_inputs)
    graph.add_node("load_context", load_context)
    graph.add_node("score_dimensions", score_dimensions)
    graph.add_node("compute_composite", compute_composite)
    graph.add_node("extract_strengths_concerns", extract_strengths_concerns)
    graph.add_node("build_summary", build_summary)
    graph.add_node("persist_score", persist_score)
    graph.add_node("finalize", finalize)
    graph.add_node("handle_failure", handle_failure)

    graph.set_entry_point("validate_inputs")

    graph.add_conditional_edges("validate_inputs", _failed, {"failed": "handle_failure", "ok": "load_context"})
    graph.add_conditional_edges("load_context", _failed, {"failed": "handle_failure", "ok": "score_dimensions"})
    graph.add_edge("score_dimensions", "compute_composite")
    graph.add_edge("compute_composite", "extract_strengths_concerns")
    graph.add_edge("extract_strengths_concerns", "build_summary")
    graph.add_conditional_edges("build_summary", _failed, {"failed": "handle_failure", "ok": "persist_score"})
    graph.add_conditional_edges("persist_score", _failed, {"failed": "handle_failure", "ok": "finalize"})
    graph.add_edge("finalize", END)
    graph.add_edge("handle_failure", END)

    return graph.compile()


def run_hr_interview_evaluation(
    session_id: str,
    candidate_id: str,
    job_id: str,
    interview_notes: str,
    structured_answers: list | None = None,
) -> HRInterviewState:
    """
    Run the HR Interview evaluation pipeline.

    Returns the final HRInterviewState — callers can inspect:
      state["status"]           "completed" | "failed"
      state["overall_score"]    0–100
      state["recommendation"]   "proceed" | "hold" | "reject"
      state["evaluation_summary"]
      state["strengths"], state["concerns"]
      state["errors"], state["data_warnings"]
    """
    run_id = str(uuid.uuid4())[:8]
    initial: HRInterviewState = {
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

    app = build_hr_interview_graph()
    logger.info("[hr_interview][run=%s] Starting evaluation for session %s", run_id, session_id)
    result = app.invoke(initial)
    return result
