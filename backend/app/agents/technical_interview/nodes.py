"""
PATHS Backend — Technical Interview Agent Nodes (LangGraph).

Evaluates a completed technical interview session using deterministic
rubric-based scoring. Differs from the HR Interview Agent by focusing on:
  - Technical depth and accuracy
  - Problem-solving signals
  - Code quality awareness
  - Domain/stack knowledge
  - Skill coverage against job requirements

No LLM required in v1. All scoring is keyword-rubric + skill overlap.
"""

from __future__ import annotations

import logging
import re
from typing import Dict, List

logger = logging.getLogger(__name__)

# ── Technical keyword rubrics ─────────────────────────────────────────────────

_TECHNICAL_DEPTH_POSITIVE = frozenset({
    "deep", "expert", "advanced", "architecture", "internals", "understood",
    "explained", "detailed", "comprehensive", "thorough", "knowledgeable",
    "solid", "strong", "proficient", "demonstrated", "implemented",
})
_TECHNICAL_DEPTH_NEGATIVE = frozenset({
    "shallow", "surface", "basic", "struggled", "confused", "incorrect",
    "wrong", "gap", "missing", "unaware", "unclear", "vague", "unsure",
})

_PROBLEM_SOLVING_POSITIVE = frozenset({
    "analyzed", "approach", "systematic", "breakdown", "edge", "case",
    "optimized", "trade-off", "solution", "designed", "proposed", "creative",
    "efficient", "reasoned", "logical", "structured", "methodical",
})
_PROBLEM_SOLVING_NEGATIVE = frozenset({
    "stuck", "no approach", "random", "guessed", "wrong", "off-track",
    "jumped", "skipped", "avoided",
})

_CODE_QUALITY_POSITIVE = frozenset({
    "test", "testing", "coverage", "clean", "readable", "maintainable",
    "pattern", "solid", "dry", "documented", "refactored", "modular",
    "separation", "concerns", "abstraction", "interface", "async",
})
_CODE_QUALITY_NEGATIVE = frozenset({
    "hardcoded", "spaghetti", "no tests", "messy", "monolith", "coupled",
    "duplicated", "copy-paste",
})

_DOMAIN_KNOWLEDGE_POSITIVE = frozenset({
    "familiar", "used", "worked", "experience", "project", "production",
    "deployed", "integrated", "configured", "proficient", "hands-on",
    "real-world", "industry",
})
_DOMAIN_KNOWLEDGE_NEGATIVE = frozenset({
    "never used", "not familiar", "never seen", "unfamiliar", "no experience",
})


def _keyword_score(text: str, positives: frozenset, negatives: frozenset) -> int:
    tokens = set(re.split(r"[\s,;.\-!\?]+", text.lower()))
    pos_hits = len(tokens & positives)
    neg_hits = len(tokens & negatives)
    score = 60
    score += min(pos_hits * 6, 35)
    score -= min(neg_hits * 10, 50)
    return max(10, min(100, score))


def _extract_signals(text: str, positive_words: frozenset) -> List[str]:
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
        return {"errors": ["interview_notes cannot be empty"], "status": "failed"}
    if len(notes) < 30:
        return {"errors": ["interview_notes too short — at least 30 characters required"], "status": "failed"}

    logger.info("[tech_interview][run=%s] Inputs validated, notes=%d chars", state.get("run_id"), len(notes))
    return {}


# ── 2. load_context ───────────────────────────────────────────────────────────

