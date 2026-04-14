"""
PATHS Backend - Job Ingestion Graph Nodes
"""
import uuid
import hashlib
from app.agents.job_ingestion.state import JobIngestionState
from app.adapters.job_sources.generic_html import GenericHtmlListingAdapter


def _get_service():
    """Lazy import to break circular dependency: nodes -> service -> graph -> nodes."""
    from app.services.job_ingestion_service import JobIngestionService
    return JobIngestionService()


from app.adapters.job_sources.telegram_channel import TelegramChannelAdapter

def get_adapter(source_type: str):
    if source_type == "generic_html":
        return GenericHtmlListingAdapter()
    elif source_type == "telegram_channel":
        return TelegramChannelAdapter()
    elif source_type == "greenhouse":
        from app.adapters.job_sources.greenhouse import GreenhouseConnector
        return GreenhouseConnector()
    return None

async def fetch_jobs_node(state: JobIngestionState) -> dict:
    adapter = get_adapter(state["source_type"])
    if not adapter:
        return {"errors": [{"stage": "fetch", "error_type": "AdapterNotFound", "error_message": f"Adapter {state['source_type']} not found."}]}
    
    raw_items = []
    
    for url in state["target_urls"][:state["max_pages"]]:
        raw = await adapter.fetch(url)
        raw_items.append(raw)
        
    return {"raw_items": raw_items}


async def parse_source_node(state: JobIngestionState) -> dict:
    adapter = get_adapter(state["source_type"])
    if not adapter:
        return {}
    
    all_parsed = []
    errors = []
    for raw in state["raw_items"]:
        try:
            parsed = await adapter.parse(raw)
            if parsed:
                all_parsed.extend(parsed)
        except Exception as e:
            errors.append({"stage": "parse", "error_type": "ParseError", "error_message": str(e), "details_jsonb": {"url": raw.get("source_url")}})
            
    return {"normalized_items": all_parsed, "errors": errors}

async def normalize_job_node(state: JobIngestionState) -> dict:
    for item in state["normalized_items"]:
        hash_input = f"{item.get('company_name', '')}_{item.get('title', '')}_{item.get('source_url', '')}".lower()
        item["canonical_hash"] = hashlib.sha256(hash_input.encode()).hexdigest()
    return {}

async def extract_skills_node(state: JobIngestionState) -> dict:
    # Optional step, could use LLM. Skipped for deterministic agent.
    return {}

async def deduplicate_job_node(state: JobIngestionState) -> dict:
    service = _get_service()
    duplicates_hashes = await service.identify_duplicates(state["normalized_items"])
    return {"stats": {"duplicate_hashes": duplicates_hashes}}

async def persist_job_node(state: JobIngestionState) -> dict:
    service = _get_service()
    dup_hashes = state.get("stats", {}).get("duplicate_hashes", [])
    
    items_to_persist = [item for item in state["normalized_items"] if item.get("canonical_hash") not in dup_hashes]
    
    if state["run_id"]:
        persisted_ids, errors = await service.persist_jobs(state["run_id"], items_to_persist)
        await service.persist_raw_items(state["run_id"], state["raw_items"])
        return {"persisted_job_ids": persisted_ids, "errors": errors}
    return {}

async def project_to_qdrant_node(state: JobIngestionState) -> dict:
    # Optional projection node
    return {}

async def finalize_run_node(state: JobIngestionState) -> dict:
    if state["run_id"]:
        service = _get_service()
        await service.finalize_run(state)
    return {}

async def handle_error_node(state: JobIngestionState) -> dict:
    if state["run_id"] and state["errors"]:
        service = _get_service()
        await service.save_errors(state["run_id"], state["errors"])
    return {}
