"""
PATHS Backend — Scoring Service v1 (Deterministic)

Scores a candidate against a job using three components:
  - Skill Match       (50%) — candidate skills vs. job requirements
  - Experience Match  (30%) — candidate years vs. job experience level band
  - Profile Quality   (20%) — completeness of the ingested candidate profile

No LLM required. All signals come from existing database records.
Missing data is surfaced as explicit data_warnings, not silently ignored.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.candidate import Candidate
from app.db.models.cv_entities import CandidateSkill, Skill
from app.db.models.job import Job
from app.db.models.job_ingestion import JobSkillRequirement


# ── Experience level keyword → (min_years, max_years) band ──────────────────
# max_years=99 means "no upper cap"
_EXPERIENCE_BANDS: dict[str, tuple[int, int]] = {
    "intern":       (0, 1),
    "entry":        (0, 2),
    "junior":       (1, 3),
    "associate":    (2, 4),
    "mid":          (3, 6),
    "intermediate": (3, 6),
    "senior":       (5, 99),
    "staff":        (7, 99),
    "lead":         (7, 99),
    "principal":    (8, 99),
    "director":     (10, 99),
    "manager":      (5, 99),
}

# Common words to exclude when tokenising job description for skill keywords
_STOP_WORDS = frozenset({
    "the", "and", "or", "for", "with", "will", "are", "you", "our",
    "have", "has", "from", "that", "this", "able", "plus", "also",
    "must", "can", "your", "team", "work", "make", "such", "use",
    "using", "used", "new", "well", "good", "strong", "ability",
    "experience", "knowledge", "skills", "skill", "required",
    "preferred", "excellent", "understanding", "working", "role",
    "minimum", "years", "year", "least", "least", "more", "than",
    "familiarity", "proficiency", "relevant", "related", "field",
})


def _extract_keywords(text: str) -> set[str]:
    """Split free text into lowercase tokens, dropping stop words and short tokens."""
    tokens = re.split(r"[\s,;/()\-\n\.\+]+", text.lower())
    return {t for t in tokens if len(t) >= 3 and t not in _STOP_WORDS}


def _skill_matches(req_name: str, candidate_names: set[str]) -> bool:
    """Substring match: the requirement name is contained in any candidate skill or vice versa."""
    return any(req_name in cs or cs in req_name for cs in candidate_names)


@dataclass
class ScoringResult:
    candidate_id: str
    job_id: str | None
    score: int                                          # 0–100 composite
    confidence_level: str                               # low | medium | high
    recommendation: str                                 # Strong Hire | Consider | Weak Match
    key_factors: list[str] = field(default_factory=list)
    gap_factors: list[str] = field(default_factory=list)
    bias_flags: list[str] = field(default_factory=list)
    skill_score: int = 0
    experience_score: int = 0
    profile_completeness_score: int = 0
    data_warnings: list[str] = field(default_factory=list)


def score_candidate_against_job(
    candidate_id: UUID,
    job_id: UUID | None,
    db: Session,
) -> ScoringResult:
    """
    Compute a deterministic hiring score for a candidate optionally against a job.

    If job_id is None, job-dependent components default to neutral values
    and a data_warning is emitted — the score is still useful as a
    profile-quality signal.
    """
    data_warnings: list[str] = []
    key_factors: list[str] = []
    gap_factors: list[str] = []

    # ── Load candidate ───────────────────────────────────────────────────────
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        return ScoringResult(
            candidate_id=str(candidate_id),
            job_id=str(job_id) if job_id else None,
            score=0,
            confidence_level="low",
            recommendation="Weak Match",
            data_warnings=["Candidate record not found in database"],
        )

    # ── Candidate skills ─────────────────────────────────────────────────────
    skill_rows = db.execute(
        select(CandidateSkill, Skill)
        .join(Skill, CandidateSkill.skill_id == Skill.id)
        .where(CandidateSkill.candidate_id == candidate_id)
    ).all()
    candidate_skill_names: set[str] = {row.Skill.normalized_name for row in skill_rows}

    # ── Profile completeness score (0–100) ───────────────────────────────────
    has_skills = len(candidate_skill_names) > 0
    has_experience = bool(candidate.years_experience and candidate.years_experience > 0)
    has_summary = bool(candidate.summary and len(candidate.summary.strip()) > 20)
    has_location = bool(candidate.location_text)

    profile_completeness_score = (
        (40 if has_skills else 0)
        + (30 if has_experience else 0)
        + (20 if has_summary else 0)
        + (10 if has_location else 0)
    )

    if not has_skills:
        data_warnings.append(
            "No skills detected in candidate profile — CV may need re-ingestion"
        )
    if not has_experience:
        data_warnings.append(
            "Years of experience not set — experience scoring defaults to neutral"
        )

    # ── Load job ─────────────────────────────────────────────────────────────
    job: Job | None = db.get(Job, job_id) if job_id else None
    candidate_years = candidate.years_experience or 0

    skill_score = 0
    experience_score = 50  # neutral when no job context
    skill_source = "none"  # none | structured | freetext
    band: tuple[int, int] | None = None

    if job is None:
        data_warnings.append(
            "No job context provided — skill and experience scores are not job-specific"
        )
        # Use profile completeness as a proxy for the skill signal
        skill_score = profile_completeness_score
    else:
        # ── Skill score ───────────────────────────────────────────────────
        job_skill_reqs = db.execute(
            select(JobSkillRequirement).where(JobSkillRequirement.job_id == job_id)
        ).scalars().all()

        if job_skill_reqs:
            # Path A: structured JobSkillRequirement records exist
            skill_source = "structured"
            required_reqs = [r for r in job_skill_reqs if r.is_required]
            optional_reqs = [r for r in job_skill_reqs if not r.is_required]

            matched_required = [
                r for r in required_reqs if _skill_matches(r.skill_name_normalized, candidate_skill_names)
            ]
            matched_optional = [
                r for r in optional_reqs if _skill_matches(r.skill_name_normalized, candidate_skill_names)
            ]
            missing_required = [
                r for r in required_reqs if not _skill_matches(r.skill_name_normalized, candidate_skill_names)
            ]

            # Weighted: required contributes 70%, optional 30%
            req_pool = sum(r.importance_weight for r in required_reqs) * 0.7
            opt_pool = sum(r.importance_weight for r in optional_reqs) * 0.3
            matched_req_pts = sum(r.importance_weight for r in matched_required) * 0.7
            matched_opt_pts = sum(r.importance_weight for r in matched_optional) * 0.3
            total_possible = req_pool + opt_pool

            skill_score = min(100, int((matched_req_pts + matched_opt_pts) / max(total_possible, 0.01) * 100))

            if matched_required:
                key_factors.append(
                    f"Matched {len(matched_required)} of {len(required_reqs)} required skills"
                )
            if matched_optional:
                key_factors.append(f"Also matched {len(matched_optional)} optional skills")
            if missing_required:
                names = ", ".join(r.skill_name_normalized for r in missing_required[:3])
                gap_factors.append(f"Missing required skills: {names}")
                if len(missing_required) > 3:
                    gap_factors.append(f"...and {len(missing_required) - 3} more required skills missing")

        else:
            # Path B: no structured requirements — fall back to free-text keyword overlap
            source_text = " ".join(filter(None, [job.requirements, job.description_text]))
            if source_text.strip():
                skill_source = "freetext"
                job_keywords = _extract_keywords(source_text)
                matches = candidate_skill_names & job_keywords
                skill_score = min(100, int(len(matches) / max(len(job_keywords), 1) * 100))
                data_warnings.append(
                    "Job has no structured skill requirements — scored against free-text keywords"
                )
                if matches:
                    key_factors.append(
                        f"Matched {len(matches)} skill keywords from job description"
                    )
                elif candidate_skill_names:
                    gap_factors.append(
                        "Candidate skills do not overlap with keywords in job description"
                    )
            else:
                skill_score = 0
                skill_source = "none"
                data_warnings.append(
                    "Job has no skill requirements or description text — skill scoring unavailable"
                )

        # ── Experience score ─────────────────────────────────────────────
        exp_text = " ".join(filter(None, [
            (job.experience_level or "").lower(),
            (job.seniority_level or "").lower(),
        ]))

        for key, rng in _EXPERIENCE_BANDS.items():
            if key in exp_text:
                band = rng
                break

        if band is None:
            experience_score = 50
            data_warnings.append(
                "Job has no specified experience level — experience score defaulted to neutral"
            )
        else:
            min_exp, max_exp = band
            if candidate_years >= min_exp:
                if max_exp == 99 or candidate_years <= max_exp:
                    experience_score = 100
                    key_factors.append(
                        f"{candidate_years} yrs experience meets "
                        f"{exp_text.strip() or 'role'} requirement"
                    )
                else:
                    over = candidate_years - max_exp
                    experience_score = max(60, 100 - over * 5)
                    key_factors.append(
                        f"{candidate_years} yrs experience (slightly above {min_exp}–{max_exp} yr band)"
                    )
            else:
                experience_score = max(0, int(candidate_years / max(min_exp, 1) * 100))
                gap_factors.append(
                    f"Experience ({candidate_years} yrs) below minimum "
                    f"of {min_exp} yrs for {exp_text.strip() or 'this role'}"
                )

    # ── Completeness factor ──────────────────────────────────────────────────
    if profile_completeness_score >= 80:
        key_factors.append("Strong candidate profile completeness")
    elif profile_completeness_score < 40:
        gap_factors.append("Incomplete profile — assessment accuracy is reduced")

    # ── Composite score (weighted average) ──────────────────────────────────
    final_score = int(
        skill_score * 0.50
        + experience_score * 0.30
        + profile_completeness_score * 0.20
    )

    # ── Confidence level ─────────────────────────────────────────────────────
    active_signals = sum([
        has_skills and skill_source != "none",
        has_experience and band is not None,
        profile_completeness_score >= 60,
    ])
    confidence_level = "high" if active_signals >= 3 else "medium" if active_signals >= 2 else "low"

    # ── Recommendation ───────────────────────────────────────────────────────
    recommendation = (
        "Strong Hire" if final_score >= 80
        else "Consider" if final_score >= 55
        else "Weak Match"
    )

    # Ensure at least one factor is always present for the UI
    if not key_factors:
        key_factors.append("Candidate profile ingested and evaluated")

    return ScoringResult(
        candidate_id=str(candidate_id),
        job_id=str(job_id) if job_id else None,
        score=final_score,
        confidence_level=confidence_level,
        recommendation=recommendation,
        key_factors=key_factors,
        gap_factors=gap_factors,
        bias_flags=[],  # Anonymization protocol active — bias detection planned for Phase 2
        skill_score=skill_score,
        experience_score=experience_score,
        profile_completeness_score=profile_completeness_score,
        data_warnings=data_warnings,
    )
