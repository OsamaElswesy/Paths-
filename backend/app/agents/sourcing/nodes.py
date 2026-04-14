"""
PATHS Backend — Sourcing Agent Nodes (LangGraph).

Each function is a node in the sourcing graph. All nodes receive SourcingState
and return a partial state update dict — matching the CV Ingestion node pattern.

No LLM is used in v1: the pipeline is embed-query → vector-search → aggregate → pg-lookup.
Ollama only needs the embedding model (nomic-embed-text), not the LLM.
"""

import logging
import uuid
from collections import defaultdict
from typing import Dict, List

from app.agents.sourcing.state import SourcingState

logger = logging.getLogger(__name__)


# ── 1. validate_query ────────────────────────────────────────────────────────

def validate_query(state: SourcingState) -> Dict:
    """Reject empty or trivially short queries early."""
    query = (state.get("query") or "").strip()
    if not query:
        return {"errors": ["Search query cannot be empty."], "status": "failed"}
    if len(query) < 3:
        return {"errors": ["Query too short — provide at least 3 characters."], "status": "failed"}
    logger.info("[sourcing][run=%s] Query validated: %r (limit=%d)", state["run_id"], query[:80], state["limit"])
    return {}


# ── 2. embed_query ───────────────────────────────────────────────────────────

def embed_query(state: SourcingState) -> Dict:
    """Embed the query using the same nomic-embed-text model used for CV chunks."""
    try:
        from app.services.embedding_service import embed_query as do_embed
        vector = do_embed(state["query"])
        logger.info("[sourcing][run=%s] Query embedded, dim=%d", state["run_id"], len(vector))
        return {"query_embedding": vector}
    except Exception as exc:
        logger.exception("[sourcing][run=%s] Embedding failed", state["run_id"])
        return {
            "errors": [f"Embedding service unavailable: {exc}"],
            "status": "failed",
        }


# ── 3. search_qdrant ─────────────────────────────────────────────────────────

def search_qdrant(state: SourcingState) -> Dict:
    """
    Run an unfiltered similarity search over the entire candidate_cv_chunks collection.

    We intentionally fetch limit×10 raw hits because a single candidate's CV
    produces many chunks; aggregation in the next node reduces them to one entry
    per candidate.
    """
    try:
        from app.services.qdrant_service import QdrantService
        from app.core.config import get_settings
        settings = get_settings()

        svc = QdrantService()
        # Fetch a generous pool so aggregation has enough depth
        search_limit = max(state["limit"] * 10, 50)

        hits = svc.search_vectors(
            collection_name=settings.qdrant_collection_cv,
            query_vector=state["query_embedding"],
            limit=search_limit,
            filters=None,   # None = search ALL candidates in the collection
        )

        warnings = list(state.get("data_warnings") or [])
        if not hits:
            warnings.append(
                "No CV vectors found in Qdrant — ensure at least one CV has been ingested "
                "via the CV Ingestion pipeline before running a sourcing search."
            )
            logger.warning("[sourcing][run=%s] Qdrant returned 0 hits", state["run_id"])
        else:
            logger.info("[sourcing][run=%s] Qdrant returned %d raw hits", state["run_id"], len(hits))

        return {"raw_hits": hits, "data_warnings": warnings}

    except Exception as exc:
        logger.exception("[sourcing][run=%s] Qdrant search error", state["run_id"])
        return {
            "errors": [f"Vector search failed: {exc}"],
            "status": "failed",
        }


# ── 4. aggregate_by_candidate ────────────────────────────────────────────────

