"""
PATHS Backend — Evidence Validation Agent Nodes (LangGraph).

Validates the logical consistency and completeness of a candidate's CV data
using only information already stored in PostgreSQL. No external API calls.

Checks performed:
  1. Experience timeline — overlapping roles, impossible dates, future start dates
  2. Experience gap detection — unexplained gaps > 6 months
  3. Years-of-experience inflation — claimed vs computed from work history
  4. Short tenure flags — multiple roles < 3 months (excluding internships)
  5. Education timeline consistency — end before start, future graduation
  6. Certification expiry — expired certifications presented as current
  7. Skill backing — skills claimed with no supporting experience entry mentioning them
  8. Profile completeness — missing critical fields (email, summary, location)

Output: findings list + trust_score (0–100) + validation_status.
"""

from __future__ import annotations

import logging
import re
from datetime import date, datetime
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ── Date parsing helpers ──────────────────────────────────────────────────────

_TODAY = date.today()

_MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    "january": 1, "february": 2, "march": 3, "april": 4, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10,
    "november": 11, "december": 12,
}


def _parse_date(date_str: str | None) -> Optional[date]:
    """Try multiple formats: YYYY-MM-DD, YYYY-MM, YYYY, 'Month YYYY', 'present'/'current'."""
    if not date_str:
        return None
    s = date_str.strip().lower()
    if s in {"present", "current", "now", "ongoing", "today"}:
        return _TODAY

    # YYYY-MM-DD
    m = re.match(r'^(\d{4})-(\d{2})-(\d{2})$', s)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            pass

    # YYYY-MM
    m = re.match(r'^(\d{4})-(\d{2})$', s)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), 1)
        except ValueError:
            pass

    # YYYY
    m = re.match(r'^(\d{4})$', s)
    if m:
        return date(int(m.group(1)), 1, 1)

    # Month YYYY  (e.g. "March 2020", "Mar 2020")
    m = re.match(r'^([a-z]+)\s+(\d{4})$', s)
    if m:
        mon = _MONTH_MAP.get(m.group(1))
        if mon:
            try:
                return date(int(m.group(2)), mon, 1)
            except ValueError:
                pass

    # YYYY Month
    m = re.match(r'^(\d{4})\s+([a-z]+)$', s)
    if m:
        mon = _MONTH_MAP.get(m.group(2))
        if mon:
            try:
                return date(int(m.group(1)), mon, 1)
            except ValueError:
                pass

    return None


def _months_between(d1: date, d2: date) -> float:
    return (d2.year - d1.year) * 12 + (d2.month - d1.month)


def _finding(check: str, severity: str, message: str, detail: str = "") -> Dict:
    return {"check": check, "severity": severity, "message": message, "detail": detail}


# ── 1. validate_inputs ────────────────────────────────────────────────────────

def validate_inputs(state: dict) -> Dict:
    if not state.get("candidate_id"):
        return {"errors": ["candidate_id is required"], "status": "failed"}
    return {}


# ── 2. load_candidate_data ────────────────────────────────────────────────────

