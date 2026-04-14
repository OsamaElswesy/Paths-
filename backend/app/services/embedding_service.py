"""
PATHS Backend — Embedding service.

Uses Ollama's local embedding model (nomic-embed-text) for vector generation.
Ollama is an OPTIONAL service (docker-compose --profile ai).
Any call to embed_documents or embed_query will raise OllamaUnavailableError
if Ollama is not reachable, rather than hanging indefinitely.
"""

from typing import List
import httpx
from langchain_ollama import OllamaEmbeddings
from app.core.config import get_settings
from app.core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


class OllamaUnavailableError(RuntimeError):
    """Raised when Ollama is not reachable and an embedding is requested.

    This means the --profile ai stack is not running.
    Start it with: docker-compose --profile ai up -d ollama
    Then pull the model: docker exec paths_ollama ollama pull nomic-embed-text
    """


def _check_ollama_available() -> None:
    """Fast connectivity check before attempting an embedding call.

    Raises OllamaUnavailableError immediately if Ollama is unreachable,
    rather than letting the embedding client hang for a long time.
    """
    try:
        r = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=2.0)
        if r.status_code != 200:
            raise OllamaUnavailableError(
                f"Ollama returned HTTP {r.status_code}. "
                "Is the AI profile running? docker-compose --profile ai up -d"
            )
    except httpx.ConnectError:
        raise OllamaUnavailableError(
            f"Ollama is not reachable at {settings.ollama_base_url}. "
            "Start the AI profile: docker-compose --profile ai up -d ollama"
        )
    except OllamaUnavailableError:
        raise
    except Exception as exc:
        raise OllamaUnavailableError(f"Ollama check failed: {exc}") from exc


def get_embeddings_service() -> OllamaEmbeddings:
    """Return an OllamaEmbeddings instance configured from settings.

    Raises OllamaUnavailableError if Ollama is not reachable.
    """
    _check_ollama_available()
    return OllamaEmbeddings(
        model=settings.ollama_embed_model,
        base_url=settings.ollama_base_url,
    )


def embed_documents(texts: List[str]) -> List[List[float]]:
    """Embed a list of texts using the local Ollama embedding model.

    Raises OllamaUnavailableError if Ollama is not running.
    """
    if not texts:
        return []
    logger.debug("Embedding %d document(s) via Ollama (%s)", len(texts), settings.ollama_embed_model)
    embeddings = get_embeddings_service()
    return embeddings.embed_documents(texts)


def embed_query(text: str) -> List[float]:
    """Embed a single query text.

    Raises OllamaUnavailableError if Ollama is not running.
    """
    logger.debug("Embedding query via Ollama (%s)", settings.ollama_embed_model)
    embeddings = get_embeddings_service()
    return embeddings.embed_query(text)
