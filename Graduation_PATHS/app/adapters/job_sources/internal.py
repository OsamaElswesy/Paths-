"""
PATHS Backend — Internal Source Connector.

Reports on candidates and jobs already in PATHS.  This connector does NOT
import external data — it is a read-only status reporter used by the
GET /sourcing/connectors endpoint.

"Importing" from the internal database makes no sense: the data is already
there.  The connector simply surfaces counts so the UI can show a live
summary of the internal pool alongside external connectors.
"""

import logging

logger = logging.getLogger(__name__)


class InternalSourceConnector:
    name = "internal"
    source_type = "internal"
    display_name = "PATHS Internal Database"
    description = "Candidates and jobs already ingested into PATHS"

    async def discover(self, query: dict | None = None) -> list[str]:
        return ["internal://paths/stats"]

    async def fetch(self, target: str) -> dict:
        """Return current active candidate and job counts from Postgres."""
        try:
            from app.core.database import SessionLocal
            from sqlalchemy import select, func
            from app.db.models.candidate import Candidate
            from app.db.models.job import Job

            db = SessionLocal()
            try:
                candidate_count = (
                    db.scalar(
                        select(func.count(Candidate.id)).where(Candidate.status == "active")
                    )
                    or 0
                )
                job_count = (
                    db.scalar(
                        select(func.count(Job.id)).where(Job.is_active == True)  # noqa: E712
                    )
                    or 0
                )
                return {
                    "source_url": target,
                    "candidate_count": candidate_count,
                    "job_count": job_count,
                    "status_code": 200,
                    "target_id": target,
                }
            finally:
                db.close()
        except Exception as exc:
            logger.error("Internal connector fetch error: %s", exc)
            return {
                "source_url": target,
                "candidate_count": 0,
                "job_count": 0,
                "status_code": 500,
                "target_id": target,
                "error": str(exc),
            }

    async def parse(self, raw: dict) -> list[dict]:
        """No importable records — data is already in PATHS."""
        return []
