"""
PATHS Backend — Interview Sessions API Endpoints.

Manages scheduled interview sessions for candidate/job pairs.

GET   /interviews?job_id=&candidate_id=&date=  → list sessions
POST  /interviews                               → schedule a new session
PATCH /interviews/{id}/status                   → update session status
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.models.interview import InterviewSession

router = APIRouter(prefix="/interviews", tags=["Interviews"])

_VALID_TYPES = {"screening", "technical", "behavioral", "final"}
_VALID_STATUSES = {"scheduled", "completed", "cancelled", "needs_scoring"}

# Map snake_case DB values to the Title Case the frontend expects
_TYPE_LABEL = {
    "screening": "Screening",
    "technical": "Technical",
    "behavioral": "Behavioral",
    "final": "Final",
}
_STATUS_LABEL = {
    "scheduled": "Scheduled",
    "completed": "Completed",
    "cancelled": "Cancelled",
    "needs_scoring": "Needs Scoring",
}


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateInterviewRequest(BaseModel):
    candidate_id: str
    job_id: str
    interview_type: str = "screening"
    scheduled_date: str          # YYYY-MM-DD
    scheduled_time: str          # "10:00 AM"
    duration_minutes: int = 60
    meeting_link: str | None = None
    interviewers: list[str] = []
    notes: str | None = None


class UpdateStatusRequest(BaseModel):
    status: str


# ── Helper ────────────────────────────────────────────────────────────────────

def _serialize(session: InterviewSession) -> dict:
    return {
        "id": str(session.id),
        "candidateId": str(session.candidate_id),
        "candidateName": session.candidate.full_name if session.candidate else None,
        "jobId": str(session.job_id),
        "jobTitle": session.job.title if session.job else None,
        "date": session.scheduled_date,
        "time": session.scheduled_time,
        "type": _TYPE_LABEL.get(session.interview_type, session.interview_type.capitalize()),
        "status": _STATUS_LABEL.get(session.status, session.status.capitalize()),
        "interviewers": session.interviewers_json or [],
        "meetingLink": session.meeting_link,
        "durationMinutes": session.duration_minutes,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/")
def list_interviews(
    job_id: uuid.UUID | None = Query(default=None),
    candidate_id: uuid.UUID | None = Query(default=None),
    date: str | None = Query(default=None, description="Filter by scheduled_date (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> Any:
    """List interview sessions with optional filters."""
    filters = []
    if job_id:
        filters.append(InterviewSession.job_id == job_id)
    if candidate_id:
        filters.append(InterviewSession.candidate_id == candidate_id)
    if date:
        filters.append(InterviewSession.scheduled_date == date)

    query = select(InterviewSession)
    if filters:
        query = query.where(*filters)
    query = query.order_by(InterviewSession.scheduled_date, InterviewSession.scheduled_time).limit(limit).offset(offset)

    sessions = db.execute(query).scalars().all()
    return {"items": [_serialize(s) for s in sessions]}


@router.post("/", status_code=201)
def create_interview(
    body: CreateInterviewRequest,
    db: Session = Depends(get_db),
) -> Any:
    """Schedule a new interview session."""
    if body.interview_type not in _VALID_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"interview_type must be one of: {', '.join(sorted(_VALID_TYPES))}",
        )

    try:
        cand_uuid = uuid.UUID(body.candidate_id)
        job_uuid = uuid.UUID(body.job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid candidate_id or job_id UUID")

    session = InterviewSession(
        candidate_id=cand_uuid,
        job_id=job_uuid,
        interview_type=body.interview_type,
        status="scheduled",
        scheduled_date=body.scheduled_date,
        scheduled_time=body.scheduled_time,
        duration_minutes=body.duration_minutes,
        meeting_link=body.meeting_link,
        interviewers_json=body.interviewers,
        notes=body.notes,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _serialize(session)


@router.patch("/{session_id}/status")
def update_interview_status(
    session_id: uuid.UUID,
    body: UpdateStatusRequest,
    db: Session = Depends(get_db),
) -> Any:
    """Update the status of an interview session."""
    if body.status not in _VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"status must be one of: {', '.join(sorted(_VALID_STATUSES))}",
        )

    session = db.get(InterviewSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    previous = session.status
    session.status = body.status
    db.commit()
    return {"id": str(session.id), "previous_status": previous, "status": session.status}
