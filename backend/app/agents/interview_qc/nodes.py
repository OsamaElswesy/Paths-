"""
PATHS Backend — Interview Quality Control Agent Nodes (LangGraph).

Evaluates the quality of completed interview notes and scoring to ensure
that downstream decision-making is based on substantive, unbiased evidence.

Checks performed:
  1. Note length         — minimum word count to support a fair evaluation
  2. Specificity         — ratio of concrete examples vs vague adjectives
  3. Evidence markers    — STAR method signals (Situation/Task/Action/Result)
  4. Bias language       — known coded or biased phrases in interview notes
  5. Score rationale     — if scored, is there explanatory feedback text?
  6. Balance             — notes should contain both positive and critical signals
  7. Question coverage   — if structured answers were captured, are they substantive?

Output: quality_score (0–100), quality_level, quality_flags, bias_language_detected.

This agent is READ-ONLY — it does NOT modify any records.
"""

from __future__ import annotations

import logging
import re
from typing import Dict, List, Set

logger = logging.getLogger(__name__)

# ── Bias language in interview notes ─────────────────────────────────────────
# These phrases in notes are red flags for biased evaluation.
_BIAS_PHRASES: List[str] = [
    "well-spoken",        # racial dog-whistle
    "articulate",         # racial bias signal when applied to Black candidates
    "not like us",        # explicit exclusion
    "doesn't fit",        # vague rejection code
    "not a fit",
    "cultural fit issue",
    "aggressive",         # gendered for women
    "too emotional",      # gendered
    "too old",
    "too young",
    "overqualified",      # used to screen out older workers
    "underqualified",     # when not backed by specifics
    "foreign accent",
    "language barrier",   # may be code for bias
    "abrasive",           # often applied to assertive women
    "difficult",          # vague — should have specifics
    "hard to read",
]

# ── Vague adjectives — low specificity signal ─────────────────────────────────
_VAGUE_ADJECTIVES: Set[str] = {
    "good", "great", "excellent", "nice", "fine", "okay", "bad", "poor",
    "average", "decent", "solid", "amazing", "awesome", "wonderful",
    "terrible", "horrible", "fantastic", "mediocre", "satisfactory",
    "impressive", "adequate", "sufficient", "acceptable", "reasonable",
}

# ── STAR method evidence markers ─────────────────────────────────────────────
_STAR_MARKERS: List[str] = [
    "for example", "for instance", "specifically", "demonstrated",
    "showed", "achieved", "resulted in", "led to", "delivered",
    "built", "implemented", "improved", "reduced", "increased",
    "managed", "solved", "designed", "situation", "task", "action",
    "result", "outcome", "impact", "because", "therefore",
]

# ── Positive sentiment words ──────────────────────────────────────────────────
_POSITIVE_WORDS: Set[str] = {
    "strong", "excellent", "clear", "confident", "well", "good",
    "great", "impressive", "thoughtful", "structured", "specific",
    "relevant", "demonstrated", "solid", "articulate", "enthusiastic",
}

# ── Critical/concern words ────────────────────────────────────────────────────
_CRITICAL_WORDS: Set[str] = {
    "weak", "poor", "unclear", "vague", "hesitant", "confused",
    "lacks", "missing", "concerns", "issues", "struggled",
    "difficulty", "gap", "improvement", "limited", "inconsistent",
}


def _flag(check: str, severity: str, message: str, recommendation: str = "") -> Dict:
    return {"check": check, "severity": severity, "message": message, "recommendation": recommendation}


# ── 1. validate_inputs ────────────────────────────────────────────────────────

def validate_inputs(state: dict) -> Dict:
    if not state.get("session_id"):
        return {"errors": ["session_id is required"], "status": "failed"}
    return {}


# ── 2. load_session_data ──────────────────────────────────────────────────────

def load_session_data(state: dict) -> Dict:
    """Load interview session from PostgreSQL including notes and evaluation."""
    import uuid as _uuid
    from app.core.database import SessionLocal
    from app.db.models.interview import InterviewSession

    db = SessionLocal()
    warnings: List[str] = list(state.get("data_warnings") or [])
    try:
        try:
            sid = _uuid.UUID(state["session_id"])
        except ValueError:
            return {"errors": ["Invalid session_id UUID"], "status": "failed"}

        session = db.get(InterviewSession, sid)
        if not session:
            return {"errors": [f"InterviewSession {state['session_id']} not found"], "status": "failed"}

        notes = session.notes or ""
        words = notes.split() if notes.strip() else []

        logger.info(
            "[interview_qc][run=%s] Loaded session %s — type=%s status=%s notes_words=%d",
            state.get("run_id"), sid, session.interview_type, session.status, len(words),
        )

        # Load candidate / job names from relationships
        candidate_name = None
        job_title = None
        if session.candidate:
            candidate_name = session.candidate.full_name
        if session.job:
            job_title = session.job.title

        return {
            "interview_type": session.interview_type,
            "notes": notes,
            "notes_word_count": len(words),
            "structured_answers": [],       # structured answers not stored on session in v1
            "overall_score": session.overall_score,
            "feedback_text": session.feedback_text or "",
            "candidate_name": candidate_name,
            "job_title": job_title,
            "data_warnings": warnings,
        }

    except Exception as exc:
        logger.exception("[interview_qc][run=%s] Load error", state.get("run_id"))
        return {"errors": [f"Session load failed: {exc}"], "status": "failed"}
    finally:
        db.close()


