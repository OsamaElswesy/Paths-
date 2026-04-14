"""
PATHS Backend — Bias & Fairness Audit Agent Nodes (LangGraph).

Scans a candidate/job pair for demographic proxy signals that could
introduce unfair bias into the hiring process.

Checks performed:
  1. Name exposure           — candidate name is visible during scoring
  2. Location signals        — location_text may encode socioeconomic proxies
  3. Institution prestige     — elite school names create prestige-score inflation
  4. Age proxy detection      — graduation year or experience span implies age
  5. Job description language — masculine/gendered/exclusionary coded words in JD
  6. Employment gap risk       — penalising gaps may disproportionately affect
                                 caregivers, disabled, or returning workers
  7. Overqualification risk   — high-experience / low-score disparity

Output: bias_flags list + fairness_score (0–100) + overall_risk.

This agent is READ-ONLY — it does NOT modify any records.
"""

from __future__ import annotations

import logging
import re
from typing import Dict, List, Set

logger = logging.getLogger(__name__)

# ── Prestige institution list (alphabetical, lowercase) ───────────────────────
# These names trigger an "institution prestige bias" flag.
# Note: We are NOT saying these schools are bad — we flag that their presence
# in evaluation context can advantage applicants unfairly.
_ELITE_INSTITUTIONS: Set[str] = {
    "harvard", "mit", "stanford", "oxford", "cambridge", "yale", "princeton",
    "columbia", "caltech", "imperial", "eth zurich", "chicago", "penn",
    "duke", "johns hopkins", "ucl", "lse", "brown", "dartmouth", "cornell",
    "michigan", "northwestern", "uc berkeley", "ucla", "carnegie mellon",
    "toronto", "mcgill", "epfl", "sciences po", "hec paris", "insead",
    "london business school", "wharton",
}

# ── Masculine-coded job description words (Gaucher et al. 2011) ──────────────
_MASCULINE_CODED: Set[str] = {
    "competitive", "dominant", "aggressive", "ambitious", "assertive",
    "analytical", "independent", "fearless", "superior", "ninja", "rockstar",
    "guru", "master", "champion", "strong", "battle", "driven", "decisive",
    "confident", "force", "warrior", "hero", "outstanding", "exceptional",
    "crushing", "demolish", "kill", "dominate",
}

# ── Feminine-coded words (same source) — not bad, but signals exclusion ───────
_FEMININE_CODED: Set[str] = {
    "collaborative", "nurturing", "compassionate", "support", "cooperate",
    "interpersonal", "passionate", "sensitive", "empathetic",
}

# ── Known biased/coded phrases in job descriptions ───────────────────────────
_CODED_PHRASES: List[str] = [
    "culture fit",
    "culture add",         # "add" is fine, "fit" is risky — keep both to flag for review
    "must be able to lift",
    "native speaker",
    "must be local",
    "recent graduate",
    "young professional",
    "digital native",
    "fresh thinking",
    "energetic",
    "fast-paced",
]

# ── Biased interview note phrases (flag if found in notes) ───────────────────
_BIASED_NOTE_PHRASES: List[str] = [
    "well-spoken",     # racial dog-whistle ("articulate/well-spoken" used for Black candidates)
    "articulate",      # similar usage pattern
    "not like us",
    "aggressive",      # gendered for women
    "emotional",       # gendered for women
    "too old",
    "too young",
    "accent",
    "foreign",
    "overqualified",   # used to screen out older workers
    "not a cultural fit",
]


def _flag(check: str, category: str, risk_level: str, message: str, recommendation: str = "") -> Dict:
    return {
        "check": check,
        "category": category,
        "risk_level": risk_level,
        "message": message,
        "recommendation": recommendation,
    }


# ── 1. validate_inputs ────────────────────────────────────────────────────────

def validate_inputs(state: dict) -> Dict:
    if not state.get("candidate_id"):
        return {"errors": ["candidate_id is required"], "status": "failed"}
    return {}


# ── 2. load_candidate_data ────────────────────────────────────────────────────

