"""
PATHS Backend — HR Interview Agent State.

Holds all data produced and consumed during one run of the HR Interview Agent pipeline.
"""

from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class HRInterviewState(TypedDict, total=False):
    # ── Inputs ────────────────────────────────────────────────────────────────
    run_id: str                         # Unique ID for this evaluation run
    session_id: str                     # InterviewSession UUID
    candidate_id: str                   # Candidate UUID
    job_id: str                         # Job UUID

    # Recruiter-supplied raw interview notes (free text)
    interview_notes: str

    # Structured answers from the interview (optional — list of {question, answer})
    structured_answers: List[Dict[str, str]]

    # ── Loaded context ────────────────────────────────────────────────────────
    candidate_name: str
    candidate_summary: str
    candidate_skills: List[str]
    candidate_years_experience: Optional[int]
    job_title: str
    job_requirements: str

    # ── Evaluation outputs ────────────────────────────────────────────────────
    # Per-dimension scores 0–100
    communication_score: int
    culture_fit_score: int
    motivation_score: int
    clarity_score: int                  # Clarity of answers / structured thinking

    # Extracted from notes
    strengths: List[str]
    concerns: List[str]

    # Composite score (weighted average of dimensions)
    overall_score: int

    # "proceed" | "hold" | "reject"
    recommendation: str

    # Human-readable summary of the evaluation
    evaluation_summary: str

    # ── Pipeline metadata ─────────────────────────────────────────────────────
    status: str                         # "running" | "completed" | "failed"
    errors: List[str]
    data_warnings: List[str]