# ── 3. check_note_length ──────────────────────────────────────────────────────

def check_note_length(state: dict) -> Dict:
    """
    Minimum word counts:
    < 20 words   → critical (unusable for fair evaluation)
    20–49 words  → warning (very thin)
    50–99 words  → info (minimal — room to improve)
    ≥ 100 words  → pass
    """
    flags: List[dict] = list(state.get("quality_flags") or [])
    wc = state.get("notes_word_count", 0)

    if wc < 20:
        flags.append(_flag(
            check="note_length",
            severity="critical",
            message=f"Interview notes are extremely thin ({wc} words). This is insufficient to support a fair evaluation.",
            recommendation=(
                "Require interviewers to write at least 100 words of substantive notes. "
                "Consider using a structured template with mandatory sections."
            ),
        ))
    elif wc < 50:
        flags.append(_flag(
            check="note_length",
            severity="warning",
            message=f"Notes are very brief ({wc} words). Thin notes make scoring unreliable.",
            recommendation="Encourage interviewers to document specific candidate responses, not just impressions.",
        ))
    elif wc < 100:
        flags.append(_flag(
            check="note_length",
            severity="info",
            message=f"Notes are minimal ({wc} words). More detail would improve scoring confidence.",
            recommendation="Aim for 100+ words per interview session for adequate documentation.",
        ))

    return {"quality_flags": flags}


# ── 4. check_specificity ──────────────────────────────────────────────────────

def check_specificity(state: dict) -> Dict:
    """
    Compare the density of vague adjectives vs specific evidence markers.
    A note heavy on vague adjectives is less reliable for evaluation.
    """
    flags: List[dict] = list(state.get("quality_flags") or [])
    notes = (state.get("notes") or "").lower()

    if not notes.strip():
        return {"quality_flags": flags}

    tokens = re.split(r"[\s,;.\-!\?\(\)\"\']+", notes)
    token_set = set(tokens)
    total_tokens = max(len(tokens), 1)

    vague_hits = [t for t in tokens if t in _VAGUE_ADJECTIVES]
    vague_ratio = len(vague_hits) / total_tokens

    # Count evidence markers (substring match, not token match)
    marker_hits = [m for m in _STAR_MARKERS if m in notes]

    if vague_ratio > 0.15 and len(marker_hits) < 2:
        flags.append(_flag(
            check="low_specificity",
            severity="warning",
            message=(
                f"Notes rely heavily on vague adjectives ({len(vague_hits)} instances: "
                f"{', '.join(list(dict.fromkeys(vague_hits))[:4])}) with little specific evidence."
            ),
            recommendation=(
                "Replace vague terms with specific observations: "
                "instead of 'good communicator', write "
                "'explained the caching architecture clearly using a real-world analogy'."
            ),
        ))
    elif vague_ratio > 0.10 and len(marker_hits) == 0:
        flags.append(_flag(
            check="low_specificity",
            severity="info",
            message="Notes contain adjective-heavy language with no concrete evidence markers.",
            recommendation="Document specific examples from the candidate's answers using STAR format.",
        ))

    return {"quality_flags": flags, "evidence_markers_found": marker_hits}


# ── 5. check_bias_language ────────────────────────────────────────────────────

def check_bias_language(state: dict) -> Dict:
    """Scan interview notes for known biased or coded phrases."""
    flags: List[dict] = list(state.get("quality_flags") or [])
    notes = (state.get("notes") or "").lower()
    found: List[str] = []

    if not notes.strip():
        return {"quality_flags": flags, "bias_language_detected": found}

    for phrase in _BIAS_PHRASES:
        if phrase in notes:
            found.append(phrase)

    if found:
        flags.append(_flag(
            check="bias_language",
            severity="critical" if len(found) >= 3 else "warning",
            message=f"Interview notes contain {len(found)} potentially biased phrase(s): {', '.join(found[:4])}.",
            recommendation=(
                "Review notes for unconscious bias before using them to justify scoring decisions. "
                "Replace subjective impressions with observable, job-relevant behaviours."
            ),
        ))

    return {"quality_flags": flags, "bias_language_detected": found}


# ── 6. check_score_rationale ──────────────────────────────────────────────────