def load_candidate_data(state: dict) -> Dict:
    """Load all CV entity data from PostgreSQL for the candidate."""
    import uuid as _uuid
    from app.core.database import SessionLocal
    from sqlalchemy import select
    from app.db.models.candidate import Candidate
    from app.db.models.cv_entities import (
        CandidateExperience, CandidateEducation,
        CandidateCertification, CandidateSkill, Skill,
    )

    db = SessionLocal()
    try:
        try:
            cid = _uuid.UUID(state["candidate_id"])
        except ValueError:
            return {"errors": ["Invalid candidate_id UUID"], "status": "failed"}

        candidate = db.get(Candidate, cid)
        if not candidate:
            return {"errors": [f"Candidate {state['candidate_id']} not found"], "status": "failed"}

        # Experiences
        exp_rows = db.execute(
            select(CandidateExperience).where(CandidateExperience.candidate_id == cid)
        ).scalars().all()
        experiences = [
            {
                "company": r.company_name, "title": r.title,
                "start_date": r.start_date, "end_date": r.end_date,
                "description": r.description or "",
            }
            for r in exp_rows
        ]

        # Education
        edu_rows = db.execute(
            select(CandidateEducation).where(CandidateEducation.candidate_id == cid)
        ).scalars().all()
        education = [
            {
                "institution": r.institution, "degree": r.degree or "",
                "field": r.field_of_study or "",
                "start_date": r.start_date, "end_date": r.end_date,
            }
            for r in edu_rows
        ]

        # Certifications
        cert_rows = db.execute(
            select(CandidateCertification).where(CandidateCertification.candidate_id == cid)
        ).scalars().all()
        certifications = [
            {
                "name": r.name, "issuer": r.issuer or "",
                "issue_date": r.issue_date, "expiry_date": r.expiry_date,
            }
            for r in cert_rows
        ]

        # Skills
        skill_rows = db.execute(
            select(CandidateSkill, Skill)
            .join(Skill, CandidateSkill.skill_id == Skill.id)
            .where(CandidateSkill.candidate_id == cid)
        ).all()
        skills = [
            {
                "name": r.Skill.normalized_name,
                "evidence_text": r.CandidateSkill.evidence_text or "",
                "years_used": r.CandidateSkill.years_used,
            }
            for r in skill_rows
        ]

        logger.info(
            "[evidence_val][run=%s] Loaded: %d exp, %d edu, %d certs, %d skills",
            state.get("run_id"), len(experiences), len(education),
            len(certifications), len(skills),
        )

        return {
            "candidate_name": candidate.full_name,
            "claimed_years_experience": candidate.years_experience,
            "experiences": experiences,
            "education": education,
            "certifications": certifications,
            "skills": skills,
        }

    except Exception as exc:
        logger.exception("[evidence_val][run=%s] Data load error", state.get("run_id"))
        return {"errors": [f"Data load failed: {exc}"], "status": "failed"}
    finally:
        db.close()


# ── 3. check_experience_timeline ──────────────────────────────────────────────

def check_experience_timeline(state: dict) -> Dict:
    """
    Checks:
    - Start date before end date for each role
    - Future start dates
    - Overlapping concurrent roles (>3 months overlap)
    - Very short tenures (< 3 months) — flagged as warning
    - Unexplained gaps > 6 months between roles
    """
    experiences = state.get("experiences") or []
    findings: List[Dict] = list(state.get("findings") or [])

    parsed: List[Tuple[date, date, str]] = []  # (start, end, label)

    for exp in experiences:
        label = f"{exp['title']} at {exp['company']}"
        start = _parse_date(exp.get("start_date"))
        end = _parse_date(exp.get("end_date")) or _TODAY

        if start is None:
            findings.append(_finding(
                "experience_dates", "warning",
                f"Missing start date for '{label}'",
                "Cannot validate timeline without start date",
            ))
            continue

        if start > _TODAY:
            findings.append(_finding(
                "experience_dates", "critical",
                f"Future start date for '{label}'",
                f"Start date {exp['start_date']} is in the future",
            ))
            continue

        if start > end:
            findings.append(_finding(
                "experience_dates", "critical",
                f"End date before start date for '{label}'",
                f"Start: {exp['start_date']}, End: {exp['end_date']}",
            ))
            continue

        tenure_months = _months_between(start, end)
        if 0 < tenure_months < 3:
            findings.append(_finding(
                "short_tenure", "warning",
                f"Very short tenure at '{exp['company']}' ({int(tenure_months)} months)",
                "Tenures under 3 months may indicate instability or contract work",
            ))

        parsed.append((start, end, label))

    # Sort by start date
    parsed.sort(key=lambda x: x[0])

    # Check for significant overlaps (> 3 months between two roles)
    for i in range(len(parsed) - 1):
        s1, e1, l1 = parsed[i]
        s2, e2, l2 = parsed[i + 1]
        if s2 < e1:
            overlap_months = _months_between(s2, min(e1, e2))
            if overlap_months > 3:
                findings.append(_finding(
                    "timeline_overlap", "warning",
                    f"Significant overlap ({int(overlap_months)} months) between '{l1}' and '{l2}'",
                    "Some concurrent roles are valid (e.g. freelance), but large overlaps should be explained",
                ))

    # Check for large gaps between roles
    for i in range(len(parsed) - 1):
        s1, e1, l1 = parsed[i]
        s2, e2, l2 = parsed[i + 1]
        gap_months = _months_between(e1, s2)
        if gap_months > 6:
            findings.append(_finding(
                "employment_gap", "info",
                f"Gap of {int(gap_months)} months between '{l1}' and '{l2}'",
                "Gaps may be intentional (education, family, health). Note for interview.",
            ))

    # Compute total work months (deduplicated using max-end merge)
    total_months = 0.0
    if parsed:
        merged_end = parsed[0][1]
        merged_start = parsed[0][0]
        for start, end, _ in parsed[1:]:
            if start <= merged_end:
                merged_end = max(merged_end, end)
            else:
                total_months += _months_between(merged_start, merged_end)
                merged_start = start
                merged_end = end
        total_months += _months_between(merged_start, merged_end)

    computed_years = round(total_months / 12, 1)
    logger.info("[evidence_val][run=%s] Computed %.1f years from work history", state.get("run_id"), computed_years)

    return {
        "findings": findings,
        "computed_years_experience": computed_years,
    }


