"""
PATHS Backend — Contact Enrichment API Endpoints.

POST /enrichment/{candidate_id}  → run enrichment on the candidate's CV text
GET  /enrichment/{candidate_id}  → return current contact completeness without re-running
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.models.candidate import Candidate
from app.agents.enrichment.service import enrich_candidate, _completeness_score

router = APIRouter(prefix="/enrichment", tags=["Enrichment"])


@router.post("/{candidate_id}")
def run_enrichment(candidate_id: uuid.UUID, db: Session = Depends(get_db)) -> Any:
    """
    Extract contact information from the candidate's ingested CV text and fill
    any missing fields on the Candidate record.

    Safe to call multiple times — only fills fields that are currently empty.
    Never overwrites existing email or phone values.
    """
    result = enrich_candidate(candidate_id=candidate_id, db=db)
    return {
        "candidate_id": result.candidate_id,
        "fields_found": result.fields_found,
        "fields_updated": result.fields_updated,
        "completeness_score": result.completeness_score,
        "data_warnings": result.data_warnings,
    }


@router.get("/{candidate_id}")
def get_enrichment_status(candidate_id: uuid.UUID, db: Session = Depends(get_db)) -> Any:
    """
    Return the current contact completeness for a candidate based on their
    existing Candidate record — does NOT re-run extraction or modify the DB.

    Useful for the UI to show a completeness badge without triggering side effects.
    """
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Reconstruct what is currently present without re-running regex
    current_fields: dict = {}
    if candidate.email:
        current_fields["email"] = candidate.email
    if candidate.phone:
        current_fields["phone"] = candidate.phone
    # Social URLs not yet in schema — not shown here

    score = _completeness_score(candidate, {})

    warnings: list[str] = []
    if score < 30:
        warnings.append(
            "Contact completeness is low. Run POST /enrichment/{candidate_id} "
            "after CV ingestion to attempt automatic extraction."
        )

    return {
        "candidate_id": str(candidate_id),
        "fields_found": current_fields,
        "fields_updated": [],
        "completeness_score": score,
        "data_warnings": warnings,
    }
