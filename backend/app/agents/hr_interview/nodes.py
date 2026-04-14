"""
PATHS Backend — HR Interview Agent Nodes (LangGraph).

Evaluates a completed HR/behavioral interview session using deterministic
rubric-based scoring. No LLM is required in v1 — scores are derived from:
  - Presence and density of keywords in recruiter notes
  - Structured answer quality (if provided)
  - Candidate profile signals (experience, completeness)

Each node receives HRInterviewState and returns a partial state update.
"""

from __future__ import annotations

import logging
import re
from typing import Dict, List

logger = logging.getLogger(__name__)

# ── Keyword rubrics ───────────────────────────────────────────────────────────
# Sets of positive/negative signal words for each dimension.
# Positive words increase the score; negative words reduce it.

_COMMUNICATION_POSITIVE = frozenset({
    "articulate", "clear", "concise", "explained", "confident", "fluent",
    "structured", "coherent", "professional", "engaging", "responsive",
    "listened", "thoughtful", "precise", "well-spoken",
})
_COMMUNICATION_NEGATIVE = frozenset({
    "vague", "unclear", "hesitant", "rambling", "confused", "incoherent",
    "inarticulate", "nervous", "evasive", "distracted",
})

_CULTURE_FIT_POSITIVE = frozenset({
    "collaborative", "team", "values", "aligned", "enthusiastic", "proactive",
    "ownership", "initiative", "adaptable", "flexible", "open", "respectful",
    "committed", "driven", "reliable", "accountable", "passionate",
})
_CULTURE_FIT_NEGATIVE = frozenset({
    "individualistic", "resistant", "rigid", "conflict", "difficult",
    "unresponsive", "arrogant", "dismissive", "disengaged",
})

_MOTIVATION_POSITIVE = frozenset({
    "excited", "eager", "motivated", "goal", "growth", "opportunity",
    "challenge", "impact", "passionate", "interested", "curious",
    "ambitious", "dedicated", "committed",
})
_MOTIVATION_NEGATIVE = frozenset({
    "indifferent", "bored", "unmotivated", "unsure", "undecided",
    "reluctant", "disinterested",
})

_CLARITY_POSITIVE = frozenset({
    "specific", "example", "situation", "action", "result", "outcome",
    "data", "measured", "quantified", "structured", "star", "logical",
    "relevant", "detailed",
})
_CLARITY_NEGATIVE = frozenset({
    "generic", "vague", "abstract", "buzzword", "cliche", "superficial",
    "unrelated", "irrelevant",
})


def _keyword_score(text: str, positives: frozenset, negatives: frozenset) -> int:
    """
    Score a text block 0–100 by counting positive and negative keyword hits.

    Baseline: 60 (neutral, no signals detected).
    Each positive hit: +5 (capped at +35, so max 95 from positives alone).
    Each negative hit: -8 (capped at -50, so min 10 from negatives alone).
    """
    tokens = set(re.split(r"[\s,;.\-!\?]+", text.lower()))
    pos_hits = len(tokens & positives)
    neg_hits = len(tokens & negatives)

    score = 60
    score += min(pos_hits * 5, 35)
    score -= min(neg_hits * 8, 50)
    return max(10, min(100, score))


def _extract_signals(text: str, positive_words: frozenset) -> List[str]:
    """Return up to 3 matched positive signal words as human-readable phrases."""
    tokens = set(re.split(r"[\s,;.\-!\?]+", text.lower()))
    matched = list(tokens & positive_words)[:3]
    return [w.capitalize() for w in matched]


# ── 1. validate_inputs ────────────────────────────────────────────────────────

def validate_inputs(state: dict) -> Dict:
    notes = (state.get("interview_notes") or "").strip()
    session_id = (state.get("session_id") or "").strip()

    if not session_id:
        return {"errors": ["session_id is required"], "status": "failed"}
    if not notes:
        return {"errors": ["interview_notes cannot be empty — provide recruiter notes to evaluate"], "status": "failed"}
    if len(notes) < 30:
        return {"errors": ["interview_notes too short — provide at least 30 characters of substantive notes"], "status": "failed"}

    logger.info("[hr_interview][run=%s] Inputs validated, notes length=%d", state.get("run_id"), len(notes))
    return {}


# ── 2. load_context ───────────────────────────────────────────────────────────

