"""
PATHS Backend — Evidence Validation API Endpoints.

GET /evidence-validation/{candidate_id}  → run full evidence validation pipeline

The Evidence Validation Agent is read-only — it does not write to the database.
It reads CandidateExperience, CandidateEducation, CandidateCertification,
and CandidateSkill records and runs 8 logical consistency checks, returning
a trust score (0–100) and structured findings.
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.models.candidate import Candidate

router = APIRouter(prefix="/evidence-validation", tags=["Evidence Validation"])


@router.get("/{candidate_id}")
def validate_candidate_evidence(
    candidate_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> Any:
    """
    Run the Evidence Validation Agent for a candidate.

    Reads all stored CV entity data (experiences, education, certifications, skills)
    and performs 8 deterministic consistency checks:

    1. Experience timeline — date order, future start dates
    2. Employment gaps — unexplained gaps > 6 months
    3. Overlapping roles — concurrent jobs > 3 months overlap
    4. Short tenures — multiple roles < 3 months
    5. Experience inflation — claimed years vs work history
    6. Education timeline — degree date consistency
    7. Certification expiry — expired certs
    8. Skill backing — skills without supporting experience entries

    Returns:
      trust_score        0–100 (100 = no issues found)
      validation_status  "validated" | "needs_review" | "flagged"
      findings           list of {check, severity, message, detail}
      summary            human-readable paragraph
    """
    # Verify candidate exists before running the pipeline
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    from app.agents.evidence_validation.graph import run_evidence_validation

    result = run_evidence_validation(candidate_id=str(candidate_id))

    if result.get("status") == "failed":
        errors = result.get("errors", ["Evidence validation failed"])
        raise HTTPException(status_code=422, detail="; ".join(errors))

    return {
        "candidate_id": str(candidate_id),
        "candidate_name": result.get("candidate_name"),
        "trust_score": result.get("trust_score", 0),
        "validation_status": result.get("validation_status", "needs_review"),
        "critical_count": result.get("critical_count", 0),
        "warning_count": result.get("warning_count", 0),
        "info_count": result.get("info_count", 0),
        "findings": result.get("findings", []),
        "computed_years_experience": result.get("computed_years_experience"),
        "claimed_years_experience": result.get("claimed_years_experience"),
        "summary": result.get("summary", ""),
        "data_warnings": result.get("data_warnings", []),
    }