def load_candidate_data(state: dict) -> Dict:
    """Load candidate profile and education from PostgreSQL."""
    import uuid as _uuid
    from app.core.database import SessionLocal
    from sqlalchemy import select
    from app.db.models.candidate import Candidate
    from app.db.models.cv_entities import CandidateEducation, CandidateExperience

    db = SessionLocal()
    warnings: List[str] = list(state.get("data_warnings") or [])
    try:
        try:
            cid = _uuid.UUID(state["candidate_id"])
        except ValueError:
            return {"errors": ["Invalid candidate_id UUID"], "status": "failed"}

        candidate = db.get(Candidate, cid)
        if not candidate:
            return {"errors": [f"Candidate {state['candidate_id']} not found"], "status": "failed"}

        # Education institutions
        edu_rows = db.execute(
            select(CandidateEducation).where(CandidateEducation.candidate_id == cid)
        ).scalars().all()
        institutions = [r.institution for r in edu_rows if r.institution]

        # Employment gaps (reuse logic from experience timeline)
        exp_rows = db.execute(
            select(CandidateExperience).where(CandidateExperience.candidate_id == cid)
            .order_by(CandidateExperience.start_date)
        ).scalars().all()

        from datetime import date as _date
        import re as _re

        def _quick_parse(s: str | None) -> _date | None:
            if not s:
                return None
            s = s.strip()
            m = _re.match(r'^(\d{4})-(\d{2})', s)
            if m:
                try:
                    return _date(int(m.group(1)), int(m.group(2)), 1)
                except ValueError:
                    pass
            m = _re.match(r'^(\d{4})$', s)
            if m:
                return _date(int(m.group(1)), 1, 1)
            return None

        today = _date.today()
        parsed_exp = []
        for r in exp_rows:
            s = _quick_parse(r.start_date)
            e = _quick_parse(r.end_date) or today
            if s and s <= e:
                parsed_exp.append((s, e, f"{r.title} at {r.company_name}"))

        parsed_exp.sort(key=lambda x: x[0])
        gaps: List[dict] = []
        for i in range(len(parsed_exp) - 1):
            _, e1, l1 = parsed_exp[i]
            s2, _, l2 = parsed_exp[i + 1]
            gap_months = (s2.year - e1.year) * 12 + (s2.month - e1.month)
            if gap_months > 6:
                gaps.append({"months": gap_months, "label": f"Between '{l1}' and '{l2}'"})

        logger.info(
            "[bias_audit][run=%s] Loaded candidate=%s, institutions=%d, gaps=%d",
            state.get("run_id"), candidate.full_name, len(institutions), len(gaps),
        )

        return {
            "candidate_name": candidate.full_name,
            "candidate_location": candidate.location_text,
            "candidate_years_experience": candidate.years_experience,
            "education_institutions": institutions,
            "employment_gaps": gaps,
            "data_warnings": warnings,
        }

    except Exception as exc:
        logger.exception("[bias_audit][run=%s] Candidate load error", state.get("run_id"))
        return {"errors": [f"Candidate data load failed: {exc}"], "status": "failed"}
    finally:
        db.close()


# ── 3. load_job_data ──────────────────────────────────────────────────────────

def load_job_data(state: dict) -> Dict:
    """Load job description for language audit. Skipped if job_id not provided."""
    job_id = (state.get("job_id") or "").strip()
    warnings: List[str] = list(state.get("data_warnings") or [])

    if not job_id:
        warnings.append("No job_id provided — job description language audit skipped")
        return {"job_title": None, "job_description": None, "job_requirements": None,
                "data_warnings": warnings}

    import uuid as _uuid
    from app.core.database import SessionLocal
    from app.db.models.job import Job

    db = SessionLocal()
    try:
        try:
            jid = _uuid.UUID(job_id)
        except ValueError:
            warnings.append("Invalid job_id UUID — job language audit skipped")
            return {"data_warnings": warnings}

        job = db.get(Job, jid)
        if not job:
            warnings.append(f"Job {job_id} not found — language audit skipped")
            return {"data_warnings": warnings}

        return {
            "job_title": job.title,
            "job_description": job.description_text or "",
            "job_requirements": job.requirements or "",
        }

    except Exception as exc:
        logger.exception("[bias_audit][run=%s] Job load error", state.get("run_id"))
        warnings.append(f"Job load failed: {exc} — language audit skipped")
        return {"data_warnings": warnings}
    finally:
        db.close()


# ── 4. check_demographic_proxies ─────────────────────────────────────────────

