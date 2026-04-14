"""
PATHS Backend — Interview Quality Control Agent State (LangGraph).
"""

from __future__ import annotations
from typing import List, Optional
from typing_extensions import TypedDict


class InterviewQCState(TypedDict, total=False):
    # ── Inputs ────────────────────────────────────────────────────────────────
    run_id: str
    session_id: str

    # ── Loaded session data ───────────────────────────────────────────────────
    interview_type: Optional[str]
    notes: Optional[str]
    notes_word_count: int
    structured_answers: List[dict]
    overall_score: Optional[int]
    feedback_text: Optional[str]
    candidate_name: Optional[str]
    job_title: Optional[str]

    # ── QC findings ───────────────────────────────────────────────────────────
    quality_flags: List[dict]          # [{check, severity, message, recommendation}]
    bias_language_detected: List[str]  # specific biased phrases found in notes
    evidence_markers_found: List[str]  # STAR method markers detected

    # ── Scores ───────────────────────────────────────────────────────────────
    quality_score: int                 # 0–100
    quality_level: str                 # "poor" | "adequate" | "good" | "excellent"

    # ── Meta ──────────────────────────────────────────────────────────────────
    summary: str
    data_warnings: List[str]
    errors: List[str]
    status: str                        # "completed" | "failed"