def load_context(state: dict) -> Dict:
    """Load candidate skills and job skill requirements from PostgreSQL."""
    import uuid as _uuid
    from app.core.database import SessionLocal
    from sqlalchemy import select
    from app.db.models.candidate import Candidate
    from app.db.models.cv_entities import CandidateSkill, Skill
    from app.db.models.job import Job
    from app.db.models.job_ingestion import JobSkillRequirement

    db = SessionLocal()
    warnings: List[str] = list(state.get("data_warnings") or [])
    updates: Dict = {}

    try:
        # Candidate
        try:
            cid = _uuid.UUID(state["candidate_id"])
            candidate = db.get(Candidate, cid)
        except (ValueError, KeyError):
            candidate = None

        if candidate:
            updates["candidate_name"] = candidate.full_name or "Unknown"
            updates["candidate_years_experience"] = candidate.years_experience
            skill_rows = db.execute(
                select(CandidateSkill, Skill)
                .join(Skill, CandidateSkill.skill_id == Skill.id)
                .where(CandidateSkill.candidate_id == cid)
            ).all()
            updates["candidate_skills"] = [r.Skill.normalized_name for r in skill_rows]
        else:
            warnings.append("Candidate not found — no profile skill context available")
            updates.update({"candidate_name": "Unknown", "candidate_skills": [], "candidate_years_experience": None})

        # Job skill requirements
        try:
            jid = _uuid.UUID(state["job_id"])
            job = db.get(Job, jid)
        except (ValueError, KeyError):
            job = None

        if job:
            updates["job_title"] = job.title or "Unknown Role"
            req_rows = db.execute(
                select(JobSkillRequirement).where(JobSkillRequirement.job_id == jid)
            ).scalars().all()
            updates["job_skill_requirements"] = [r.skill_name_normalized for r in req_rows]
        else:
            warnings.append("Job not found — no skill requirement context available")
            updates.update({"job_title": "Unknown Role", "job_skill_requirements": []})

        updates["data_warnings"] = warnings
        logger.info(
            "[tech_interview][run=%s] Context: candidate=%s, job_skills=%d",
            state.get("run_id"),
            updates.get("candidate_name"),
            len(updates.get("job_skill_requirements", [])),
        )
        return updates

    except Exception as exc:
        logger.exception("[tech_interview][run=%s] Context load error", state.get("run_id"))
        return {"errors": [f"Context load failed: {exc}"], "status": "failed"}
    finally:
        db.close()


# ── 3. score_dimensions ───────────────────────────────────────────────────────

def score_dimensions(state: dict) -> Dict:
    notes = state.get("interview_notes", "")

    answers = state.get("structured_answers") or []
    if answers:
        answer_text = " ".join(
            f"{a.get('question', '')} {a.get('answer', '')} {a.get('expected_answer', '')}"
            for a in answers
        )
        full_text = f"{notes} {answer_text}"
    else:
        full_text = notes

    depth = _keyword_score(full_text, _TECHNICAL_DEPTH_POSITIVE, _TECHNICAL_DEPTH_NEGATIVE)
    ps = _keyword_score(full_text, _PROBLEM_SOLVING_POSITIVE, _PROBLEM_SOLVING_NEGATIVE)
    cq = _keyword_score(full_text, _CODE_QUALITY_POSITIVE, _CODE_QUALITY_NEGATIVE)
    dk = _keyword_score(full_text, _DOMAIN_KNOWLEDGE_POSITIVE, _DOMAIN_KNOWLEDGE_NEGATIVE)

    logger.info(
        "[tech_interview][run=%s] Dimensions — depth=%d ps=%d cq=%d dk=%d",
        state.get("run_id"), depth, ps, cq, dk,
    )

    return {
        "technical_depth_score": depth,
        "problem_solving_score": ps,
        "code_quality_score": cq,
        "domain_knowledge_score": dk,
    }


# ── 4. check_skill_coverage ───────────────────────────────────────────────────

def check_skill_coverage(state: dict) -> Dict:
    """
    Compare candidate skills against job skill requirements.

    Measures how many required job skills are present in the candidate profile.
    This is cross-validated with what was discussed in the interview notes.
    """
    candidate_skills: List[str] = state.get("candidate_skills") or []
    job_skills: List[str] = state.get("job_skill_requirements") or []
    notes_lower = state.get("interview_notes", "").lower()

    candidate_set = {s.lower() for s in candidate_skills}

    matched: List[str] = []
    missing: List[str] = []
    for req in job_skills:
        req_lower = req.lower()
        # Match either from profile or from notes mention
        if req_lower in candidate_set or req_lower in notes_lower:
            matched.append(req)
        else:
            missing.append(req)

    if job_skills:
        coverage = int(len(matched) / len(job_skills) * 100)
    else:
        coverage = 60  # neutral when no job skills are defined
        state.get("data_warnings", []).append(
            "Job has no structured skill requirements — skill coverage score defaulted to neutral"
        )

    logger.info(
        "[tech_interview][run=%s] Skill coverage: %d/%d matched (%d%%)",
        state.get("run_id"), len(matched), len(job_skills), coverage,
    )

    return {
        "skill_coverage_score": coverage,
        "matched_skills": matched[:8],
        "missing_skills": missing[:5],
    }


# ── 5. compute_composite ──────────────────────────────────────────────────────