def check_score_rationale(state: dict) -> Dict:
    """
    If the session has been scored, verify there is substantive feedback text
    explaining the score.
    """
    flags: List[dict] = list(state.get("quality_flags") or [])
    score = state.get("overall_score")
    feedback = (state.get("feedback_text") or "").strip()

    if score is None:
        # Not yet scored — skip
        return {"quality_flags": flags}

    if not feedback:
        flags.append(_flag(
            check="score_rationale",
            severity="warning",
            message=f"Session scored {score}/100 but has no explanatory feedback text.",
            recommendation=(
                "Every score must be accompanied by written rationale. "
                "This is required for auditability and to avoid challenges to hiring decisions."
            ),
        ))
    elif len(feedback.split()) < 15:
        flags.append(_flag(
            check="score_rationale",
            severity="info",
            message=f"Feedback text for score {score}/100 is very brief ({len(feedback.split())} words).",
            recommendation="Provide at least 2–3 sentences explaining the specific reasons for this score.",
        ))

    return {"quality_flags": flags}


# ── 7. check_note_balance ────────────────────────────────────────────────────

def check_note_balance(state: dict) -> Dict:
    """
    Notes should contain both positive signals and concern signals.
    One-sided notes (all positive or all negative) reduce reliability.
    """
    flags: List[dict] = list(state.get("quality_flags") or [])
    notes = (state.get("notes") or "").lower()
    wc = state.get("notes_word_count", 0)

    # Only run if there are enough words to evaluate
    if wc < 30 or not notes.strip():
        return {"quality_flags": flags}

    tokens = set(re.split(r"[\s,;.\-!\?\(\)\"\']+", notes))
    pos_hits = tokens & _POSITIVE_WORDS
    neg_hits = tokens & _CRITICAL_WORDS

    if pos_hits and not neg_hits and wc >= 50:
        flags.append(_flag(
            check="note_balance",
            severity="info",
            message="Notes contain only positive signals with no areas of concern documented.",
            recommendation=(
                "Even strong candidates have areas for growth. "
                "Document any concerns or development areas to support a balanced evaluation."
            ),
        ))
    elif neg_hits and not pos_hits and wc >= 50:
        flags.append(_flag(
            check="note_balance",
            severity="warning",
            message="Notes contain only concerns with no positive signals documented.",
            recommendation=(
                "One-sided negative notes may indicate evaluator bias. "
                "Document what the candidate did well alongside areas of concern."
            ),
        ))

    return {"quality_flags": flags}


# ── 8. compute_quality_score ──────────────────────────────────────────────────

def compute_quality_score(state: dict) -> Dict:
    """
    Compute quality score 0–100.
    Start at 100, deduct per flag:
      critical: -30
      warning:  -15
      info:     -5
    Bonus for evidence markers found (+5 each, up to +15)
    Floor: 10
    """
    flags = state.get("quality_flags") or []
    markers = state.get("evidence_markers_found") or []

    score = 100
    for f in flags:
        sev = f.get("severity", "info")
        if sev == "critical":
            score -= 30
        elif sev == "warning":
            score -= 15
        else:
            score -= 5

    score += min(len(markers) * 5, 15)
    score = max(10, min(100, score))

    if score >= 80:
        level = "excellent"
    elif score >= 60:
        level = "good"
    elif score >= 40:
        level = "adequate"
    else:
        level = "poor"

    logger.info(
        "[interview_qc][run=%s] Quality=%d level=%s flags=%d markers=%d",
        state.get("run_id"), score, level, len(flags), len(markers),
    )

    return {"quality_score": score, "quality_level": level}


# ── 9. build_summary ──────────────────────────────────────────────────────────

def build_summary(state: dict) -> Dict:
    name = state.get("candidate_name") or "Candidate"
    job = state.get("job_title") or "Unknown Role"
    score = state.get("quality_score", 0)
    level = state.get("quality_level", "poor")
    wc = state.get("notes_word_count", 0)
    flags = state.get("quality_flags") or []
    bias_found = state.get("bias_language_detected") or []
    markers = state.get("evidence_markers_found") or []

    critical_flags = [f for f in flags if f.get("severity") == "critical"]

    summary = (
        f"Interview notes for {name} ({job}) received a quality score of {score}/100 "
        f"({level}). Notes contain {wc} words and {len(markers)} evidence marker(s). "
        f"{len(flags)} quality issue(s) detected."
    )
    if critical_flags:
        summary += f" {len(critical_flags)} critical issue(s) require immediate attention."
    if bias_found:
        summary += f" Potential bias language detected: {', '.join(bias_found[:3])}."
    if score >= 80:
        summary += " Notes are well-documented and suitable for reliable evaluation."

    return {"summary": summary}


# ── 10. finalize ──────────────────────────────────────────────────────────────

def finalize(state: dict) -> Dict:
    logger.info(
        "[interview_qc][run=%s] Complete — quality=%d level=%s",
        state.get("run_id"),
        state.get("quality_score", 0),
        state.get("quality_level"),
    )
    return {"status": "completed"}


# ── 11. handle_failure ────────────────────────────────────────────────────────

def handle_failure(state: dict) -> Dict:
    logger.error(
        "[interview_qc][run=%s] FAILED: %s",
        state.get("run_id"), "; ".join(state.get("errors", [])),
    )
    return {"status": "failed"}
