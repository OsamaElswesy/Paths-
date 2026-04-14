"""
PATHS Backend — Sourcing Agent State.

Carries all data through the LangGraph sourcing pipeline.
"""

from typing import Any, Dict, List, Optional, TypedDict


class SourcingState(TypedDict):
    run_id: str                                    # unique run identifier for logging
    query: str                                     # recruiter's natural-language search query
    job_id: Optional[str]                          # optional job context for composite scoring
    limit: int                                     # max candidates to return (capped at 50)

    # Pipeline stage data
    query_embedding: Optional[List[float]]         # embedded query vector (768-dim)
    raw_hits: Optional[List[Dict[str, Any]]]       # raw Qdrant hits (many per candidate)
    aggregated_candidates: Optional[List[Dict]]    # one entry per candidate, max-score aggregated
    results: Optional[List[Dict]]                  # final enriched results with Postgres metadata

    # Control
    errors: List[str]
    status: str                                    # "running" | "completed" | "failed"
    data_warnings: List[str]                       # surfaced to caller, non-fatal
