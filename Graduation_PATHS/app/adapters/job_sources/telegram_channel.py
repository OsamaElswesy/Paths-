"""
PATHS Backend — Telegram Channel Job Parser.

Parses job postings from public Telegram channels via the t.me/s/ web interface.

Strategy:
  - Only public channels — no authentication or bot token required
  - Fetches t.me/s/{channel} HTML, extracts message text from
    .tgme_widget_message_text elements
  - Extracts job data from message text directly using lightweight regex
  - Does NOT follow external links (avoids LinkedIn ToS issues and
    secondary scraping fragility)

Set TELEGRAM_JOB_CHANNELS in .env as a comma-separated list of channel handles
(without @), or pass target URLs explicitly per request.
"""

import hashlib
import logging
import re

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ── Extraction patterns ───────────────────────────────────────────────────────

_TITLE_PATTERNS = re.compile(
    r"(?:hiring|looking for|opening|open position|vacancy|role|we('re| are) hiring)[:\s]+([^\n]{5,100})",
    re.IGNORECASE,
)
_COMPANY_PATTERNS = re.compile(
    r"(?:company\s*[:\-]\s*|at\s+)([A-Z][A-Za-z0-9\s&.]{2,60})(?:\s*[|\n,]|$)",
    re.MULTILINE,
)
_LOCATION_PATTERNS = re.compile(
    r"(?:location|based in|city|office)\s*[:\-]\s*([^\n,]{3,60})",
    re.IGNORECASE,
)
_JOB_KEYWORDS = re.compile(
    r"\b(?:hiring|vacancy|opening|position|role|job|recruit|apply|cv|resume|"
    r"salary|yrs?|years?\s+exp|full.?time|part.?time|remote|onsite|hybrid)\b",
    re.IGNORECASE,
)
_SENIORITY_SENIOR = re.compile(r"\b(?:senior|lead|principal|staff|sr\.?)\b", re.IGNORECASE)
_SENIORITY_JUNIOR = re.compile(r"\b(?:junior|entry.?level|intern|fresher?|jr\.?)\b", re.IGNORECASE)
_SENIORITY_MID = re.compile(r"\b(?:mid.?level|intermediate|mid)\b", re.IGNORECASE)


class TelegramChannelAdapter:
    name = "telegram_channel"
    source_type = "telegram_channel"

    def __init__(self, max_messages: int = 20):
        self.max_messages = max_messages
        self._headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            )
        }

    # ── Protocol methods ──────────────────────────────────────────────────────

    async def discover(self, query: dict | None = None) -> list[str]:
        """
        Return t.me/s/ URLs for configured channels.

        Accepts explicit URLs via query["urls"], or reads TELEGRAM_JOB_CHANNELS
        from settings.
        """
        if query and "urls" in query:
            return query["urls"][: self.max_messages]
        try:
            from app.core.config import get_settings

            raw = get_settings().telegram_job_channels or ""
            channels = [c.strip().lstrip("@").lstrip("/") for c in raw.split(",") if c.strip()]
            return [f"https://t.me/s/{c}" for c in channels]
        except Exception:
            return []

    async def fetch(self, target: str) -> dict:
        """Fetch the Telegram channel web page."""
        try:
            async with httpx.AsyncClient(
                verify=False,
                timeout=15.0,
                headers=self._headers,
                follow_redirects=True,
            ) as client:
                response = await client.get(target)
                response.raise_for_status()
                return {
                    "source_url": target,
                    "html": response.text,
                    "status_code": response.status_code,
                    "target_id": target,
                }
        except Exception as exc:
            logger.error("Failed to fetch Telegram channel %s: %s", target, exc)
            return {
                "source_url": target,
                "html": "",
                "status_code": 500,
                "target_id": target,
                "error": str(exc),
            }

    async def parse(self, raw: dict) -> list[dict]:
        """
        Parse job messages from Telegram channel HTML.

        Finds .tgme_widget_message_text elements, filters for job-like messages,
        and extracts structured fields from the text.  No external links are
        followed — all data comes from the Telegram message text itself.
        """
        html = raw.get("html") or ""
        source_url = raw.get("source_url", "")
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        message_els = soup.find_all("div", class_="tgme_widget_message_text")

        parsed: list[dict] = []
        for el in message_els[: self.max_messages]:
            text = el.get_text(separator="\n").strip()
            if not text or len(text) < 30:
                continue
            if not self._looks_like_job(text):
                continue

            title = self._extract_title(text) or "Job Opening"
            company = self._extract_company(text)
            location = self._extract_location(text)
            seniority = self._extract_seniority(text)

            # Stable dedup key: first 200 normalised chars of the message
            content_sig = re.sub(r"\s+", " ", text[:200]).lower().strip()
            source_job_id = hashlib.md5(content_sig.encode()).hexdigest()[:16]

            parsed.append(
                {
                    "source_type": self.source_type,
                    "source_name": self.name,
                    "source_job_id": source_job_id,
                    "source_url": source_url,
                    "title": title,
                    "description_text": text,
                    "description_html": str(el),
                    "company_name": company or "Via Telegram",
                    "location_text": location,
                    "requirements": None,
                    "seniority_level": seniority,
                    "raw_payload": {"channel_url": source_url},
                }
            )

        logger.info(
            "[telegram] Parsed %d job messages from %s", len(parsed), source_url
        )
        return parsed

    # ── Extraction helpers ────────────────────────────────────────────────────

    def _looks_like_job(self, text: str) -> bool:
        return bool(_JOB_KEYWORDS.search(text))

    def _extract_title(self, text: str) -> str | None:
        m = _TITLE_PATTERNS.search(text)
        if m:
            return m.group(2).strip()[:100]
        # Fallback: first non-empty line that doesn't look like a URL
        for line in text.splitlines():
            line = line.strip()
            if len(line) >= 5 and not line.startswith("http"):
                return line[:100]
        return None

    def _extract_company(self, text: str) -> str | None:
        m = _COMPANY_PATTERNS.search(text)
        return m.group(1).strip()[:100] if m else None

    def _extract_location(self, text: str) -> str | None:
        m = _LOCATION_PATTERNS.search(text)
        return m.group(1).strip()[:100] if m else None

    def _extract_seniority(self, text: str) -> str | None:
        if _SENIORITY_SENIOR.search(text):
            return "senior"
        if _SENIORITY_JUNIOR.search(text):
            return "junior"
        if _SENIORITY_MID.search(text):
            return "mid"
        return None
