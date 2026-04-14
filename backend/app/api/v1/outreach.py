"""
PATHS Backend — Outreach API Endpoints.

Records recruiter outreach attempts. No actual message delivery
is performed by this service; an external integration (email relay,
LinkedIn API) would update the status field independently.

GET  /outreach?job_id=&candidate_id=  → list outreach messages
POST /outreach                         → create outreach record (status=queued)
PATCH /outreach/{id}/status            → update delivery status
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.models.outreach import OutreachMessage

router = APIRouter(prefix="/outreach", tags=["Outreach"])

_VALID_CHANNELS = {"email", "linkedin", "sms"}
_VALID_STATUSES = {"draft", "queued", "sent", "failed", "opened", "replied"}


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateOutreachRequest(BaseModel):
    candidate_id: str
    job_id: str
    channel: str = "email"
    message_subject: str | None = None
    message_body: str | None = None


class UpdateStatusRequest(BaseModel):
    status: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/")
def list_outreach(
    job_id: uuid.UUID | None = Query(default=None),
    candidate_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> Any:
    """List outreach messages, optionally scoped to a job or candidate."""
    filters = []
    if job_id:
        filters.append(OutreachMessage.job_id == job_id)
    if candidate_id:
        filters.append(OutreachMessage.candidate_id == candidate_id)

    query = select(OutreachMessage)
    if filters:
        query = query.where(*filters)
    query = query.order_by(OutreachMessage.created_at.desc()).limit(limit).offset(offset)

    messages = db.execute(query).scalars().all()

    return {
        "items": [
            {
                "id": str(m.id),
                "candidate_id": str(m.candidate_id),
                "candidate_name": m.candidate.full_name if m.candidate else None,
                "job_id": str(m.job_id),
                "job_title": m.job.title if m.job else None,
                "channel": m.channel,
                "status": m.status,
                "message_subject": m.message_subject,
                "sent_at": m.sent_at.isoformat() if m.sent_at else None,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
        "total": len(messages),
    }


@router.post("/", status_code=201)
def create_outreach(
    body: CreateOutreachRequest,
    db: Session = Depends(get_db),
) -> Any:
    """
    Record an outreach attempt. Status starts as 'queued'.

    Note: no email or LinkedIn message is delivered by this endpoint.
    Actual delivery requires an external integration to pick up 'queued' records.
    """
    if body.channel not in _VALID_CHANNELS:
        raise HTTPException(
            status_code=422,
            detail=f"channel must be one of: {', '.join(sorted(_VALID_CHANNELS))}",
        )

    try:
        cand_uuid = uuid.UUID(body.candidate_id)
        job_uuid = uuid.UUID(body.job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid candidate_id or job_id UUID")

    message = OutreachMessage(
        candidate_id=cand_uuid,
        job_id=job_uuid,
        channel=body.channel,
        status="queued",
        message_subject=body.message_subject,
        message_body=body.message_body,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    return {
        "id": str(message.id),
        "candidate_id": str(message.candidate_id),
        "job_id": str(message.job_id),
        "channel": message.channel,
        "status": message.status,
        "created_at": message.created_at.isoformat(),
        "note": "Outreach recorded with status 'queued'. Delivery requires an active integration.",
    }


@router.patch("/{outreach_id}/status")
def update_outreach_status(
    outreach_id: uuid.UUID,
    body: UpdateStatusRequest,
    db: Session = Depends(get_db),
) -> Any:
    """Update the delivery status of an outreach message (e.g. sent, failed, opened)."""
    if body.status not in _VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"status must be one of: {', '.join(sorted(_VALID_STATUSES))}",
        )

    message = db.get(OutreachMessage, outreach_id)
    if not message:
        raise HTTPException(status_code=404, detail="Outreach message not found")

    from datetime import datetime, timezone
    previous = message.status
    message.status = body.status
    if body.status == "sent" and not message.sent_at:
        message.sent_at = datetime.now(timezone.utc)

    db.commit()
    return {"id": str(message.id), "previous_status": previous, "status": message.status}
