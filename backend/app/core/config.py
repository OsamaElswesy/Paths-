"""
PATHS Backend — Application configuration.

All settings are loaded from environment variables via pydantic-settings.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Application ─────────────────────────────────────
    app_name: str = "PATHS Backend"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    debug: bool = True

    # ── PostgreSQL ──────────────────────────────────────
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "paths_db"
    postgres_user: str = "paths_user"
    postgres_password: str = "change_me"
    database_url: str = "postgresql+psycopg://paths_user:change_me@localhost:5432/paths_db"

    # ── Apache AGE ──────────────────────────────────────
    age_graph_name: str = "paths_graph"

    # ── Qdrant ──────────────────────────────────────────
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    qdrant_collection_cv: str = "candidate_cv_chunks"
    qdrant_collection_vector_size: int = 768  # nomic-embed-text dimension

    # ── Ollama ──────────────────────────────────────────
    ollama_base_url: str = "http://localhost:11434"
    ollama_llm_model: str = "llama3.1:8b"
    ollama_embed_model: str = "nomic-embed-text"

    # ── Authentication / JWT ────────────────────────────
    secret_key: str = "CHANGE-ME-TO-A-RANDOM-SECRET"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # ── Ingestion ───────────────────────────────────────
    upload_dir: str = "./uploads"
    chunk_size: int = 900
    chunk_overlap: int = 120

    # ── Job Ingestion ───────────────────────────────────
    job_ingestion_enabled: bool = True
    enable_glassdoor_source: bool = False
    job_ingestion_max_pages: int = 20
    qdrant_collection_jobs: str = "job_description_chunks"

    # ── External Sourcing Connectors ─────────────────────
    # Comma-separated Greenhouse board tokens (company slugs), e.g. "airbnb,stripe"
    greenhouse_board_tokens: str = ""
    # Comma-separated Telegram channel handles (without @), e.g. "it_jobs_linkedin"
    telegram_job_channels: str = ""


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
