"""
PATHS Backend — Decisions / Evaluation API Endpoints.

GET  /decisions/{candidate_id}?job_id=  → run scoring service, return result
POST /decisions/{candidate_id}/finalize → persist hire/reject decision to Application + AuditEvent
"""

from uuid import UUID
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.models.application import Application, AuditEvent
from app.services.scoring_service import score_candidate_against_job

router = APIRouter(prefix="/decisions", tags=["Decisions"])


# ── Request / Response schemas ────────────────────────────────────────────────

class FinalizeDecisionRequest(BaseModel):
    job_id: str
    decision: str           # "hired" | "rejected" | "on_hold"
    actor_id: str = "system"
    notes: str | None = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/{candidate_id}")
def get_decision_support_data(
    candidate_id: UUID,
    job_id: UUID | None = Query(default=None, description="Job to score the candidate against"),
    db: Session = Depends(get_db),
) -> Any:
    """
    Run the deterministic scoring service and return all signals for decision support.

    job_id is optional: omitting it returns profile-quality signal only
    (all job-specific scores default to neutral, data_warnings will be emitted).
    """
    result = score_candidate_against_job(
        candidate_id=candidate_id,
        job_id=job_id,
        db=db,
    )

    return {
        "candidate_id": result.candidate_id,
        "job_id": result.job_id,
        "score": result.score,
        "confidence_level": result.confidence_level,
        "recommendation": result.recommendation,
        "skill_score": result.skill_score,
        "experience_score": result.experience_score,
        "profile_completeness_score": result.profile_completeness_score,
        "key_factors": result.key_factors,
        "gap_factors": result.gap_factors,
        "bias_flags": result.bias_flags,
        "data_warnings": result.data_warnings,
    }


@router.post("/{candidate_id}/finalize")
def finalize_decision(
    candidate_id: UUID,
    body: FinalizeDecisionRequest,
    db: Session = Depends(get_db),
) -> Any:
    """
    Persist a human hiring decision.

    Finds the Application for (candidate_id, job_id) and updates overall_status.
    Writes an AuditEvent for the human-in-the-loop record.

    Decision values: "hired" | "rejected" | "on_hold"
    """
    allowed = {"hired", "rejected", "on_hold"}
    if body.decision not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"decision must be one of: {', '.join(sorted(allowed))}",
        )

    try:
        job_uuid = UUID(body.job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job_id UUID")

    # Find the application — PATHS requires a human to confirm, not auto-reject
    application = db.execute(
        select(Application).where(
            Application.candidate_id == candidate_id,
            Application.job_id == job_uuid,
        )
    ).scalar_one_or_none()

    if application is None:
        raise HTTPException(
            status_code=404,
            detail="No application found for this candidate + job combination",
        )

    previous_status = application.overall_status
    application.overall_status = body.decision

    # Audit trail — every decision must be auditable
    audit = AuditEvent(
        actor_type="human",
        actor_id=body.actor_id,
        entity_type="application",
        entity_id=str(application.id),
        action=f"decision_{body.decision}",
        before_jsonb={"overall_status": previous_status},
        after_jsonb={
            "overall_status": body.decision,
            "notes": body.notes,
        },
    )
    db.add(audit)
    db.commit()

    return {
        "application_id": str(application.id),
        "candidate_id": str(candidate_id),
        "job_id": body.job_id,
        "decision": body.decision,
        "previous_status": previous_status,
        "audit_recorded": True,
    }
