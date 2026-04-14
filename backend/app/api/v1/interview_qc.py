"""
PATHS Backend — Interview Quality Control API Endpoints.

GET /interview-qc/{session_id}  → run quality audit on a completed interview session
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.models.interview import InterviewSession

router = APIRouter(prefix="/interview-qc", tags=["Interview Quality Control"])


@router.get("/{session_id}")
def check_interview_quality(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> Any:
    """
    Run the Interview Quality Control audit for a completed session.

    Evaluates the quality of interview notes and scoring to ensure downstream
    decisions are based on substantive, unbiased evidence.

    Checks performed:
    - Note length (< 20 words = critical, < 50 = warning)
    - Specificity (vague adjective ratio vs concrete evidence)
    - Bias language (coded phrases in notes)
    - Score rationale (if scored, is there explanatory text?)
    - Note balance (one-sided positive or negative notes flagged)
    - STAR method evidence markers

    Returns:
      quality_score          0–100
      quality_level          "poor" | "adequate" | "good" | "excellent"
      quality_flags          list of {check, severity, message, recommendation}
      bias_language_detected list of biased phrases found in notes
      evidence_markers_found list of STAR-method markers detected
      summary                human-readable paragraph
    """
    session = db.get(InterviewSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    from app.agents.interview_qc.graph import run_interview_qc

    result = run_interview_qc(session_id=str(session_id))

    if result.get("status") == "failed":
        errors = result.get("errors", ["Interview QC failed"])
        raise HTTPException(status_code=422, detail="; ".join(errors))

    return {
        "session_id": str(session_id),
        "interview_type": result.get("interview_type"),
        "candidate_name": result.get("candidate_name"),
        "job_title": result.get("job_title"),
        "notes_word_count": result.get("notes_word_count", 0),
        "quality_score": result.get("quality_score", 0),
        "quality_level": result.get("quality_level", "poor"),
        "quality_flags": result.get("quality_flags", []),
        "bias_language_detected": result.get("bias_language_detected", []),
        "evidence_markers_found": result.get("evidence_markers_found", []),
        "summary": result.get("summary", ""),
        "data_warnings": result.get("data_warnings", []),
    }
