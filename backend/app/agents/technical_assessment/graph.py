"""
PATHS Backend — Technical Assessment Agent Graph (LangGraph).

Scoring pipeline (run after answers are submitted):
  validate_inputs → load_context → score_answers → compute_result
      → build_summary → persist_results → finalize

Question generation is a utility function (generate_questions_for_job)
called directly by the assessments API — not part of the scoring graph.
"""

import uuid
import logging

from langgraph.graph import StateGraph, END

from app.agents.technical_assessment.state import TechnicalAssessmentState
from app.agents.technical_assessment.nodes import (
    validate_inputs,
    load_context,
    score_answers,
    compute_result,
    build_summary,
    persist_results,
    finalize,
    handle_failure,
)

logger = logging.getLogger(__name__)


def _failed(state: TechnicalAssessmentState) -> str:
    return "failed" if state.get("status") == "failed" else "ok"


def build_assessment_graph() -> StateGraph:
    graph = StateGraph(TechnicalAssessmentState)

    graph.add_node("validate_inputs", validate_inputs)
    graph.add_node("load_context", load_context)
    graph.add_node("score_answers", score_answers)
    graph.add_node("compute_result", compute_result)
    graph.add_node("build_summary", build_summary)
    graph.add_node("persist_results", persist_results)
    graph.add_node("finalize", finalize)
    graph.add_node("handle_failure", handle_failure)

    graph.set_entry_point("validate_inputs")

    graph.add_conditional_edges("validate_inputs", _failed, {"failed": "handle_failure", "ok": "load_context"})
    graph.add_conditional_edges("load_context", _failed, {"failed": "handle_failure", "ok": "score_answers"})
    graph.add_edge("score_answers", "compute_result")
    graph.add_edge("compute_result", "build_summary")
    graph.add_conditional_edges("build_summary", _failed, {"failed": "handle_failure", "ok": "persist_results"})
    graph.add_conditional_edges("persist_results", _failed, {"failed": "handle_failure", "ok": "finalize"})
    graph.add_edge("finalize", END)
    graph.add_edge("handle_failure", END)

    return graph.compile()


def run_assessment_scoring(
    session_id: str,
    answers: list,
) -> TechnicalAssessmentState:
    """
    Score a submitted technical assessment.

    answers: list of {question_id, answer_text}

    Returns final state with:
      state["overall_score"]       0–100
      state["result"]              "pass" | "borderline" | "fail"
      state["question_details"]    per-question breakdown
      state["strengths"], state["gaps"]
      state["summary"]
    """
    run_id = str(uuid.uuid4())[:8]
    initial: TechnicalAssessmentState = {
        "run_id": run_id,
        "session_id": session_id,
        "answers": answers,
        "status": "running",
        "errors": [],
        "data_warnings": [],
    }

    app = build_assessment_graph()
    logger.info("[tech_assessment][run=%s] Starting scoring for session %s", run_id, session_id)
    return app.invoke(initial)
