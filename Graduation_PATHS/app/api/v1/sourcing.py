"""
PATHS Backend — Sourcing API Endpoints.

POST /sourcing/search                      → run the Sourcing Agent (semantic CV search via Qdrant)
GET  /sourcing/candidates                  → list all ingested candidates for the sourcing page initial load
GET  /sourcing/connectors                  → list all sourcing connectors with status
POST /sourcing/connectors/{id}/pull        → trigger an import pull from a specific connector
"""

import uuid
import logging
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.models.candidate import Candidate
from app.db.models.cv_entities import CandidateSkill, Skill

router = APIRouter(prefix="/sourcing", tags=["Sourcing"])
logger = logging.getLogger(__name__)


# ── Schemas ───────────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    job_id: str | None = None
    limit: int = Field(default=10, ge=1, le=50)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/search")
def sourcing_search(body: SearchRequest) -> Any:
    """
    Run semantic search over ingested CV vectors.

    Embeds the query with nomic-embed-text, searches Qdrant candidate_cv_chunks,
    aggregates by candidate (max score), then enriches with Postgres metadata.

    Returns ranked candidates with relevance scores and matching CV excerpts
    for recruiter explainability.

    NOTE: Requires Ollama (AI profile). If Ollama is not running, returns 503.
    Start with: docker-compose --profile ai up -d ollama
    """
    from app.agents.sourcing.graph import sourcing_app
    from app.services.embedding_service import OllamaUnavailableError

    initial_state = {
        "run_id": str(uuid.uuid4()),
        "query": body.query.strip(),
        "job_id": body.job_id,
        "limit": body.limit,
        "query_embedding": None,
        "raw_hits": None,
        "aggregated_candidates": None,
        "results": None,
        "errors": [],
        "status": "running",
        "data_warnings": [],
    }

    logger.info("[sourcing] Starting search: %r", body.query[:80])
    try:
        final_state = sourcing_app.invoke(initial_state)
    except OllamaUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "AI search requires Ollama which is not running. "
                "Start the AI profile: docker-compose --profile ai up -d ollama — "
                f"then pull the model: docker exec paths_ollama ollama pull {settings.ollama_embed_model}. "
                f"Detail: {exc}"
            ),
        )

    results = final_state.get("results") or []
    warnings = final_state.get("data_warnings") or []
    errors = final_state.get("errors") or []

    # Always return 200 with empty results rather than 500 so the UI degrades gracefully
    return {
        "query": body.query,
        "results": results,
        "total_matched": len(results),
        "data_warnings": warnings,
        "errors": errors,
        "status": final_state.get("status", "unknown"),
    }