def load_context(state: dict) -> Dict:
    """
    Load candidate profile and job details from PostgreSQL.
    This enriches the evaluation with profile signals beyond the notes alone.
    """
    import uuid as _uuid
    from app.core.database import SessionLocal
    from sqlalchemy import select
    from app.db.models.candidate import Candidate
    from app.db.models.cv_entities import CandidateSkill, Skill
    from app.db.models.job import Job

    db = SessionLocal()
    warnings: List[str] = list(state.get("data_warnings") or [])
    updates: Dict = {}

    try:
        # Load candidate
        try:
            cid = _uuid.UUID(state["candidate_id"])
            candidate = db.get(Candidate, cid)
        except (ValueError, KeyError):
            candidate = None

        if candidate:
            updates["candidate_name"] = candidate.full_name or "Unknown"
            updates["candidate_summary"] = candidate.summary or ""
            updates["candidate_years_experience"] = candidate.years_experience

            # Load skills
            skill_rows = db.execute(
                select(CandidateSkill, Skill)
                .join(Skill, CandidateSkill.skill_id == Skill.id)
                .where(CandidateSkill.candidate_id == cid)
            ).all()
            updates["candidate_skills"] = [r.Skill.normalized_name for r in skill_rows]
        else:
            warnings.append("Candidate record not found — scoring based on notes only")
            updates.update({"candidate_name": "Unknown", "candidate_summary": "", "candidate_skills": []})

        # Load job
        try:
            jid = _uuid.UUID(state["job_id"])
            job = db.get(Job, jid)
        except (ValueError, KeyError):
            job = None

        if job:
            updates["job_title"] = job.title or "Unknown Role"
            updates["job_requirements"] = job.requirements or job.description_text or ""
        else:
            warnings.append("Job record not found — scoring without job context")
            updates.update({"job_title": "Unknown Role", "job_requirements": ""})

        updates["data_warnings"] = warnings
        logger.info(
            "[hr_interview][run=%s] Context loaded: candidate=%s, job=%s",
            state.get("run_id"),
            updates.get("candidate_name"),
            updates.get("job_title"),
        )
        return updates

    except Exception as exc:
        logger.exception("[hr_interview][run=%s] Context load error", state.get("run_id"))
        return {"errors": [f"Context load failed: {exc}"], "status": "failed"}
    finally:
        db.close()


# ── 3. score_dimensions ───────────────────────────────────────────────────────

def score_dimensions(state: dict) -> Dict:
    """
    Apply the keyword rubric to the recruiter notes across four dimensions.

    If structured_answers are also provided, merge their text into the notes
    for richer signal coverage.
    """
    notes = state.get("interview_notes", "")

    # Merge in structured answers if available
    answers = state.get("structured_answers") or []
    if answers:
        answer_text = " ".join(
            f"{a.get('question', '')} {a.get('answer', '')}"
            for a in answers
        )
        full_text = f"{notes} {answer_text}"
    else:
        full_text = notes

    comm_score = _keyword_score(full_text, _COMMUNICATION_POSITIVE, _COMMUNICATION_NEGATIVE)
    cult_score = _keyword_score(full_text, _CULTURE_FIT_POSITIVE, _CULTURE_FIT_NEGATIVE)
    motiv_score = _keyword_score(full_text, _MOTIVATION_POSITIVE, _MOTIVATION_NEGATIVE)
    clarity_score = _keyword_score(full_text, _CLARITY_POSITIVE, _CLARITY_NEGATIVE)

    logger.info(
        "[hr_interview][run=%s] Dimension scores — comm=%d cult=%d motiv=%d clarity=%d",
        state.get("run_id"), comm_score, cult_score, motiv_score, clarity_score,
    )

    return {
        "communication_score": comm_score,
        "culture_fit_score": cult_score,
        "motivation_score": motiv_score,
        "clarity_score": clarity_score,
    }


# ── 4. compute_composite ──────────────────────────────────────────────────────

def compute_composite(state: dict) -> Dict:
    """
    Compute weighted composite score and derive recommendation.

    HR Interview weights:
      Communication  35%  — most important for behavioral/HR assessment
      Culture Fit    30%
      Motivation     20%
      Clarity        15%
    """
    comm = state.get("communication_score", 60)
    cult = state.get("culture_fit_score", 60)
    motiv = state.get("motivation_score", 60)
    clarity = state.get("clarity_score", 60)

    composite = int(comm * 0.35 + cult * 0.30 + motiv * 0.20 + clarity * 0.15)

    recommendation = (
        "proceed" if composite >= 70
        else "hold" if composite >= 50
        else "reject"
    )

    logger.info(
        "[hr_interview][run=%s] Composite=%d recommendation=%s",
        state.get("run_id"), composite, recommendation,
    )

    return {
        "overall_score": composite,
        "recommendation": recommendation,
        "dimension_scores": {
            "communication": comm,
            "culture_fit": cult,
            "motivation": motiv,
            "clarity": clarity,
        },
    }


