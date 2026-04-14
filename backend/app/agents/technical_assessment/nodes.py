"""
PATHS Backend — Technical Assessment Agent Nodes (LangGraph).

Two-phase pipeline:
  Phase A — Question Generation (run once when assessment is created):
    generate_questions: derives questions from job skill requirements

  Phase B — Answer Scoring (run when answers are submitted):
    validate_inputs → load_context → score_answers → compute_result
        → build_summary → persist_results → finalize

No LLM required. Questions are generated deterministically from structured
job skill requirements. Scoring uses keyword overlap against expected answers.
"""

from __future__ import annotations

import logging
import re
import uuid as _uuid
from typing import Dict, List

logger = logging.getLogger(__name__)

# ── Question templates by skill category ──────────────────────────────────────
# Each template produces one question for a given skill name.
# {skill} is replaced with the actual skill name.

_QUESTION_TEMPLATES = [
    "Explain how you have used {skill} in a production environment. What were the main challenges?",
    "Describe the architecture of a system you built using {skill}. What design decisions did you make?",
    "What are the key strengths and limitations of {skill} compared to its alternatives?",
    "Walk us through how you would debug a performance issue in a {skill}-based application.",
    "How do you ensure code quality and test coverage when working with {skill}?",
]

# ── Difficulty assignment by importance_weight ────────────────────────────────

def _assign_difficulty(weight: float) -> str:
    if weight >= 0.8:
        return "hard"
    if weight >= 0.5:
        return "medium"
    return "easy"


# ─────────────────────────────────────────────────────────────────────────────
# PHASE A — QUESTION GENERATION
# ─────────────────────────────────────────────────────────────────────────────

def generate_questions_for_job(job_id: str, max_questions: int = 5) -> List[Dict]:
    """
    Generate assessment questions from a job's structured skill requirements.

    Returns a list of question dicts:
      { id, question, skill, difficulty, expected_keywords }

    Called by the assessments API when creating a new session.
    Does not touch LangGraph state — this is a utility function.
    """
    from app.core.database import SessionLocal
    from sqlalchemy import select
    from app.db.models.job import Job
    from app.db.models.job_ingestion import JobSkillRequirement

    db = SessionLocal()
    questions: List[Dict] = []

    try:
        try:
            jid = _uuid.UUID(job_id)
        except ValueError:
            return []

        job = db.get(Job, jid)
        if not job:
            return []

        reqs = db.execute(
            select(JobSkillRequirement)
            .where(JobSkillRequirement.job_id == jid)
            .order_by(JobSkillRequirement.importance_weight.desc())
        ).scalars().all()

        # Use top N required skills first, then fill with optional
        selected_reqs = sorted(reqs, key=lambda r: (not r.is_required, -r.importance_weight))
        selected_reqs = selected_reqs[:max_questions]

        for i, req in enumerate(selected_reqs):
            skill = req.skill_name_normalized
            template = _QUESTION_TEMPLATES[i % len(_QUESTION_TEMPLATES)]
            question_text = template.replace("{skill}", skill)

            # Expected keywords: the skill name itself + common adjacent terms
            keywords = [skill.lower()] + [
                w for w in re.split(r"[\s\-_/]+", skill.lower()) if len(w) >= 3
            ]

            questions.append({
                "id": str(i + 1),
                "skill": skill,
                "question": question_text,
                "difficulty": _assign_difficulty(req.importance_weight or 0.5),
                "is_required": req.is_required,
                "expected_keywords": list(set(keywords)),
            })

        # If job has no structured skill requirements, fall back to free-text keywords
        if not questions and (job.requirements or job.description_text):
            source = f"{job.requirements or ''} {job.description_text or ''}"
            tokens = [
                t for t in re.split(r"[\s,;/()\-\n\.]+", source.lower())
                if len(t) >= 4 and t.isalpha()
            ]
            # Rough stop-word filter
            stop = {"with", "have", "will", "must", "your", "team", "work", "that",
                    "this", "able", "from", "also", "into", "more", "than", "they",
                    "what", "when", "where", "which", "skill", "skills", "using",
                    "experience", "knowledge", "required"}
            unique_tokens = list(dict.fromkeys(t for t in tokens if t not in stop))

            for i, token in enumerate(unique_tokens[:max_questions]):
                template = _QUESTION_TEMPLATES[i % len(_QUESTION_TEMPLATES)]
                questions.append({
                    "id": str(i + 1),
                    "skill": token,
                    "question": template.replace("{skill}", token),
                    "difficulty": "medium",
                    "is_required": True,
                    "expected_keywords": [token],
                })

        logger.info("[tech_assessment] Generated %d questions for job %s", len(questions), job_id)
        return questions

    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# PHASE B — ANSWER SCORING
