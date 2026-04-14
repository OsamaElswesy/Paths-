"""
PATHS Backend — Technical Interview Agent State.

Holds all data for one run of the Technical Interview evaluation pipeline.
"""

from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class TechnicalInterviewState(TypedDict, total=False):
    # ── Inputs ────────────────────────────────────────────────────────────────
    run_id: str
    session_id: str
    candidate_id: str
    job_id: str

    # Recruiter/interviewer free-text notes from the technical session
    interview_notes: str

    # Optional structured technical answers {question, answer, expected_answer}
    structured_answers: List[Dict[str, str]]

    # ── Loaded context ────────────────────────────────────────────────────────
    candidate_name: str
    candidate_skills: List[str]
    candidate_years_experience: Optional[int]
    job_title: str
    job_skill_requirements: List[str]   # Normalized skill names required by job

    # ── Evaluation outputs ────────────────────────────────────────────────────
    # Per-dimension scores 0–100
    technical_depth_score: int          # Depth of technical knowledge demonstrated
    problem_solving_score: int          # Analytical and problem-solving ability
    code_quality_score: int             # Code quality awareness (patterns, testing, architecture)
    domain_knowledge_score: int         # Domain / stack-specific knowledge

    # Skill coverage: how many required job skills were evidenced
    skill_coverage_score: int
    matched_skills: List[str]
    missing_skills: List[str]

    # Composite weighted score
    overall_score: int

    # "proceed" | "hold" | "reject"
    recommendation: str

    # Extracted signals
    strengths: List[str]
    concerns: List[str]

    # Human-readable summary
    evaluation_summary: str

    # Dimension breakdown for UI
    dimension_scores: Dict[str, int]

    # ── Pipeline metadata ─────────────────────────────────────────────────────
    status: str
    errors: List[str]
    data_warnings: List[str]