# ── 5. extract_strengths_concerns ─────────────────────────────────────────────

def extract_strengths_concerns(state: dict) -> Dict:
    """
    Extract up to 3 strengths and up to 3 concerns from the interview notes
    using matched positive/negative keyword signals.
    """
    notes = state.get("interview_notes", "")

    strengths = (
        _extract_signals(notes, _COMMUNICATION_POSITIVE)
        + _extract_signals(notes, _CULTURE_FIT_POSITIVE)
        + _extract_signals(notes, _MOTIVATION_POSITIVE)
    )
    # Deduplicate while preserving order
    seen: set = set()
    strengths_deduped = []
    for s in strengths:
        if s.lower() not in seen:
            seen.add(s.lower())
            strengths_deduped.append(s)

    concerns = (
        _extract_signals(notes, _COMMUNICATION_NEGATIVE)
        + _extract_signals(notes, _CULTURE_FIT_NEGATIVE)
    )
    seen_c: set = set()
    concerns_deduped = []
    for c in concerns:
        if c.lower() not in seen_c:
            seen_c.add(c.lower())
            concerns_deduped.append(c)

    # Always include at least one meaningful entry even if no keywords matched
    if not strengths_deduped:
        strengths_deduped = ["Interview completed and notes reviewed"]
    if not concerns_deduped:
        concerns_deduped = []  # No concerns is fine

    return {
        "strengths": strengths_deduped[:5],
        "concerns": concerns_deduped[:3],
    }


# ── 6. build_summary ──────────────────────────────────────────────────────────

def build_summary(state: dict) -> Dict:
    """Build a human-readable evaluation summary from all computed signals."""
    name = state.get("candidate_name", "Candidate")
    job = state.get("job_title", "the role")
    score = state.get("overall_score", 0)
    rec = state.get("recommendation", "hold")
    comm = state.get("communication_score", 0)
    cult = state.get("culture_fit_score", 0)

    rec_text = {
        "proceed": "recommended to proceed to the next stage",
        "hold": "placed on hold pending further review",
        "reject": "not recommended for this role at this time",
    }.get(rec, "on hold")

    summary = (
        f"{name} completed the HR interview for {job} with a composite score of {score}/100. "
        f"Communication was rated {comm}/100 and culture fit {cult}/100. "
        f"Based on the interview evaluation, the candidate is {rec_text}."
    )

    return {"evaluation_summary": summary}


# ── 7. persist_score ─────────────────────────────────────────────────────────

def persist_score(state: dict) -> Dict:
    """
    Write the evaluation results back to the InterviewSession record in PostgreSQL.
    """
    import uuid as _uuid
    from app.core.database import SessionLocal
    from app.db.models.interview import InterviewSession

    db = SessionLocal()
    try:
        session_id = _uuid.UUID(state["session_id"])
        session = db.get(InterviewSession, session_id)
        if not session:
            return {"errors": [f"InterviewSession {session_id} not found"], "status": "failed"}

        session.overall_score = state.get("overall_score")
        session.dimension_scores = state.get("dimension_scores")
        session.feedback_text = state.get("evaluation_summary")
        session.strengths = state.get("strengths", [])
        session.concerns = state.get("concerns", [])
        session.recommendation = state.get("recommendation")
        session.scored_by = "hr_agent"

        # Auto-transition to completed
        if session.status in {"scheduled", "needs_scoring"}:
            session.status = "completed"

        db.commit()
        logger.info(
            "[hr_interview][run=%s] Score persisted to session %s",
            state.get("run_id"), session_id,
        )
        return {}

    except Exception as exc:
        logger.exception("[hr_interview][run=%s] Persist error", state.get("run_id"))
        return {"errors": [f"Failed to persist score: {exc}"], "status": "failed"}
    finally:
        db.close()


# ── 8. finalize ───────────────────────────────────────────────────────────────

def finalize(state: dict) -> Dict:
    logger.info(
        "[hr_interview][run=%s] Pipeline complete — score=%d recommendation=%s",
        state.get("run_id"),
        state.get("overall_score", 0),
        state.get("recommendation"),
    )
    return {"status": "completed"}


# ── 9. handle_failure ─────────────────────────────────────────────────────────

def handle_failure(state: dict) -> Dict:
    errors = state.get("errors", [])
    logger.error(
        "[hr_interview][run=%s] Pipeline FAILED: %s",
        state.get("run_id"),
        "; ".join(errors),
    )
    return {"status": "failed"}
