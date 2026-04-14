"""
PATHS Backend — InterviewSession model.

Represents a scheduled interview between a candidate and
one or more interviewers for a specific job application.

Score fields are populated by the HR Interview Agent or Technical Interview Agent
after the session completes. They feed into the Decision Support pipeline.
"""

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class InterviewSession(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "interview_sessions"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False, index=True,
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False, index=True,
    )

    # Type: screening | technical | behavioral | final
    interview_type: Mapped[str] = mapped_column(String(50), nullable=False, default="screening")

    # Status: scheduled | completed | cancelled | needs_scoring
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="scheduled")

    scheduled_date: Mapped[str] = mapped_column(String(20), nullable=False)   # ISO date: YYYY-MM-DD
    scheduled_time: Mapped[str] = mapped_column(String(20), nullable=False)   # e.g. "10:00 AM"
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)

    meeting_link: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # List of interviewer names/IDs as JSON array
    interviewers_json: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Post-interview evaluation fields (populated by Interview Agent or recruiter) ──
    # Overall score 0–100 assigned after the interview completes
    overall_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Structured per-dimension scores as JSON: {"communication": 80, "technical": 70, ...}
    dimension_scores: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Recruiter/interviewer written feedback
    feedback_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Structured strengths and concerns as JSON arrays
    strengths: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    concerns: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # Recommendation from this interview: "proceed" | "hold" | "reject"
    recommendation: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Who submitted the score: "hr_agent" | "technical_agent" | "recruiter"
    scored_by: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    candidate = relationship("Candidate", lazy="selectin")
    job = relationship("Job", lazy="selectin")
