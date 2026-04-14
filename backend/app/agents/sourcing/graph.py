"""
PATHS Backend — Sourcing Agent Graph (LangGraph).

Compiled once at import time (same pattern as cv_ingestion/graph.py).
The sourcing_app instance is imported by the API router and invoked per request.
"""

from langgraph.graph import StateGraph, END

from app.agents.sourcing.state import SourcingState
from app.agents.sourcing.nodes import (
    validate_query,
    embed_query,
    search_qdrant,
    aggregate_by_candidate,
    load_candidate_metadata,
    finalize,
    handle_failure,
)


def _check_failure(state: SourcingState) -> str:
    """Route to error handler if any node set status=failed."""
    if state.get("status") == "failed":
        return "handle_failure"
    return "next"


def build_sourcing_graph():
    workflow = StateGraph(SourcingState)

    workflow.add_node("validate", validate_query)
    workflow.add_node("embed", embed_query)
    workflow.add_node("search", search_qdrant)
    workflow.add_node("aggregate", aggregate_by_candidate)
    workflow.add_node("load_metadata", load_candidate_metadata)
    workflow.add_node("finalize", finalize)
    workflow.add_node("handle_failure", handle_failure)

    workflow.set_entry_point("validate")

    workflow.add_conditional_edges(
        "validate", _check_failure, {"handle_failure": "handle_failure", "next": "embed"}
    )
    workflow.add_conditional_edges(
        "embed", _check_failure, {"handle_failure": "handle_failure", "next": "search"}
    )
    workflow.add_conditional_edges(
        "search", _check_failure, {"handle_failure": "handle_failure", "next": "aggregate"}
    )
    workflow.add_conditional_edges(
        "aggregate", _check_failure, {"handle_failure": "handle_failure", "next": "load_metadata"}
    )
    workflow.add_conditional_edges(
        "load_metadata", _check_failure, {"handle_failure": "handle_failure", "next": "finalize"}
    )
    workflow.add_edge("finalize", END)
    workflow.add_edge("handle_failure", END)

    return workflow.compile()


# Compiled once at import — reused across all requests
sourcing_app = build_sourcing_graph()
