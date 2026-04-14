"""
PATHS Backend — FastAPI application entry point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import setup_logging

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    setup_logging()
    from app.core.logging import get_logger
    logger = get_logger(__name__)
    logger.info("Starting %s (%s)", settings.app_name, settings.app_env)
    yield
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="PATHS — Hiring workflow backend with PostgreSQL, Apache AGE, and Qdrant",
    lifespan=lifespan,
)

# ── CORS — allow external requests (Vercel, Ngrok, Localhost) ───────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for the Vercel/Ngrok setup
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Import routers ─────────────────────────────────────────────────────
from app.api.v1.health import router as health_router  # noqa: E402
from app.api.v1.system import router as system_router  # noqa: E402
from app.api.v1.cv_ingestion import router as cv_ingestion_router  # noqa: E402
from app.api.v1.candidates import router as candidates_router  # noqa: E402
from app.api.v1.auth import router as auth_router  # noqa: E402
from app.api.v1.organizations import router as organizations_router  # noqa: E402
from app.api.v1.job_ingestion import router as job_ingestion_router  # noqa: E402
from app.api.v1.decisions import router as decisions_router  # noqa: E402
from app.api.v1.jobs import router as jobs_router  # noqa: E402
from app.api.v1.outreach import router as outreach_router  # noqa: E402
from app.api.v1.interviews import router as interviews_router  # noqa: E402
from app.api.v1.sourcing import router as sourcing_router  # noqa: E402
from app.api.v1.enrichment import router as enrichment_router  # noqa: E402
from app.api.v1.assessments import router as assessments_router  # noqa: E402
from app.api.v1.evidence_validation import router as evidence_validation_router  # noqa: E402
from app.api.v1.bias_audit import router as bias_audit_router  # noqa: E402
from app.api.v1.interview_qc import router as interview_qc_router  # noqa: E402

# ── Register routers ───────────────────────────────────────────────────
app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(organizations_router, prefix="/api/v1")
app.include_router(cv_ingestion_router, prefix="/api/v1")
app.include_router(candidates_router, prefix="/api/v1")
app.include_router(system_router, prefix="/api/v1")
app.include_router(job_ingestion_router, prefix="/api/v1")
app.include_router(decisions_router, prefix="/api/v1")
app.include_router(jobs_router, prefix="/api/v1")
app.include_router(outreach_router, prefix="/api/v1")
app.include_router(interviews_router, prefix="/api/v1")
app.include_router(sourcing_router, prefix="/api/v1")
app.include_router(enrichment_router, prefix="/api/v1")
app.include_router(assessments_router, prefix="/api/v1")
app.include_router(evidence_validation_router, prefix="/api/v1")
app.include_router(bias_audit_router, prefix="/api/v1")
app.include_router(interview_qc_router, prefix="/api/v1")


# ── Root-level health endpoint (spec requirement) ──────────────────────
@app.get("/health", tags=["Health"])
async def root_health():
    """Root-level aggregated health check returning per-service connectivity.

    All blocking IO (Postgres, Qdrant, Ollama) is run off the event loop so
    a slow or unreachable service cannot stall other concurrent API requests.
    """
    import asyncio
    import httpx
    from app.services.postgres_service import PostgresService
    from app.services.age_service import AGEService
    from app.services.qdrant_service import QdrantService

    # Run synchronous DB/vector checks in worker threads so event loop is free
    pg, age = await asyncio.gather(
        asyncio.to_thread(PostgresService.test_connection),
        asyncio.to_thread(AGEService.test_connection),
    )

    qdrant_svc = QdrantService()
    qd = await asyncio.to_thread(qdrant_svc.test_connection)

    # Use async HTTP client for Ollama — avoids blocking thread pool entirely
    base_url = settings.ollama_base_url
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{base_url}/api/tags")
        ol = {"status": "healthy" if r.status_code == 200 else "unhealthy"}
    except Exception:
        ol = {"status": "unreachable"}

    return {
        "postgres": pg,
        "age": age,
        "qdrant": qd,
        "ollama": ol,
    }


@app.get("/", tags=["Root"])
def root():
    """Root endpoint."""
    return {
        "app": settings.app_name,
        "version": "0.1.0",
        "docs": "/docs",
    }
