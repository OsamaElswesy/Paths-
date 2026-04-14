"""
PATHS Backend — Evidence Validation Agent State.

Holds all signals and results for one run of the Evidence Validation pipeline.
"""

from typing import Dict, List, Optional
from typing_extensions import TypedDict


class EvidenceValidationState(TypedDict, total=False):
    # ── Input ─────────────────────────────────────────────────────────────────
    run_id: str
    candidate_id: str

    # ── Loaded raw data ───────────────────────────────────────────────────────
    candidate_name: str
    claimed_years_experience: Optional[int]
    experiences: List[Dict]          # From CandidateExperience
    education: List[Dict]            # From CandidateEducation
    certifications: List[Dict]       # From CandidateCertification
    skills: List[Dict]               # From CandidateSkill (with evidence_text)

    # ── Validation findings ───────────────────────────────────────────────────
    # Each finding: {check, severity, message, detail}
    # severity: "info" | "warning" | "critical"
    findings: List[Dict]

    # Derived actual years of experience from work history
    computed_years_experience: Optional[float]

    # Trust score 0–100 (higher = fewer red flags)
    trust_score: int

    # "validated" | "needs_review" | "flagged"
    validation_status: str

    # Human-readable summary
    summary: str

    # Counts
    critical_count: int
    warning_count: int
    info_count: int

    # ── Pipeline metadata ─────────────────────────────────────────────────────
    status: str
    errors: List[str]
    data_warnings: List[str]
