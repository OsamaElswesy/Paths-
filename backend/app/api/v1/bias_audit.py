"""
PATHS Backend — Bias & Fairness Audit API Endpoints.

GET /bias-audit/{candidate_id}           → full audit (no job context)
GET /bias-audit/{candidate_id}/{job_id}  → full audit with job description language check
"""

import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.models.candidate import Candidate

router = APIRouter(prefix="/bias-audit", tags=["Bias & Fairness Audit"])


@router.get("/{candidate_id}")
def audit_candidate_bias(
    candidate_id: uuid.UUID,
    job_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
) -> Any:
    """
    Run the Bias & Fairness Audit for a candidate.

    Optionally accepts job_id as a query parameter to also audit
    the job description for biased language.

    Checks performed:
    - Name and location exposure (demographic proxies)
    - Institution prestige bias risk
    - Employment gap penalty risk
    - Age proxy signals (very senior or entry-level candidates)
    - Masculine-coded or exclusionary language in the job description

    Returns:
      fairness_score       0–100 (100 = no bias signals detected)
      overall_risk         "low" | "medium" | "high"
      requires_blind_review  bool
      bias_flags           list of {check, category, risk_level, message, recommendation}
      biased_job_language  list of detected terms in the job description
      summary              human-readable paragraph
    """
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    from app.agents.bias_audit.graph import run_bias_audit

    result = run_bias_audit(
        candidate_id=str(candidate_id),
        job_id=str(job_id) if job_id else None,
    )

    if result.get("status") == "failed":
        errors = result.get("errors", ["Bias audit failed"])
        raise HTTPException(status_code=422, detail="; ".join(errors))

    return {
        "candidate_id": str(candidate_id),
        "job_id": str(job_id) if job_id else None,
        "candidate_name": result.get("candidate_name"),
        "fairness_score": result.get("fairness_score", 100),
        "overall_risk": result.get("overall_risk", "low"),
        "requires_blind_review": result.get("requires_blind_review", False),
        "bias_flags": result.get("bias_flags", []),
        "biased_job_language": result.get("biased_job_language", []),
        "prestige_institutions": result.get("prestige_institutions", []),
        "summary": result.get("summary", ""),
        "data_warnings": result.get("data_warnings", []),
    }