def check_demographic_proxies(state: dict) -> Dict:
    """
    Flag candidate-side signals that may introduce demographic bias:
    1. Name is visible in the process (always flag — recommend blind review)
    2. Location is available (may encode socioeconomic signals)
    3. Elite institution detected (prestige bias risk)
    4. Employment gaps found (gap-penalty may be discriminatory)
    5. Age proxy signals (long experience span or very recent graduation)
    """
    flags: List[dict] = list(state.get("bias_flags") or [])
    prestige_found: List[str] = []

    # 1. Name exposure — always flag
    name = state.get("candidate_name") or ""
    if name:
        flags.append(_flag(
            check="name_exposure",
            category="identity_proxy",
            risk_level="medium",
            message=f"Candidate name '{name}' is visible throughout the evaluation pipeline.",
            recommendation=(
                "Consider anonymizing candidate names during the screening stage. "
                "Research shows names trigger unconscious ethnic and gender associations."
            ),
        ))

    # 2. Location available
    location = state.get("candidate_location") or ""
    if location:
        flags.append(_flag(
            check="location_visibility",
            category="socioeconomic_proxy",
            risk_level="low",
            message=f"Location '{location}' is visible and may encode socioeconomic signals.",
            recommendation="Avoid penalising candidates from lower-income areas or regions. "
                           "If relocation is required, state it explicitly in the JD.",
        ))

    # 3. Institution prestige check
    institutions = state.get("education_institutions") or []
    for inst in institutions:
        inst_lower = inst.lower()
        for elite in _ELITE_INSTITUTIONS:
            if elite in inst_lower:
                prestige_found.append(inst)
                break

    if prestige_found:
        flags.append(_flag(
            check="institution_prestige",
            category="prestige_bias",
            risk_level="medium",
            message=f"Candidate attended institution(s) associated with prestige bias: "
                    f"{', '.join(prestige_found[:3])}.",
            recommendation=(
                "Prestige bias may inflate perceived candidate quality. "
                "Evaluate based on demonstrated skills and experience, not school name."
            ),
        ))

    # 4. Employment gaps
    gaps = state.get("employment_gaps") or []
    if gaps:
        gap_labels = "; ".join(g["label"] for g in gaps[:2])
        flags.append(_flag(
            check="employment_gap_penalty_risk",
            category="caregiving_disability_proxy",
            risk_level="medium",
            message=f"{len(gaps)} employment gap(s) detected ({gap_labels}{'...' if len(gaps) > 2 else ''}).",
            recommendation=(
                "Automatically penalising gaps disadvantages caregivers, people with disabilities, "
                "and workers who were laid off during economic downturns. "
                "Ask about gaps in the interview rather than scoring them negatively."
            ),
        ))

    # 5. Age proxy — years_experience > 25 or < 1 signals extreme age
    yoe = state.get("candidate_years_experience")
    if yoe is not None:
        if yoe >= 25:
            flags.append(_flag(
                check="age_proxy_senior",
                category="age_discrimination_risk",
                risk_level="medium",
                message=f"Candidate claims {yoe} years of experience — may be perceived as 'overqualified'.",
                recommendation=(
                    "'Overqualified' is frequently used to screen out older workers. "
                    "Evaluate whether the stated concern is about salary expectations "
                    "or actual job fit, and document the reason explicitly."
                ),
            ))
        elif yoe == 0:
            flags.append(_flag(
                check="age_proxy_junior",
                category="age_discrimination_risk",
                risk_level="low",
                message="Candidate has 0 listed years of experience — may disadvantage recent graduates.",
                recommendation="Evaluate demonstrated skills and projects, not years of experience alone.",
            ))

    return {"bias_flags": flags, "prestige_institutions": prestige_found}


# ── 5. check_job_language ─────────────────────────────────────────────────────

def check_job_language(state: dict) -> Dict:
    """
    Analyse job description and requirements for:
    - Masculine-coded language (Gaucher et al. 2011)
    - Known exclusionary coded phrases
    - Overly-specific requirements that may act as proxies
    """
    flags: List[dict] = list(state.get("bias_flags") or [])
    biased_language: List[str] = []

    jd_text = (
        (state.get("job_description") or "")
        + " "
        + (state.get("job_requirements") or "")
    ).lower()

    if not jd_text.strip():
        return {"bias_flags": flags, "biased_job_language": biased_language}

    # Tokenise for word matching
    tokens = set(re.split(r"[\s,;.\-!\?\(\)\"\']+", jd_text))

    # Masculine-coded words
    masc_hits = sorted(tokens & _MASCULINE_CODED)
    if len(masc_hits) >= 3:
        biased_language.extend(masc_hits[:5])
        flags.append(_flag(
            check="masculine_coded_jd",
            category="gender_bias",
            risk_level="medium",
            message=f"Job description contains {len(masc_hits)} masculine-coded words: "
                    f"{', '.join(masc_hits[:5])}.",
            recommendation=(
                "Masculine-coded language reduces application rates from women and "
                "non-binary candidates. Consider replacing with neutral alternatives "
                "(e.g. 'results-focused' instead of 'aggressive', 'collaborative leader' "
                "instead of 'dominant')."
            ),
        ))
    elif masc_hits:
        biased_language.extend(masc_hits)

    # Coded phrases
    for phrase in _CODED_PHRASES:
        if phrase in jd_text:
            biased_language.append(phrase)
            risk = "high" if phrase in {"native speaker", "must be local", "recent graduate"} else "medium"
            flags.append(_flag(
                check="coded_phrase_jd",
                category="exclusionary_language",
                risk_level=risk,
                message=f"Job description contains potentially exclusionary phrase: '{phrase}'.",
                recommendation=_coded_phrase_recommendation(phrase),
            ))

    return {"bias_flags": flags, "biased_job_language": biased_language}


