"""
PATHS Backend — OutreachMessage model.

Records every recruiter-initiated outreach attempt.
No actual message delivery is performed by this model;
the status field tracks delivery state set by external
integrations or manual recruiter updates.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class OutreachMessage(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "outreach_messages"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False, index=True,
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False, index=True,
    )

    # Channel: email | linkedin | sms
    channel: Mapped[str] = mapped_column(String(50), nullable=False, default="email")

    # Status lifecycle: queued → sent → opened → replied | failed
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="queued")

    message_subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    message_body: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Populated when the message is actually dispatched by an integration
    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    # Relationships — lazy selectin keeps it consistent with the rest of the project
    candidate = relationship("Candidate", lazy="selectin")
    job = relationship("Job", lazy="selectin")