# ─────────────────────────────────────────────────────────────────────────────

def validate_inputs(state: dict) -> Dict:
    if not state.get("session_id"):
        return {"errors": ["session_id is required"], "status": "failed"}
    answers = state.get("answers") or []
    if not answers:
        return {"errors": ["answers list cannot be empty"], "status": "failed"}
    for a in answers:
        if not a.get("question_id") or not a.get("answer_text", "").strip():
            return {"errors": ["Each answer must have question_id and non-empty answer_text"], "status": "failed"}
    logger.info("[tech_assessment][run=%s] %d answers validated", state.get("run_id"), len(answers))
    return {}


def load_context(state: dict) -> Dict:
    """Load the AssessmentSession (questions) and candidate profile."""
    from app.core.database import SessionLocal
    from app.db.models.assessment import AssessmentSession
    from app.db.models.candidate import Candidate
    from sqlalchemy import select
    from app.db.models.cv_entities import CandidateSkill, Skill

    db = SessionLocal()
    try:
        try:
            sid = _uuid.UUID(state["session_id"])
            session = db.get(AssessmentSession, sid)
        except (ValueError, KeyError):
            return {"errors": ["Invalid session_id"], "status": "failed"}

        if not session:
            return {"errors": [f"AssessmentSession {state['session_id']} not found"], "status": "failed"}

        questions = session.questions_json or []
        if not questions:
            return {"errors": ["Assessment has no questions — generate questions first"], "status": "failed"}

        # Candidate profile
        candidate = db.get(Candidate, session.candidate_id)
        candidate_name = candidate.full_name if candidate else "Unknown"

        skill_rows = db.execute(
            select(CandidateSkill, Skill)
            .join(Skill, CandidateSkill.skill_id == Skill.id)
            .where(CandidateSkill.candidate_id == session.candidate_id)
        ).all()
        candidate_skills = [r.Skill.normalized_name for r in skill_rows]

        # Job title
        from app.db.models.job import Job
        job = db.get(Job, session.job_id)
        job_title = job.title if job else "Unknown Role"

        logger.info(
            "[tech_assessment][run=%s] Context: %s, %d questions, %d profile skills",
            state.get("run_id"), candidate_name, len(questions), len(candidate_skills),
        )
        return {
            "questions": questions,
            "candidate_name": candidate_name,
            "candidate_skills": candidate_skills,
            "job_title": job_title,
        }

    except Exception as exc:
        logger.exception("[tech_assessment][run=%s] Context load error", state.get("run_id"))
        return {"errors": [f"Context load failed: {exc}"], "status": "failed"}
    finally:
        db.close()


def score_answers(state: dict) -> Dict:
    """
    Score each submitted answer against its question's expected keywords.

    Scoring per question (0–100):
      - Base score 30 (something was written)
      - +10 per expected keyword found in answer (capped at 60 bonus)
      - Minimum answer length check: < 20 chars → 20 (near-empty)
      - Bonus: if candidate's profile skills include the question's skill → +10
    """
    questions: List[Dict] = state.get("questions") or []
    answers: List[Dict] = state.get("answers") or []
    candidate_skills: List[str] = state.get("candidate_skills") or []
    candidate_skill_set = {s.lower() for s in candidate_skills}

    # Build lookup: question_id → question dict
    q_map = {q["id"]: q for q in questions}

    question_scores: Dict[str, int] = {}
    question_details: List[Dict] = []

    for ans in answers:
        qid = str(ans["question_id"])
        answer_text = (ans.get("answer_text") or "").lower()

        if qid not in q_map:
            logger.warning("[tech_assessment] No question found for answer id %s", qid)
            continue

        q = q_map[qid]
        expected_keywords: List[str] = q.get("expected_keywords") or []
        skill = q.get("skill", "")

        if len(answer_text.strip()) < 20:
            score = 20
            matched = []
        else:
            answer_tokens = set(re.split(r"[\s,;.\-!\?\(\)]+", answer_text))
            matched = [kw for kw in expected_keywords if kw.lower() in answer_tokens or kw.lower() in answer_text]
            score = 30 + min(len(matched) * 10, 60)

        # Profile boost — if this skill is already in their profile, they likely know it
        if skill.lower() in candidate_skill_set:
            score = min(100, score + 10)

        missed = [kw for kw in expected_keywords if kw not in matched]
        question_scores[qid] = min(100, score)

        question_details.append({
            "question_id": qid,
            "question": q.get("question", ""),
            "skill": skill,
            "difficulty": q.get("difficulty", "medium"),
            "answer_text": ans.get("answer_text", ""),
            "score": question_scores[qid],
            "matched_keywords": matched,
            "missed_keywords": missed[:3],
        })

    logger.info(
        "[tech_assessment][run=%s] Scored %d questions",
        state.get("run_id"), len(question_details),
    )
    return {"question_scores": question_scores, "question_details": question_details}