def compute_composite(state: dict) -> Dict:
    """
    Weighted composite for Technical Interview:
      Technical Depth   30%
      Problem Solving   25%
      Code Quality      20%
      Domain Knowledge  15%
      Skill Coverage    10%
    """
    depth = state.get("technical_depth_score", 60)
    ps = state.get("problem_solving_score", 60)
    cq = state.get("code_quality_score", 60)
    dk = state.get("domain_knowledge_score", 60)
    cov = state.get("skill_coverage_score", 60)

    composite = int(
        depth * 0.30
        + ps * 0.25
        + cq * 0.20
        + dk * 0.15
        + cov * 0.10
    )

    recommendation = (
        "proceed" if composite >= 70
        else "hold" if composite >= 50
        else "reject"
    )

    logger.info(
        "[tech_interview][run=%s] Composite=%d recommendation=%s",
        state.get("run_id"), composite, recommendation,
    )

    return {
        "overall_score": composite,
        "recommendation": recommendation,
        "dimension_scores": {
            "technical_depth": depth,
            "problem_solving": ps,
            "code_quality": cq,
            "domain_knowledge": dk,
            "skill_coverage": cov,
        },
    }


# ── 6. extract_strengths_concerns ─────────────────────────────────────────────

def extract_strengths_concerns(state: dict) -> Dict:
    notes = state.get("interview_notes", "")

    strengths = (
        _extract_signals(notes, _TECHNICAL_DEPTH_POSITIVE)
        + _extract_signals(notes, _PROBLEM_SOLVING_POSITIVE)
    )
    seen: set = set()
    strengths_deduped = []
    for s in strengths:
        if s.lower() not in seen:
            seen.add(s.lower())
            strengths_deduped.append(s)

    # Add matched skills as strength signals
    for skill in (state.get("matched_skills") or [])[:2]:
        cap = skill.capitalize()
        if cap.lower() not in seen:
            seen.add(cap.lower())
            strengths_deduped.append(cap)

    concerns = _extract_signals(notes, _TECHNICAL_DEPTH_NEGATIVE) + _extract_signals(notes, _PROBLEM_SOLVING_NEGATIVE)
    seen_c: set = set()
    concerns_deduped = []
    for c in concerns:
        if c.lower() not in seen_c:
            seen_c.add(c.lower())
            concerns_deduped.append(c)

    # Missing required skills are explicit concerns
    for skill in (state.get("missing_skills") or [])[:2]:
        cap = f"Missing: {skill.capitalize()}"
        concerns_deduped.append(cap)

    if not strengths_deduped:
        strengths_deduped = ["Technical interview completed"]

    return {
        "strengths": strengths_deduped[:5],
        "concerns": concerns_deduped[:5],
    }


# ── 7. build_summary ──────────────────────────────────────────────────────────

def build_summary(state: dict) -> Dict:
    name = state.get("candidate_name", "Candidate")
    job = state.get("job_title", "the role")
    score = state.get("overall_score", 0)
    rec = state.get("recommendation", "hold")
    depth = state.get("technical_depth_score", 0)
    ps = state.get("problem_solving_score", 0)
    matched = state.get("matched_skills") or []
    missing = state.get("missing_skills") or []

    rec_text = {
        "proceed": "recommended to proceed to the next stage",
        "hold": "placed on hold pending further review",
        "reject": "not recommended based on technical evaluation",
    }.get(rec, "on hold")

    matched_str = ", ".join(matched[:3]) if matched else "none confirmed"
    missing_str = ", ".join(missing[:3]) if missing else "none identified"

    summary = (
        f"{name} completed the technical interview for {job} with a composite score of {score}/100. "
        f"Technical depth rated {depth}/100, problem solving rated {ps}/100. "
        f"Matched skills: {matched_str}. Skill gaps: {missing_str}. "
        f"Candidate is {rec_text}."
    )

    return {"evaluation_summary": summary}


# ── 8. persist_score ─────────────────────────────────────────────────────────

def persist_score(state: dict) -> Dict:
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
        session.scored_by = "technical_agent"

        if session.status in {"scheduled", "needs_scoring"}:
            session.status = "completed"

        db.commit()
        logger.info(
            "[tech_interview][run=%s] Score persisted to session %s",
            state.get("run_id"), session_id,
        )
        return {}

    except Exception as exc:
        logger.exception("[tech_interview][run=%s] Persist error", state.get("run_id"))
        return {"errors": [f"Failed to persist score: {exc}"], "status": "failed"}
    finally:
        db.close()


# ── 9. finalize ───────────────────────────────────────────────────────────────

def finalize(state: dict) -> Dict:
    logger.info(
        "[tech_interview][run=%s] Pipeline complete — score=%d recommendation=%s",
        state.get("run_id"),
        state.get("overall_score", 0),
        state.get("recommendation"),
    )
    return {"status": "completed"}


# ── 10. handle_failure ────────────────────────────────────────────────────────

def handle_failure(state: dict) -> Dict:
    errors = state.get("errors", [])
    logger.error(
        "[tech_interview][run=%s] Pipeline FAILED: %s",
        state.get("run_id"),
        "; ".join(errors),
    )
    return {"status": "failed"}