def aggregate_by_candidate(state: SourcingState) -> Dict:
    """
    Collapse many chunk-level hits into one entry per candidate.

    Strategy:
      - Group hits by candidate_id (from payload)
      - Take the maximum similarity score across all chunks as the candidate score
      - Keep the top-2 best-matching text excerpts for UI explainability
      - Sort descending by score and apply the requested limit
    """
    hits: List[Dict] = state.get("raw_hits") or []
    if not hits:
        return {"aggregated_candidates": []}

    groups: dict = defaultdict(list)
    for hit in hits:
        cid = hit.get("payload", {}).get("candidate_id")
        if cid:
            groups[cid].append(hit)

    aggregated = []
    for cid, group in groups.items():
        sorted_group = sorted(group, key=lambda h: h["score"], reverse=True)
        best_score = sorted_group[0]["score"]
        excerpts = [
            h["payload"].get("text", "")[:300]
            for h in sorted_group[:2]
            if h["payload"].get("text", "").strip()
        ]
        aggregated.append({
            "candidate_id": cid,
            "relevance_score": round(best_score, 4),
            "matched_excerpts": excerpts,
        })

    aggregated.sort(key=lambda x: x["relevance_score"], reverse=True)
    aggregated = aggregated[: state["limit"]]

    logger.info(
        "[sourcing][run=%s] Aggregated %d unique candidates from %d hits",
        state["run_id"], len(aggregated), len(hits),
    )
    return {"aggregated_candidates": aggregated}


# ── 5. load_candidate_metadata ───────────────────────────────────────────────

def load_candidate_metadata(state: SourcingState) -> Dict:
    """
    Batch-load Candidate rows and their top skills from PostgreSQL.

    Uses a single IN-query for candidates and a single join query for skills —
    no N+1 loop. Only candidates that still exist in Postgres are included in
    the final results (Qdrant may hold stale vectors for deleted candidates).
    """
    aggregated = state.get("aggregated_candidates") or []
    if not aggregated:
        return {"results": [], "status": "completed"}

    from app.core.database import SessionLocal
    from sqlalchemy import select
    from app.db.models.candidate import Candidate
    from app.db.models.cv_entities import CandidateSkill, Skill

    db = SessionLocal()
    try:
        candidate_uuids = []
        for entry in aggregated:
            try:
                candidate_uuids.append(uuid.UUID(entry["candidate_id"]))
            except ValueError:
                pass

        # ── Batch candidate load ──────────────────────────────────────────────
        rows = db.execute(
            select(Candidate).where(Candidate.id.in_(candidate_uuids))
        ).scalars().all()
        candidates_map = {str(c.id): c for c in rows}

        # ── Batch skill load ─────────────────────────────────────────────────
        skill_rows = db.execute(
            select(CandidateSkill, Skill)
            .join(Skill, CandidateSkill.skill_id == Skill.id)
            .where(CandidateSkill.candidate_id.in_(candidate_uuids))
        ).all()

        skills_map: dict = defaultdict(list)
        for row in skill_rows:
            cid_str = str(row.CandidateSkill.candidate_id)
            skills_map[cid_str].append(row.Skill.normalized_name)

        # ── Merge ─────────────────────────────────────────────────────────────
        results = []
        for entry in aggregated:
            cid = entry["candidate_id"]
            candidate = candidates_map.get(cid)
            if not candidate:
                # Vector exists in Qdrant but candidate deleted from Postgres — skip silently
                continue

            results.append({
                "candidate_id": cid,
                "candidate_name": candidate.full_name,
                "current_title": candidate.current_title,
                "location": candidate.location_text,
                "years_experience": candidate.years_experience,
                "email": candidate.email,
                "skills": skills_map.get(cid, []),
                "relevance_score": entry["relevance_score"],
                "matched_excerpts": entry["matched_excerpts"],
            })

        logger.info(
            "[sourcing][run=%s] Loaded metadata for %d/%d candidates",
            state["run_id"], len(results), len(aggregated),
        )
        return {"results": results}

    except Exception as exc:
        logger.exception("[sourcing][run=%s] Metadata load error", state["run_id"])
        return {"errors": [f"Candidate metadata load failed: {exc}"], "status": "failed"}
    finally:
        db.close()


# ── 6. finalize ──────────────────────────────────────────────────────────────

def finalize(state: SourcingState) -> Dict:
    logger.info(
        "[sourcing][run=%s] Pipeline complete — %d results returned",
        state["run_id"], len(state.get("results") or []),
    )
    return {"status": "completed"}


# ── 7. handle_failure ────────────────────────────────────────────────────────

def handle_failure(state: SourcingState) -> Dict:
    errors = state.get("errors", [])
    logger.error(
        "[sourcing][run=%s] Pipeline FAILED: %s",
        state["run_id"], "; ".join(errors),
    )
    return {"status": "failed"}