def _coded_phrase_recommendation(phrase: str) -> str:
    recs = {
        "native speaker": "Replace with 'professional proficiency in [language]' or specify required communication skills.",
        "must be local": "Specify the actual need (e.g. 'in-person 3 days/week') rather than restricting by location.",
        "recent graduate": "Focus on required competencies instead of graduation recency, which can imply age discrimination.",
        "culture fit": "Replace with 'culture add' — or better, define specific values and behaviours you are hiring for.",
        "young professional": "Avoid age-implying language. Describe the experience level needed instead.",
        "digital native": "State the specific digital skills required rather than implying age-based familiarity.",
    }
    return recs.get(phrase, "Review whether this requirement is a genuine job necessity or an implicit filter.")


# ── 6. compute_fairness_score ─────────────────────────────────────────────────

def compute_fairness_score(state: dict) -> Dict:
    """
    Compute a fairness score 0–100.
    100 = no bias signals detected.
    Deductions:
      high risk flag:    -25
      medium risk flag:  -12
      low risk flag:     -5
    Floor: 10
    """
    flags = state.get("bias_flags") or []

    score = 100
    for f in flags:
        risk = f.get("risk_level", "low")
        if risk == "high":
            score -= 25
        elif risk == "medium":
            score -= 12
        else:
            score -= 5
    score = max(10, min(100, score))

    high_flags = [f for f in flags if f.get("risk_level") == "high"]
    medium_flags = [f for f in flags if f.get("risk_level") == "medium"]

    if high_flags:
        overall_risk = "high"
    elif len(medium_flags) >= 2 or score < 60:
        overall_risk = "medium"
    else:
        overall_risk = "low"

    requires_blind_review = overall_risk in {"high", "medium"}

    logger.info(
        "[bias_audit][run=%s] Fairness=%d risk=%s blind_review=%s",
        state.get("run_id"), score, overall_risk, requires_blind_review,
    )

    return {
        "fairness_score": score,
        "overall_risk": overall_risk,
        "requires_blind_review": requires_blind_review,
    }


# ── 7. build_summary ──────────────────────────────────────────────────────────

def build_summary(state: dict) -> Dict:
    name = state.get("candidate_name", "Candidate")
    score = state.get("fairness_score", 100)
    risk = state.get("overall_risk", "low")
    flags = state.get("bias_flags") or []
    biased_lang = state.get("biased_job_language") or []

    high_count = sum(1 for f in flags if f.get("risk_level") == "high")
    med_count = sum(1 for f in flags if f.get("risk_level") == "medium")

    risk_text = {
        "low": "low fairness risk — no critical bias signals detected",
        "medium": "moderate fairness risk — review flagged items before proceeding",
        "high": "high fairness risk — immediate remediation required before evaluation continues",
    }.get(risk, "unknown risk level")

    summary = (
        f"Bias audit for {name} returned a fairness score of {score}/100 ({risk_text}). "
        f"{len(flags)} signal(s) flagged ({high_count} high, {med_count} medium)."
    )
    if biased_lang:
        summary += (
            f" Job description contains {len(biased_lang)} potentially biased term(s): "
            f"{', '.join(biased_lang[:3])}{'...' if len(biased_lang) > 3 else ''}."
        )
    if state.get("requires_blind_review"):
        summary += " Blind review is recommended before scoring this candidate."

    return {"summary": summary}


# ── 8. finalize ───────────────────────────────────────────────────────────────

def finalize(state: dict) -> Dict:
    logger.info(
        "[bias_audit][run=%s] Complete — fairness=%d risk=%s",
        state.get("run_id"),
        state.get("fairness_score", 0),
        state.get("overall_risk"),
    )
    return {"status": "completed"}


# ── 9. handle_failure ─────────────────────────────────────────────────────────

def handle_failure(state: dict) -> Dict:
    logger.error(
        "[bias_audit][run=%s] FAILED: %s",
        state.get("run_id"), "; ".join(state.get("errors", [])),
    )
    return {"status": "failed"}
