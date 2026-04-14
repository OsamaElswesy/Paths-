"""
PATHS Backend — Interview Quality Control Agent Graph (LangGraph).

Pipeline:
  validate_inputs
    → load_session_data   (failed → handle_failure)
    → check_note_length
    → check_specificity
    → check_bias_language
    → check_score_rationale
    → check_note_balance
    → compute_quality_score
    → build_summary
    → finalize
"""

from __future__ import annotations

import uuid as _uuid_mod

from langgraph.graph import END, StateGraph

from .state import InterviewQCState
from .nodes import (
    validate_inputs,
    load_session_data,
    check_note_length,
    check_specificity,
    check_bias_language,
    check_score_rationale,
    check_note_balance,
    compute_quality_score,
    build_summary,
    finalize,
    handle_failure,
)


def _route_after_validate(state: dict) -> str:
    return "failed" if state.get("status") == "failed" else "ok"


def _route_after_load(state: dict) -> str:
    return "failed" if state.get("status") == "failed" else "ok"


def _build_graph() -> StateGraph:
    g = StateGraph(InterviewQCState)

    g.add_node("validate_inputs", validate_inputs)
    g.add_node("load_session_data", load_session_data)
    g.add_node("check_note_length", check_note_length)
    g.add_node("check_specificity", check_specificity)
    g.add_node("check_bias_language", check_bias_language)
    g.add_node("check_score_rationale", check_score_rationale)
    g.add_node("check_note_balance", check_note_balance)
    g.add_node("compute_quality_score", compute_quality_score)
    g.add_node("build_summary", build_summary)
    g.add_node("finalize", finalize)
    g.add_node("handle_failure", handle_failure)

    g.set_entry_point("validate_inputs")

    g.add_conditional_edges(
        "validate_inputs",
        _route_after_validate,
        {"ok": "load_session_data", "failed": "handle_failure"},
    )
    g.add_conditional_edges(
        "load_session_data",
        _route_after_load,
        {"ok": "check_note_length", "failed": "handle_failure"},
    )
    g.add_edge("check_note_length", "check_specificity")
    g.add_edge("check_specificity", "check_bias_language")
    g.add_edge("check_bias_language", "check_score_rationale")
    g.add_edge("check_score_rationale", "check_note_balance")
    g.add_edge("check_note_balance", "compute_quality_score")
    g.add_edge("compute_quality_score", "build_summary")
    g.add_edge("build_summary", "finalize")
    g.add_edge("finalize", END)
    g.add_edge("handle_failure", END)

    return g


_compiled_graph = None


def _get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = _build_graph().compile()
    return _compiled_graph


def run_interview_qc(session_id: str) -> dict:
    """
    Run the Interview Quality Control audit for a session.

    Args:
        session_id: UUID of the InterviewSession to evaluate.

    Returns:
        Final state dict from the LangGraph run.
    """
    initial_state: InterviewQCState = {
        "run_id": str(_uuid_mod.uuid4()),
        "session_id": session_id,
        "quality_flags": [],
        "bias_language_detected": [],
        "evidence_markers_found": [],
        "data_warnings": [],
        "errors": [],
    }
    graph = _get_graph()
    result = graph.invoke(initial_state)
    return result
