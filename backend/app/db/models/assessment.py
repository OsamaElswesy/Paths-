"""
PATHS Backend — AssessmentSession model.

Represents a structured technical assessment assigned to a candidate
for a specific job. Questions are generated from job skill requirements;
answers are submitted by the recruiter after the session, or auto-scored
from submitted text.
"""

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AssessmentSession(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "assessment_sessions"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False, index=True,
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False, index=True,
    )

    # "pending" | "in_progress" | "submitted" | "scored" | "cancelled"
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")

    # Assessment type: "technical" | "domain" | "mixed"
    assessment_type: Mapped[str] = mapped_column(String(50), nullable=False, default="technical")

    # Generated questions as a JSON array of {id, question, expected_keywords, difficulty}
    questions_json: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # Candidate / recruiter answers as JSON array of {question_id, answer_text}
    answers_json: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # Per-question scores as JSON {question_id: score}
    question_scores_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Composite score 0–100
    overall_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # "pass" | "fail" | "borderline"
    result: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Agent-generated summary of the assessment outcome
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Strengths / concerns extracted from answers
    strengths: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    gaps: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    candidate = relationship("Candidate", lazy="selectin")
    job = relationship("Job", lazy="selectin")
