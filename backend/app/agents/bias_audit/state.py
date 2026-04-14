"""
PATHS Backend — Bias & Fairness Audit Agent State (LangGraph).
"""

from __future__ import annotations
from typing import List, Optional
from typing_extensions import TypedDict


class BiasAuditState(TypedDict, total=False):
    # ── Inputs ────────────────────────────────────────────────────────────────
    run_id: str
    candidate_id: str
    job_id: Optional[str]

    # ── Loaded data ───────────────────────────────────────────────────────────
    candidate_name: Optional[str]
    candidate_location: Optional[str]
    candidate_years_experience: Optional[int]
    education_institutions: List[str]
    employment_gaps: List[dict]        # [{months, label}]
    job_title: Optional[str]
    job_description: Optional[str]
    job_requirements: Optional[str]

    # ── Audit findings ────────────────────────────────────────────────────────
    bias_flags: List[dict]             # [{check, category, risk_level, message, recommendation}]
    biased_job_language: List[str]     # detected biased words/phrases in JD
    prestige_institutions: List[str]   # elite schools found in candidate education

    # ── Scores ───────────────────────────────────────────────────────────────
    fairness_score: int                # 0–100 (100 = no signals)
    overall_risk: str                  # "low" | "medium" | "high"
    requires_blind_review: bool

    # ── Meta ──────────────────────────────────────────────────────────────────
    summary: str
    data_warnings: List[str]
    errors: List[str]
    status: str                        # "completed" | "failed"
