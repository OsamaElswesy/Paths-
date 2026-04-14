"""
PATHS Backend — Contact Enrichment Service (Deterministic v1).

Extracts and normalises contact information from a candidate's raw CV text.
Designed as a pure service function (same pattern as scoring_service.py) rather
than a LangGraph agent because the logic is linear with no meaningful branching.

Rules:
  - Never overwrite a field that already has a value in the Candidate record.
  - Only persist email and phone (existing Candidate columns).
  - Social profile URLs are returned in the response but not persisted until
    a schema migration adds the columns.
  - All findings are surfaced as explicit fields — nothing is silently dropped.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.candidate import Candidate
from app.db.models.cv_entities import CandidateDocument


# ── Regex patterns ────────────────────────────────────────────────────────────

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

# Conservative phone: handles international prefixes, common separators
_PHONE_RE = re.compile(r"(?:\+?[\d\-\(\)\s\.]{7,20})(?=\s|$|,)")

_LINKEDIN_RE = re.compile(
    r"https?://(?:www\.)?linkedin\.com/in/[a-zA-Z0-9_\-\.%]+/?",
    re.IGNORECASE,
)
_GITHUB_RE = re.compile(
    r"https?://(?:www\.)?github\.com/[a-zA-Z0-9_\-\.]+/?",
    re.IGNORECASE,
)
# Generic URL — used as last resort for portfolio detection
_URL_RE = re.compile(r"https?://[^\s<>\"']+", re.IGNORECASE)


# ── Result dataclass ──────────────────────────────────────────────────────────

@dataclass
class EnrichmentResult:
    candidate_id: str
    # All fields detected in CV text (not necessarily persisted)
    fields_found: dict = field(default_factory=dict)
    # Fields that were actually written to the Candidate record
    fields_updated: list[str] = field(default_factory=list)
    # 0–100 contact completeness score
    completeness_score: int = 0
    data_warnings: list[str] = field(default_factory=list)


# ── Core extraction helpers ───────────────────────────────────────────────────

def _extract_email(text: str) -> str | None:
    matches = _EMAIL_RE.findall(text)
    # Filter out common false positives (image filenames, version strings)
    valid = [m for m in matches if "." in m.split("@")[-1] and len(m) < 254]
    return valid[0] if valid else None


def _extract_phone(text: str) -> str | None:
    matches = _PHONE_RE.findall(text)
    for m in matches:
        cleaned = m.strip()
        digit_count = sum(c.isdigit() for c in cleaned)
        if 7 <= digit_count <= 15:
            return cleaned
    return None


def _extract_linkedin(text: str) -> str | None:
    matches = _LINKEDIN_RE.findall(text)
    return matches[0].rstrip("/") if matches else None


def _extract_github(text: str) -> str | None:
    matches = _GITHUB_RE.findall(text)
    return matches[0].rstrip("/") if matches else None


def _extract_portfolio(text: str) -> str | None:
    """Return first non-LinkedIn, non-GitHub HTTPS URL as a portfolio candidate."""
    for url in _URL_RE.findall(text):
        if "linkedin.com" in url or "github.com" in url:
            continue
        # Skip common resource URLs that aren't portfolio sites
        if any(s in url for s in ("doi.org", "arxiv.org", ".pdf", ".png", ".jpg")):
            continue
        return url.rstrip("/.,;")
    return None


def _completeness_score(candidate: Candidate, found: dict) -> int:
    """Score 0–100 based on contact field presence after enrichment."""
    email_ok = bool(candidate.email or found.get("email"))
    phone_ok = bool(candidate.phone or found.get("phone"))
    linkedin_ok = bool(found.get("linkedin_url"))
    github_ok = bool(found.get("github_url"))
    portfolio_ok = bool(found.get("portfolio_url"))

    return (
        (30 if email_ok else 0)
        + (25 if phone_ok else 0)
        + (20 if linkedin_ok else 0)
        + (15 if github_ok else 0)
        + (10 if portfolio_ok else 0)
    )


# ── Public API ────────────────────────────────────────────────────────────────

def enrich_candidate(candidate_id: uuid.UUID, db: Session) -> EnrichmentResult:
    """
    Extract contact information from the candidate's raw CV text and update
    any missing fields in the Candidate record.

    Returns an EnrichmentResult describing every field found and updated.
    Does NOT raise on missing data — all gaps are surfaced as data_warnings.
    """
    result = EnrichmentResult(candidate_id=str(candidate_id))

    # ── Load candidate ────────────────────────────────────────────────────────
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        result.data_warnings.append("Candidate record not found in database.")
        return result

    # ── Load CV document raw text ─────────────────────────────────────────────
    doc = db.execute(
        select(CandidateDocument)
        .where(CandidateDocument.candidate_id == candidate_id)
        .order_by(CandidateDocument.created_at.desc())
    ).scalar_one_or_none()

    if not doc or not doc.raw_text or not doc.raw_text.strip():
        result.data_warnings.append(
            "No CV document with raw text found for this candidate — "
            "enrichment can only extract from ingested CV text. "
            "Re-ingest the CV to enable contact extraction."
        )
        result.completeness_score = _completeness_score(candidate, {})
        return result

    text = doc.raw_text

    # ── Extract all contact signals ───────────────────────────────────────────
    found: dict = {}

    email = _extract_email(text)
    if email:
        found["email"] = email

    phone = _extract_phone(text)
    if phone:
        found["phone"] = phone

    linkedin = _extract_linkedin(text)
    if linkedin:
        found["linkedin_url"] = linkedin

    github = _extract_github(text)
    if github:
        found["github_url"] = github

    portfolio = _extract_portfolio(text)
    if portfolio:
        found["portfolio_url"] = portfolio

    result.fields_found = found

    # ── Persist only to existing Candidate columns, never overwrite ───────────
    updated: list[str] = []

    if found.get("email") and not candidate.email:
        candidate.email = found["email"]
        updated.append("email")

    if found.get("phone") and not candidate.phone:
        candidate.phone = found["phone"]
        updated.append("phone")

    if updated:
        db.commit()

    result.fields_updated = updated

    # Social URLs: note why they are not persisted
    social_found = [k for k in ("linkedin_url", "github_url", "portfolio_url") if found.get(k)]
    if social_found:
        result.data_warnings.append(
            f"Social profile URLs detected ({', '.join(social_found)}) but not persisted — "
            "Candidate schema does not yet have these columns. "
            "They are returned here for display and will be persisted after a schema migration."
        )

    # ── Completeness score ────────────────────────────────────────────────────
    result.completeness_score = _completeness_score(candidate, found)

    return result