def compute_result(state: dict) -> Dict:
    """
    Compute weighted composite score.
    Hard questions are weighted 1.5x, medium 1.0x, easy 0.7x.
    Result: pass (>=70) | borderline (50–69) | fail (<50)
    """
    question_details: List[Dict] = state.get("question_details") or []
    questions: List[Dict] = state.get("questions") or []

    if not question_details:
        return {
            "overall_score": 0,
            "result": "fail",
            "data_warnings": list(state.get("data_warnings") or []) + ["No answers were scored"],
        }

    difficulty_weight = {"hard": 1.5, "medium": 1.0, "easy": 0.7}
    total_weight = 0.0
    weighted_sum = 0.0

    for detail in question_details:
        w = difficulty_weight.get(detail.get("difficulty", "medium"), 1.0)
        weighted_sum += detail["score"] * w
        total_weight += w

    composite = int(weighted_sum / max(total_weight, 1))
    result = "pass" if composite >= 70 else "borderline" if composite >= 50 else "fail"

    logger.info("[tech_assessment][run=%s] Score=%d result=%s", state.get("run_id"), composite, result)
    return {"overall_score": composite, "result": result}


def build_summary(state: dict) -> Dict:
    """Extract strengths/gaps and write a human-readable summary."""
    details: List[Dict] = state.get("question_details") or []
    name = state.get("candidate_name", "Candidate")
    job = state.get("job_title", "the role")
    score = state.get("overall_score", 0)
    result = state.get("result", "fail")

    # Strengths = questions scored ≥ 70
    strengths = [d["skill"] for d in details if d["score"] >= 70]
    # Gaps = questions scored < 50
    gaps = [d["skill"] for d in details if d["score"] < 50]

    result_text = {
        "pass": "passed the technical assessment",
        "borderline": "scored borderline on the technical assessment",
        "fail": "did not meet the pass threshold on the technical assessment",
    }.get(result, "completed the assessment")

    covered = [d["skill"] for d in details if d["matched_keywords"]]
    not_covered = [d["skill"] for d in details if not d["matched_keywords"]]

    summary = (
        f"{name} {result_text} for {job} with a composite score of {score}/100. "
    )
    if covered:
        summary += f"Demonstrated knowledge of: {', '.join(covered[:4])}. "
    if not_covered:
        summary += f"Insufficient evidence provided for: {', '.join(not_covered[:3])}."

    return {
        "strengths": strengths[:5],
        "gaps": gaps[:5],
        "summary": summary.strip(),
    }


def persist_results(state: dict) -> Dict:
    """Write scoring results back to the AssessmentSession record."""
    from app.core.database import SessionLocal
    from app.db.models.assessment import AssessmentSession

    db = SessionLocal()
    try:
        session_id = _uuid.UUID(state["session_id"])
        session = db.get(AssessmentSession, session_id)
        if not session:
            return {"errors": [f"AssessmentSession {session_id} not found"], "status": "failed"}

        session.answers_json = state.get("answers", [])
        session.question_scores_json = state.get("question_scores", {})
        session.overall_score = state.get("overall_score")
        session.result = state.get("result")
        session.summary = state.get("summary")
        session.strengths = state.get("strengths", [])
        session.gaps = state.get("gaps", [])
        session.status = "scored"

        db.commit()
        logger.info("[tech_assessment][run=%s] Results persisted", state.get("run_id"))
        return {}

    except Exception as exc:
        logger.exception("[tech_assessment][run=%s] Persist error", state.get("run_id"))
        return {"errors": [f"Persist failed: {exc}"], "status": "failed"}
    finally:
        db.close()


def finalize(state: dict) -> Dict:
    logger.info(
        "[tech_assessment][run=%s] Complete — score=%d result=%s",
        state.get("run_id"), state.get("overall_score", 0), state.get("result"),
    )
    return {"status": "completed"}


def handle_failure(state: dict) -> Dict:
    logger.error(
        "[tech_assessment][run=%s] FAILED: %s",
        state.get("run_id"), "; ".join(state.get("errors", [])),
    )
    return {"status": "failed"}