@router.get("/candidates")
def list_sourcing_candidates(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> Any:
    """
    Return all active candidates for the sourcing page initial load.

    This is a simple Postgres list — no vector search. It shows recruiters
    all candidates currently in the system before they run a targeted search.
    """
    total: int = (
        db.scalar(select(func.count(Candidate.id)).where(Candidate.status == "active")) or 0
    )

    candidates = db.execute(
        select(Candidate)
        .where(Candidate.status == "active")
        .order_by(Candidate.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).scalars().all()

    if not candidates:
        return {"items": [], "total": 0, "limit": limit, "offset": offset}

    # Batch-load skills for all returned candidates
    candidate_ids = [c.id for c in candidates]
    skill_rows = db.execute(
        select(CandidateSkill, Skill)
        .join(Skill, CandidateSkill.skill_id == Skill.id)
        .where(CandidateSkill.candidate_id.in_(candidate_ids))
    ).all()

    from collections import defaultdict
    skills_map: dict = defaultdict(list)
    for row in skill_rows:
        skills_map[str(row.CandidateSkill.candidate_id)].append(row.Skill.normalized_name)

    items = [
        {
            "id": str(c.id),
            "full_name": c.full_name,
            "current_title": c.current_title,
            "location_text": c.location_text,
            "years_experience": c.years_experience,
            "email": c.email,
            "skills": skills_map.get(str(c.id), []),
            "created_at": c.created_at.isoformat(),
        }
        for c in candidates
    ]

    return {"items": items, "total": total, "limit": limit, "offset": offset}


# ── Connector framework ───────────────────────────────────────────────────────

class ConnectorPullRequest(BaseModel):
    board_tokens: list[str] | None = None   # greenhouse: override configured tokens
    channels: list[str] | None = None       # telegram: override configured channels
    max_items: int = Field(default=20, ge=1, le=100)


@router.get("/connectors")
def list_sourcing_connectors(db: Session = Depends(get_db)) -> Any:
    """
    Return status of all sourcing connectors.

    Each entry describes whether the connector is configured and shows its
    most recent pull run plus current job/candidate counts.  The 'internal'
    connector is always active and shows counts of data already in PATHS.
    """
    from app.core.config import get_settings
    from app.db.models.job import Job
    from app.db.models.job_ingestion import JobSourceRun

    settings = get_settings()

    def _last_run(source_type: str):
        return db.execute(
            select(JobSourceRun)
            .where(JobSourceRun.source_type == source_type)
            .order_by(JobSourceRun.started_at.desc())
            .limit(1)
        ).scalar_one_or_none()

    def _job_count(source_type: str) -> int:
        return (
            db.scalar(
                select(func.count(Job.id)).where(
                    Job.source_type == source_type, Job.is_active == True  # noqa: E712
                )
            )
            or 0
        )

    def _run_summary(run) -> dict | None:
        if not run:
            return None
        return {
            "run_id": str(run.id),
            "status": run.status,
            "started_at": run.started_at.isoformat(),
            "inserted": run.inserted_count,
            "duplicates": run.duplicate_count,
        }

    # Internal counts
    candidate_count = (
        db.scalar(select(func.count(Candidate.id)).where(Candidate.status == "active")) or 0
    )
    internal_job_count = (
        db.scalar(select(func.count(Job.id)).where(Job.is_active == True)) or 0  # noqa: E712
    )

    # Greenhouse config
    gh_tokens = [t.strip() for t in (settings.greenhouse_board_tokens or "").split(",") if t.strip()]
    gh_run = _last_run("greenhouse")

    # Telegram config
    tg_channels = [
        c.strip().lstrip("@").lstrip("/")
        for c in (settings.telegram_job_channels or "").split(",")
        if c.strip()
    ]
    tg_run = _last_run("telegram_channel")

    return [
        {
            "id": "internal",
            "display_name": "PATHS Internal Database",
            "source_type": "internal",
            "is_configured": True,
            "status": "active",
            "description": "Candidates and jobs already ingested into PATHS",
            "candidate_count": candidate_count,
            "job_count": internal_job_count,
            "last_pull": None,
        },
        {
            "id": "greenhouse",
            "display_name": "Greenhouse",
            "source_type": "greenhouse",
            "is_configured": bool(gh_tokens),
            "status": "configured" if gh_tokens else "not_configured",
            "description": "Import job listings from Greenhouse-hosted company boards",
            "job_count": _job_count("greenhouse"),
            "board_tokens": gh_tokens,
            "last_pull": _run_summary(gh_run),
        },
        {
            "id": "telegram_channel",
            "display_name": "Telegram Job Channels",
            "source_type": "telegram_channel",
            "is_configured": bool(tg_channels),
            "status": "configured" if tg_channels else "not_configured",
            "description": "Parse job postings from public Telegram channels",
            "job_count": _job_count("telegram_channel"),
            "channels": tg_channels,
            "last_pull": _run_summary(tg_run),
        },
    ]


@router.post("/connectors/{connector_id}/pull")
async def trigger_connector_pull(
    connector_id: str,
    body: ConnectorPullRequest,
    background_tasks: BackgroundTasks,
) -> Any:
    """
    Trigger an import pull from a specific connector.

    Accepted connector IDs: greenhouse, telegram_channel
    The internal connector does not support pulls — data is already in PATHS.

    Returns immediately with a run_id.  Poll GET /sourcing/connectors or
    GET /internal/job-ingestion/runs/{run_id} for progress.
    """
    if connector_id == "internal":
        raise HTTPException(
            status_code=400,
            detail="The internal connector does not support pulls — data is already in PATHS.",
        )
    if connector_id not in ("greenhouse", "telegram_channel"):
        raise HTTPException(status_code=404, detail=f"Unknown connector: {connector_id!r}")

    from app.core.config import get_settings
    from app.services.job_ingestion_service import JobIngestionService

    settings = get_settings()

    if connector_id == "greenhouse":
        tokens = body.board_tokens
        if not tokens:
            tokens = [
                t.strip()
                for t in (settings.greenhouse_board_tokens or "").split(",")
                if t.strip()
            ]
        if not tokens:
            raise HTTPException(
                status_code=422,
                detail=(
                    "No Greenhouse board tokens configured.  "
                    "Set GREENHOUSE_BOARD_TOKENS in .env or pass board_tokens in the request body."
                ),
            )
        target_urls = [
            f"https://boards-api.greenhouse.io/v1/boards/{t}/jobs?content=true"
            for t in tokens
        ]

    else:  # telegram_channel
        channels = body.channels
        if not channels:
            channels = [
                c.strip().lstrip("@").lstrip("/")
                for c in (settings.telegram_job_channels or "").split(",")
                if c.strip()
            ]
        if not channels:
            raise HTTPException(
                status_code=422,
                detail=(
                    "No Telegram channels configured.  "
                    "Set TELEGRAM_JOB_CHANNELS in .env or pass channels in the request body."
                ),
            )
        target_urls = [f"https://t.me/s/{c}" for c in channels]

    service = JobIngestionService(db=None)
    run_id = await service.start_ingestion_run(
        source_type=connector_id,
        source_name=connector_id,
        target_urls=target_urls,
        max_pages=body.max_items,
        created_by="sourcing_connector",
    )

    background_tasks.add_task(
        service.execute_run,
        run_id=run_id,
        source_type=connector_id,
        source_name=connector_id,
        target_urls=target_urls,
        max_pages=body.max_items,
    )

    logger.info(
        "[sourcing][connector=%s] Pull started, run_id=%s, targets=%d",
        connector_id, run_id, len(target_urls),
    )
    return {
        "run_id": str(run_id),
        "connector_id": connector_id,
        "status": "accepted",
        "target_count": len(target_urls),
        "message": (
            f"Pull started. Use GET /api/v1/sourcing/connectors to check progress "
            f"or GET /api/v1/internal/job-ingestion/runs/{run_id} for full run detail."
        ),
    }
