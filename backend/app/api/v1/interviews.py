"""
PATHS Backend — Interview Sessions API Endpoints.

Manages scheduled interview sessions for candidate/job pairs.

GET   /interviews?job_id=&candidate_id=&date=  → list sessions
POST  /interviews                               → schedule a new session
PATCH /interviews/{id}/status                   → update session status
POST  /interviews/{id}/score                    → submit manual evaluation score
POST  /interviews/{id}/evaluate/hr              → run HR Interview Agent evaluation
POST  /interviews/{id}/evaluate/technical       → run Technical Interview Agent evaluation
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


class ScoreInterviewRequest(BaseModel):
    overall_score: int                      # 0–100
    feedback_text: str | None = None
    strengths: list[str] = []
    concerns: list[str] = []
    recommendation: str = "proceed"         # "proceed" | "hold" | "reject"
    scored_by: str = "recruiter"            # "hr_agent" | "technical_agent" | "recruiter"
    # Optional per-dimension breakdown for richer explainability
    dimension_scores: dict | None = None    # e.g. {"communication": 80, "technical": 70}


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
        # Evaluation fields — None until score is submitted
        "overallScore": session.overall_score,
        "dimensionScores": session.dimension_scores,
        "feedbackText": session.feedback_text,
        "strengths": session.strengths or [],
        "concerns": session.concerns or [],
        "recommendation": session.recommendation,
        "scoredBy": session.scored_by,
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


@router.post("/{session_id}/score", status_code=200)
def score_interview(
    session_id: uuid.UUID,
    body: ScoreInterviewRequest,
    db: Session = Depends(get_db),
) -> Any:
    """
    Submit an evaluation score for a completed interview session.

    Accepts recruiter-entered scores or scores produced by the HR Interview Agent
    or Technical Interview Agent. Automatically marks the session as 'completed'
    and writes the evaluation fields.

    overall_score: 0–100 composite score for this interview.
    recommendation: "proceed" | "hold" | "reject"
    scored_by: "hr_agent" | "technical_agent" | "recruiter"
    """
    _VALID_RECOMMENDATIONS = {"proceed", "hold", "reject"}
    if body.recommendation not in _VALID_RECOMMENDATIONS:
        raise HTTPException(
            status_code=422,
            detail=f"recommendation must be one of: {', '.join(sorted(_VALID_RECOMMENDATIONS))}",
        )
    if not (0 <= body.overall_score <= 100):
        raise HTTPException(status_code=422, detail="overall_score must be between 0 and 100")

    session = db.get(InterviewSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    session.overall_score = body.overall_score
    session.feedback_text = body.feedback_text
    session.strengths = body.strengths or []
    session.concerns = body.concerns or []
    session.recommendation = body.recommendation
    session.scored_by = body.scored_by
    session.dimension_scores = body.dimension_scores

    # Auto-transition to 'completed' when a score is submitted
    if session.status in {"scheduled", "needs_scoring"}:
        session.status = "completed"

    db.commit()
    db.refresh(session)
    return _serialize(session)


# ── Agent-powered evaluation endpoints ────────────────────────────────────────

class AgentEvaluationRequest(BaseModel):
    """Request body for both HR and Technical agent evaluation endpoints."""
    interview_notes: str
    # Optional: list of {question, answer} pairs for richer evaluation
    structured_answers: list[dict] = []


@router.post("/{session_id}/evaluate/hr", status_code=200)
def evaluate_hr_interview(
    session_id: uuid.UUID,
    body: AgentEvaluationRequest,
    db: Session = Depends(get_db),
) -> Any:
    """
    Run the HR Interview Agent against this session.

    The agent evaluates recruiter notes using a keyword-rubric across:
    Communication, Culture Fit, Motivation, and Clarity dimensions.
    Scores are persisted automatically. The session status is set to 'completed'.

    interview_notes: free-text recruiter observations from the HR interview.
    structured_answers: optional list of {question, answer} pairs.
    """
    session = db.get(InterviewSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    from app.agents.hr_interview.graph import run_hr_interview_evaluation

    result = run_hr_interview_evaluation(
        session_id=str(session_id),
        candidate_id=str(session.candidate_id),
        job_id=str(session.job_id),
        interview_notes=body.interview_notes,
        structured_answers=body.structured_answers,
    )

    if result.get("status") == "failed":
        errors = result.get("errors", ["Unknown evaluation error"])
        raise HTTPException(status_code=422, detail="; ".join(errors))

    # Refresh session from DB (agent already persisted the score)
    db.expire(session)
    db.refresh(session)

    return {
        **_serialize(session),
        "agent": "hr_interview",
        "data_warnings": result.get("data_warnings", []),
    }


@router.post("/{session_id}/evaluate/technical", status_code=200)
def evaluate_technical_interview(
    session_id: uuid.UUID,
    body: AgentEvaluationRequest,
    db: Session = Depends(get_db),
) -> Any:
    """
    Run the Technical Interview Agent against this session.

    Evaluates recruiter notes across Technical Depth, Problem Solving,
    Code Quality, Domain Knowledge, and Skill Coverage dimensions.
    Also cross-references candidate skills against job requirements.
    Scores are persisted automatically.

    interview_notes: free-text notes from the technical interview.
    structured_answers: optional list of {question, answer, expected_answer} dicts.
    """
    session = db.get(InterviewSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    from app.agents.technical_interview.graph import run_technical_interview_evaluation

    result = run_technical_interview_evaluation(
        session_id=str(session_id),
        candidate_id=str(session.candidate_id),
        job_id=str(session.job_id),
        interview_notes=body.interview_notes,
        structured_answers=body.structured_answers,
    )

    if result.get("status") == "failed":
        errors = result.get("errors", ["Unknown evaluation error"])
        raise HTTPException(status_code=422, detail="; ".join(errors))

    db.expire(session)
    db.refresh(session)

    return {
        **_serialize(session),
        "agent": "technical_interview",
        "matched_skills": result.get("matched_skills", []),
        "missing_skills": result.get("missing_skills", []),
        "data_warnings": result.get("data_warnings", []),
    }