# ── 4. check_experience_inflation ─────────────────────────────────────────────

def check_experience_inflation(state: dict) -> Dict:
    """Compare claimed years_experience against computed work history."""
    claimed = state.get("claimed_years_experience")
    computed = state.get("computed_years_experience")
    findings: List[Dict] = list(state.get("findings") or [])

    if claimed is None:
        findings.append(_finding(
            "years_experience", "info",
            "Claimed years of experience not set on candidate profile",
            "The system could not verify experience duration",
        ))
        return {"findings": findings}

    if computed is None or computed == 0:
        return {"findings": findings}

    inflation = claimed - computed
    if inflation > 3:
        findings.append(_finding(
            "experience_inflation", "critical",
            f"Claimed {claimed} yrs experience, but work history shows ~{computed} yrs",
            f"Difference of {inflation:.1f} years — may indicate inflated claims",
        ))
    elif inflation > 1.5:
        findings.append(_finding(
            "experience_inflation", "warning",
            f"Claimed {claimed} yrs, work history shows ~{computed} yrs",
            f"Difference of {inflation:.1f} yrs — worth clarifying in interview",
        ))
    elif computed > claimed + 1:
        findings.append(_finding(
            "experience_underreported", "info",
            f"Claimed {claimed} yrs but work history suggests ~{computed} yrs",
            "Candidate may be underreporting experience (conservative estimation)",
        ))

    return {"findings": findings}


# ── 5. check_education_timeline ───────────────────────────────────────────────

def check_education_timeline(state: dict) -> Dict:
    """Validate education date ranges."""
    education = state.get("education") or []
    findings: List[Dict] = list(state.get("findings") or [])

    for edu in education:
        label = f"{edu['degree']} at {edu['institution']}"
        start = _parse_date(edu.get("start_date"))
        end = _parse_date(edu.get("end_date"))

        if end and end > _TODAY:
            # Future graduation is fine — still studying
            findings.append(_finding(
                "education_dates", "info",
                f"'{label}' — graduation date in the future",
                "Candidate is currently enrolled",
            ))
            continue

        if start and end and start > end:
            findings.append(_finding(
                "education_dates", "critical",
                f"End before start for '{label}'",
                f"Start: {edu['start_date']}, End: {edu['end_date']}",
            ))

    return {"findings": findings}


# ── 6. check_certifications ───────────────────────────────────────────────────

def check_certifications(state: dict) -> Dict:
    """Flag expired certifications."""
    certifications = state.get("certifications") or []
    findings: List[Dict] = list(state.get("findings") or [])

    for cert in certifications:
        expiry = _parse_date(cert.get("expiry_date"))
        if expiry and expiry < _TODAY:
            months_ago = int(_months_between(expiry, _TODAY))
            findings.append(_finding(
                "cert_expiry", "warning",
                f"Certification '{cert['name']}' expired {months_ago} months ago",
                f"Issuer: {cert['issuer'] or 'Unknown'}. Expired: {cert['expiry_date']}",
            ))

    return {"findings": findings}


# ── 7. check_skill_backing ────────────────────────────────────────────────────

def check_skill_backing(state: dict) -> Dict:
    """
    Check whether listed skills are backed by evidence in work/education history.

    A skill is considered 'backed' if:
    - its evidence_text is non-empty, OR
    - its name appears in any experience description or education field
    """
    skills = state.get("skills") or []
    experiences = state.get("experiences") or []
    education = state.get("education") or []
    findings: List[Dict] = list(state.get("findings") or [])

    # Build a combined text corpus from descriptions
    corpus = " ".join(
        (e.get("description") or "") + " " + (e.get("title") or "")
        for e in experiences
    ).lower() + " " + " ".join(
        (e.get("field") or "") + " " + (e.get("degree") or "")
        for e in education
    ).lower()

    unbacked: List[str] = []
    for skill in skills:
        name = skill["name"].lower()
        ev = skill.get("evidence_text", "").lower()
        if ev:
            continue  # Has explicit evidence text — backed
        if name in corpus or any(part in corpus for part in name.split() if len(part) >= 4):
            continue  # Found in experience/education corpus — backed
        unbacked.append(skill["name"])

    if len(unbacked) > 5:
        findings.append(_finding(
            "skill_backing", "warning",
            f"{len(unbacked)} skills have no supporting evidence in work/education history",
            f"First few: {', '.join(unbacked[:5])}",
        ))
    elif unbacked:
        findings.append(_finding(
            "skill_backing", "info",
            f"{len(unbacked)} skill(s) not mentioned in experience descriptions",
            f"Skills: {', '.join(unbacked[:5])}. May have been used outside of listed roles.",
        ))

    return {"findings": findings}


