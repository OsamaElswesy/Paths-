"""
PATHS Backend — Technical Assessment Agent State.
"""

from typing import Dict, List, Optional
from typing_extensions import TypedDict


class TechnicalAssessmentState(TypedDict, total=False):
    # ── Inputs ────────────────────────────────────────────────────────────────
    run_id: str
    session_id: str           # AssessmentSession UUID (pre-created by API)
    candidate_id: str
    job_id: str

    # Recruiter-submitted answers as list of {question_id, answer_text}
    answers: List[Dict[str, str]]

    # ── Loaded context ────────────────────────────────────────────────────────
    candidate_name: str
    candidate_skills: List[str]
    job_title: str
    questions: List[Dict]     # Loaded from AssessmentSession.questions_json

    # ── Scoring outputs ───────────────────────────────────────────────────────
    # Per-question scores: {question_id: score}
    question_scores: Dict[str, int]

    # Matched / missed skills per question
    question_details: List[Dict]   # {question_id, question, answer, score, matched, missed}

    # Aggregate
    overall_score: int
    result: str               # "pass" | "fail" | "borderline"
    strengths: List[str]
    gaps: List[str]
    summary: str

    # ── Pipeline metadata ─────────────────────────────────────────────────────
    status: str
    errors: List[str]
    data_warnings: List[str]
