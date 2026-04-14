"""
PATHS Backend — Greenhouse Job Board API Connector.

Uses the public Greenhouse Job Board API — no authentication required for public boards.
API: https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true

Board token = the company's Greenhouse board handle (their public slug, e.g. "airbnb").
Set GREENHOUSE_BOARD_TOKENS in .env as a comma-separated list, or pass them per request.
"""

import re
import logging
from typing import Any

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_BOARD_API_URL = "https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true"
_TOKEN_RE = re.compile(r"/boards/([^/?]+)/jobs")


class GreenhouseConnector:
    name = "greenhouse"
    source_type = "greenhouse"

    def __init__(self, board_tokens: list[str] | None = None):
        if board_tokens:
            self._tokens = board_tokens
        else:
            try:
                from app.core.config import get_settings
                raw = get_settings().greenhouse_board_tokens or ""
                self._tokens = [t.strip() for t in raw.split(",") if t.strip()]
            except Exception:
                self._tokens = []

    # ── Protocol methods ──────────────────────────────────────────────────────

    async def discover(self, query: dict | None = None) -> list[str]:
        """Return one Board API URL per configured board token."""
        tokens = (query or {}).get("board_tokens") or self._tokens
        return [_BOARD_API_URL.format(token=t) for t in tokens]

    async def fetch(self, target: str) -> dict:
        """Fetch all jobs from a single Greenhouse board API URL."""
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(target, follow_redirects=True)
                resp.raise_for_status()
                return {
                    "source_url": target,
                    "jobs": resp.json().get("jobs", []),
                    "status_code": resp.status_code,
                    "target_id": target,
                }
        except httpx.HTTPStatusError as exc:
            logger.error("Greenhouse board %s returned HTTP %d", target, exc.response.status_code)
            return {
                "source_url": target, "jobs": [], "status_code": exc.response.status_code,
                "target_id": target,
                "error": f"HTTP {exc.response.status_code} — check that the board token is correct and the board is public",
            }
        except Exception as exc:
            logger.error("Greenhouse fetch failed for %s: %s", target, exc)
            return {"source_url": target, "jobs": [], "status_code": 500, "target_id": target, "error": str(exc)}

    async def parse(self, raw: dict) -> list[dict]:
        """Parse Greenhouse board API response into normalized job dicts."""
        jobs: list[dict] = raw.get("jobs") or []
        source_url: str = raw.get("source_url", "")

        m = _TOKEN_RE.search(source_url)
        board_token = m.group(1) if m else "unknown"
        company_name = board_token.replace("-", " ").replace("_", " ").title()

        result = []
        for job in jobs:
            loc = job.get("location") or {}
            location_text = loc.get("name") if isinstance(loc, dict) else str(loc or "")

            content_html = job.get("content") or ""
            if content_html:
                description_text = BeautifulSoup(content_html, "html.parser").get_text(
                    separator="\n"
                ).strip()
            else:
                description_text = ""

            depts = job.get("departments") or []
            department = depts[0].get("name") if depts and isinstance(depts[0], dict) else None

            job_id = str(job.get("id", ""))
            job_url = job.get("absolute_url") or job.get("url") or ""

            result.append(
                {
                    "source_type": self.source_type,
                    "source_name": f"greenhouse_{board_token}",
                    "source_job_id": job_id,
                    "source_url": job_url,
                    "title": job.get("title") or "Untitled",
                    "description_text": description_text,
                    "description_html": content_html,
                    "company_name": company_name,
                    "location_text": location_text,
                    "department": department,
                    "requirements": None,
                    "seniority_level": None,
                    "raw_payload": {
                        "greenhouse_id": job.get("id"),
                        "board_token": board_token,
                        "updated_at": job.get("updated_at"),
                    },
                }
            )

        logger.info(
            "[greenhouse] Parsed %d jobs from board %s", len(result), board_token
        )
        return result