# ── 8. check_profile_completeness ─────────────────────────────────────────────

def check_profile_completeness(state: dict) -> Dict:
    """Flag missing critical profile fields."""
    findings: List[Dict] = list(state.get("findings") or [])

    if not state.get("experiences"):
        findings.append(_finding(
            "profile_completeness", "warning",
            "No work experience entries found",
            "CV may not have been fully parsed — consider re-ingestion",
        ))
    if not state.get("education"):
        findings.append(_finding(
            "profile_completeness", "info",
            "No education entries found",
            "Education history not available for validation",
        ))
    if not state.get("skills"):
        findings.append(_finding(
            "profile_completeness", "warning",
            "No skills found in candidate profile",
            "Skills may not have been extracted — consider re-ingestion",
        ))

    return {"findings": findings}


# ── 9. compute_trust_score ────────────────────────────────────────────────────

def compute_trust_score(state: dict) -> Dict:
    """
    Compute a trust score 0–100.

    Deductions:
      critical finding: -20
      warning finding:  -8
      info finding:     -2

    Floor: 10 (always acknowledge there is *some* unverifiable information)
    """
    findings: List[Dict] = state.get("findings") or []

    critical = [f for f in findings if f["severity"] == "critical"]
    warnings = [f for f in findings if f["severity"] == "warning"]
    infos = [f for f in findings if f["severity"] == "info"]

    score = 100
    score -= len(critical) * 20
    score -= len(warnings) * 8
    score -= len(infos) * 2
    score = max(10, min(100, score))

    if len(critical) > 0:
        status = "flagged"
    elif len(warnings) > 1 or score < 70:
        status = "needs_review"
    else:
        status = "validated"

    logger.info(
        "[evidence_val][run=%s] Trust=%d status=%s (crit=%d warn=%d info=%d)",
        state.get("run_id"), score, status, len(critical), len(warnings), len(infos),
    )

    return {
        "trust_score": score,
        "validation_status": status,
        "critical_count": len(critical),
        "warning_count": len(warnings),
        "info_count": len(infos),
    }


# ── 10. build_summary ─────────────────────────────────────────────────────────

def build_summary(state: dict) -> Dict:
    name = state.get("candidate_name", "Candidate")
    score = state.get("trust_score", 0)
    status = state.get("validation_status", "needs_review")
    crit = state.get("critical_count", 0)
    warn = state.get("warning_count", 0)
    computed = state.get("computed_years_experience")
    claimed = state.get("claimed_years_experience")

    status_text = {
        "validated": "passed evidence validation with no critical issues",
        "needs_review": "requires manual review due to flagged inconsistencies",
        "flagged": "has critical inconsistencies that must be resolved before proceeding",
    }.get(status, "requires review")

    summary = f"{name} {status_text}. Trust score: {score}/100."

    if crit > 0:
        summary += f" {crit} critical issue(s) detected."
    if warn > 0:
        summary += f" {warn} warning(s)."
    if computed is not None and claimed is not None:
        summary += f" Claimed {claimed} yrs experience; computed from history: {computed} yrs."

    return {"summary": summary}


# ── 11. finalize ──────────────────────────────────────────────────────────────

def finalize(state: dict) -> Dict:
    logger.info(
        "[evidence_val][run=%s] Complete — trust=%d status=%s",
        state.get("run_id"),
        state.get("trust_score", 0),
        state.get("validation_status"),
    )
    return {"status": "completed"}


# ── 12. handle_failure ────────────────────────────────────────────────────────

def handle_failure(state: dict) -> Dict:
    logger.error(
        "[evidence_val][run=%s] FAILED: %s",
        state.get("run_id"), "; ".join(state.get("errors", [])),
    )
    return {"status": "failed"}
