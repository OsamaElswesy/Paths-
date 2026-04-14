"""
PATHS Backend — Bias & Fairness Audit Agent Graph (LangGraph).

Pipeline:
  validate_inputs
    → load_candidate_data   (failed → handle_failure)
    → load_job_data
    → check_demographic_proxies
    → check_job_language
    → compute_fairness_score
    → build_summary
    → finalize

All steps after candidate load are non-fatal — errors are collected as
data_warnings so the audit always returns a result.
"""

from __future__ import annotations

import uuid as _uuid_mod

from langgraph.graph import END, StateGraph

from .state import BiasAuditState
from .nodes import (
    validate_inputs,
    load_candidate_data,
    load_job_data,
    check_demographic_proxies,
    check_job_language,
    compute_fairness_score,
    build_summary,
    finalize,
    handle_failure,
)


def _route_after_validate(state: dict) -> str:
    return "failed" if state.get("status") == "failed" else "ok"


def _route_after_load(state: dict) -> str:
    return "failed" if state.get("status") == "failed" else "ok"


def _build_graph() -> StateGraph:
    g = StateGraph(BiasAuditState)

    g.add_node("validate_inputs", validate_inputs)
    g.add_node("load_candidate_data", load_candidate_data)
    g.add_node("load_job_data", load_job_data)
    g.add_node("check_demographic_proxies", check_demographic_proxies)
    g.add_node("check_job_language", check_job_language)
    g.add_node("compute_fairness_score", compute_fairness_score)
    g.add_node("build_summary", build_summary)
    g.add_node("finalize", finalize)
    g.add_node("handle_failure", handle_failure)

    g.set_entry_point("validate_inputs")

    g.add_conditional_edges(
        "validate_inputs",
        _route_after_validate,
        {"ok": "load_candidate_data", "failed": "handle_failure"},
    )
    g.add_conditional_edges(
        "load_candidate_data",
        _route_after_load,
        {"ok": "load_job_data", "failed": "handle_failure"},
    )
    g.add_edge("load_job_data", "check_demographic_proxies")
    g.add_edge("check_demographic_proxies", "check_job_language")
    g.add_edge("check_job_language", "compute_fairness_score")
    g.add_edge("compute_fairness_score", "build_summary")
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


def run_bias_audit(
    candidate_id: str,
    job_id: str | None = None,
) -> dict:
    """
    Run the Bias & Fairness Audit for a candidate/job pair.

    Args:
        candidate_id: UUID of the candidate to audit.
        job_id:       Optional UUID of the job — enables job description language check.

    Returns:
        Final state dict from the LangGraph run.
    """
    initial_state: BiasAuditState = {
        "run_id": str(_uuid_mod.uuid4()),
        "candidate_id": candidate_id,
        "job_id": job_id or "",
        "bias_flags": [],
        "biased_job_language": [],
        "prestige_institutions": [],
        "data_warnings": [],
        "errors": [],
    }
    graph = _get_graph()
    result = graph.invoke(initial_state)
    return result
