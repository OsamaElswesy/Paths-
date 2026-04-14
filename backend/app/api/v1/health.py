"""
PATHS Backend — Health-check endpoints.
"""

import asyncio
import httpx
from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.health import FullHealthResponse, HealthResponse, ServiceHealth
from app.services.age_service import AGEService
from app.services.postgres_service import PostgresService
from app.services.qdrant_service import QdrantService

router = APIRouter(prefix="/health", tags=["Health"])
settings = get_settings()

# Services that are REQUIRED for the system to be considered healthy.
# Ollama is excluded — it is an optional AI profile service.
_REQUIRED_SERVICES = {"postgres", "age", "qdrant"}


@router.get("", response_model=HealthResponse)
def health():
    """Basic liveness probe."""
    return HealthResponse(
        status="ok",
        app_name=settings.app_name,
        environment=settings.app_env,
    )


@router.get("/postgres", response_model=ServiceHealth)
def health_postgres():
    """PostgreSQL connectivity check."""
    result = PostgresService.test_connection()
    return ServiceHealth(service="postgres", status=result["status"], details=result)


@router.get("/age", response_model=ServiceHealth)
def health_age():
    """Apache AGE connectivity check."""
    result = AGEService.test_connection()
    return ServiceHealth(service="age", status=result["status"], details=result)


@router.get("/qdrant", response_model=ServiceHealth)
def health_qdrant():
    """Qdrant connectivity check."""
    svc = QdrantService()
    result = svc.test_connection()
    return ServiceHealth(service="qdrant", status=result["status"], details=result)


@router.get("/all", response_model=FullHealthResponse)
async def health_all():
    """Aggregated health check for every backend service.

    Ollama is reported but does NOT affect the overall status — it is an
    optional AI profile service that is not started during regular development.
    Overall status is 'healthy' when all required services (postgres, age, qdrant)
    are reachable. It becomes 'degraded' only if a required service is down.
    """
    # Run all required service checks concurrently in threads
    pg, age = await asyncio.gather(
        asyncio.to_thread(PostgresService.test_connection),
        asyncio.to_thread(AGEService.test_connection),
    )
    qdrant_svc = QdrantService()
    qd = await asyncio.to_thread(qdrant_svc.test_connection)

    # Ollama check — non-blocking, optional, does not affect overall status
    base_url = settings.ollama_base_url
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{base_url}/api/tags")
        ol = {"status": "healthy" if r.status_code == 200 else "unhealthy"}
    except Exception:
        ol = {"status": "unreachable"}

    services = [
        ServiceHealth(service="postgres", status=pg["status"], details=pg),
        ServiceHealth(service="age", status=age["status"], details=age),
        ServiceHealth(service="qdrant", status=qd["status"], details=qd),
        # Ollama is listed for visibility but is optional — marked with a note
        ServiceHealth(
            service="ollama",
            status=ol["status"],
            details={**ol, "optional": True, "note": "Start with: docker-compose --profile ai up"},
        ),
    ]

    # Overall health only considers required services
    required_statuses = [s.status for s in services if s.service in _REQUIRED_SERVICES]
    overall = "healthy" if all(s == "healthy" for s in required_statuses) else "degraded"
    return FullHealthResponse(status=overall, services=services)
