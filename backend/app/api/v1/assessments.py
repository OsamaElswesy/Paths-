"""
PATHS Backend — Technical Assessment API Endpoints.

POST /assessments/                          → create assessment, generate questions
GET  /assessments/{id}                      → fetch session + results
GET  /assessments/?candidate_id=&job_id=    → list sessions
POST /assessments/{id}/submit               → submit answers + run scoring agent
DELETE /assessments/{id}                    → cancel session
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.models.assessment import AssessmentSession

router = APIRouter(prefix="/assessments", tags=["Assessments"])

_VALID_TYPES = {"technical", "domain", "mixed"}
_VALID_STATUSES = {"pending", "in_progress", "submitted", "scored", "cancelled"}


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateAssessmentRequest(BaseModel):
    candidate_id: str
    job_id: str
    assessment_type: str = "technical"
    max_questions: int = 5


class SubmitAnswersRequest(BaseModel):
    # List of {question_id, answer_text}
    answers: list[dict]


# ── Serializer ────────────────────────────────────────────────────────────────

def _serialize(s: AssessmentSession) -> dict:
    return {
        "id": str(s.id),
        "candidateId": str(s.candidate_id),
        "candidateName": s.candidate.full_name if s.candidate else None,
        "jobId": str(s.job_id),
        "jobTitle": s.job.title if s.job else None,
        "status": s.status,
        "assessmentType": s.assessment_type,
        "questions": s.questions_json or [],
        "answers": s.answers_json or [],
        "questionScores": s.question_scores_json or {},
        "overallScore": s.overall_score,
        "result": s.result,
        "summary": s.summary,
        "strengths": s.strengths or [],
        "gaps": s.gaps or [],
        "createdAt": s.created_at.isoformat(),
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/", status_code=201)
def create_assessment(
    body: CreateAssessmentRequest,
    db: Session = Depends(get_db),
) -> Any:
    """
    Create a new technical assessment session.

    Automatically generates questions from the job's structured skill requirements.
    If the job has no skill requirements, falls back to free-text keyword extraction
    from the job description.
    """
    if body.assessment_type not in _VALID_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"assessment_type must be one of: {', '.join(sorted(_VALID_TYPES))}",
        )
    if not (1 <= body.max_questions <= 10):
        raise HTTPException(status_code=422, detail="max_questions must be between 1 and 10")

    try:
        cand_uuid = uuid.UUID(body.candidate_id)
        job_uuid = uuid.UUID(body.job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid candidate_id or job_id UUID")

    from app.agents.technical_assessment.nodes import generate_questions_for_job
    questions = generate_questions_for_job(str(job_uuid), max_questions=body.max_questions)

    session = AssessmentSession(
        candidate_id=cand_uuid,
        job_id=job_uuid,
        assessment_type=body.assessment_type,
        status="pending",
        questions_json=questions,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return _serialize(session)


@router.get("/")
def list_assessments(
    candidate_id: uuid.UUID | None = Query(default=None),
    job_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> Any:
    """List assessment sessions, optionally filtered by candidate or job."""
    filters = []
    if candidate_id:
        filters.append(AssessmentSession.candidate_id == candidate_id)
    if job_id:
        filters.append(AssessmentSession.job_id == job_id)

    q = select(AssessmentSession)
    if filters:
        q = q.where(*filters)
    q = q.order_by(AssessmentSession.created_at.desc()).limit(limit).offset(offset)

    sessions = db.execute(q).scalars().all()
    return {"items": [_serialize(s) for s in sessions], "total": len(sessions)}


@router.get("/{session_id}")
def get_assessment(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> Any:
    """Fetch a single assessment session including questions, answers, and scores."""
    session = db.get(AssessmentSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Assessment session not found")
    return _serialize(session)


@router.post("/{session_id}/submit", status_code=200)
def submit_answers(
    session_id: uuid.UUID,
    body: SubmitAnswersRequest,
    db: Session = Depends(get_db),
) -> Any:
    """
    Submit answers to an assessment and trigger the Technical Assessment Agent scoring pipeline.

    Each answer must have question_id (matching a question from the session)
    and answer_text (the candidate's / recruiter's response).

    The agent scores answers using keyword overlap against expected_keywords,
    computes a weighted composite, and persists the results.
    """
    session = db.get(AssessmentSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Assessment session not found")

    if session.status == "cancelled":
        raise HTTPException(status_code=422, detail="Cannot submit answers to a cancelled session")

    if not body.answers:
        raise HTTPException(status_code=422, detail="answers list cannot be empty")

    from app.agents.technical_assessment.graph import run_assessment_scoring

    result = run_assessment_scoring(
        session_id=str(session_id),
        answers=body.answers,
    )

    if result.get("status") == "failed":
        errors = result.get("errors", ["Scoring failed"])
        raise HTTPException(status_code=422, detail="; ".join(errors))

    # Refresh from DB — agent already persisted scores
    db.expire(session)
    db.refresh(session)

    return {
        **_serialize(session),
        "question_details": result.get("question_details", []),
        "data_warnings": result.get("data_warnings", []),
    }


@router.delete("/{session_id}", status_code=200)
def cancel_assessment(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> Any:
    """Cancel an assessment session."""
    session = db.get(AssessmentSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Assessment session not found")
    if session.status == "scored":
        raise HTTPException(status_code=422, detail="Cannot cancel a scored session")

    session.status = "cancelled"
    db.commit()
    return {"id": str(session.id), "status": session.status}
