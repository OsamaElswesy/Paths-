"""
PATHS Backend - Job Ingestion Graph
"""
from langgraph.graph import StateGraph, END
from app.agents.job_ingestion.state import JobIngestionState
from app.agents.job_ingestion.nodes import (
    fetch_jobs_node,
    parse_source_node,
    normalize_job_node,
    extract_skills_node,
    deduplicate_job_node,
    persist_job_node,
    project_to_qdrant_node,
    finalize_run_node,
    handle_error_node
)

def _route_after_finalize(state: JobIngestionState) -> str:
    """Route to error handler only when the run accumulated errors, else terminate."""
    if state.get("errors"):
        return "handle_error"
    return "end"


def build_job_ingestion_graph():
    workflow = StateGraph(JobIngestionState)

    workflow.add_node("fetch", fetch_jobs_node)
    workflow.add_node("parse", parse_source_node)
    workflow.add_node("normalize", normalize_job_node)
    workflow.add_node("extract_skills", extract_skills_node)
    workflow.add_node("deduplicate", deduplicate_job_node)
    workflow.add_node("persist", persist_job_node)
    workflow.add_node("project", project_to_qdrant_node)
    workflow.add_node("finalize", finalize_run_node)
    workflow.add_node("handle_error", handle_error_node)

    workflow.set_entry_point("fetch")

    workflow.add_edge("fetch", "parse")
    workflow.add_edge("parse", "normalize")
    workflow.add_edge("normalize", "extract_skills")
    workflow.add_edge("extract_skills", "deduplicate")
    workflow.add_edge("deduplicate", "persist")
    workflow.add_edge("persist", "project")
    workflow.add_edge("project", "finalize")
    workflow.add_conditional_edges(
        "finalize",
        _route_after_finalize,
        {"handle_error": "handle_error", "end": END},
    )
    workflow.add_edge("handle_error", END)

    return workflow.compile()
