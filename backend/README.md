# PATHS Backend — CV Ingestion Agent

A production-ready AI ingestion agent for the **PATHS** hiring platform that accepts CVs, extracts and normalizes candidate information using a local LLM, and persistently stores data across three synchronized stores.

## Architecture

```
CV Upload → FastAPI → LangGraph Agent Pipeline
                         │
                         ├─ 1. Load document (PDF/DOCX/TXT)
                         ├─ 2. Extract text
                         ├─ 3. Structured extraction (Ollama + deterministic)
                         ├─ 4. Normalize entities (dedupe, clean, validate)
                         ├─ 5. Persist to PostgreSQL (canonical source of truth)
                         ├─ 6. Project to Apache AGE (graph relationships)
                         ├─ 7. Chunk document (section-aware splitting)
                         ├─ 8. Embed chunks (nomic-embed-text via Ollama)
                         ├─ 9. Upsert to Qdrant (vector search)
                         └─ 10. Finalize job
```

All stores share a **unified `candidate_id` UUID** for consistency.

### Data Stores

| Store | Purpose | Content |
|-------|---------|---------|
| **PostgreSQL** | Canonical relational data | Candidates, skills, experiences, education, certifications |
| **Apache AGE** | Graph relationships | Candidate→Skill, Candidate→Company, Candidate→Education |
| **Qdrant** | Semantic vector search | Embedded CV text chunks for RAG retrieval |

## Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Conda (Miniconda recommended)

## Quick Start

### 1. Start Infrastructure Services

```bash
cd backend
docker compose up -d postgres qdrant ollama
```

### 2. Enable Apache AGE Extension

The `apache/age:latest` Docker image comes with AGE pre-installed. Initialize the graph:

```bash
docker exec -it paths_postgres psql -U paths_user -d paths_db -c "CREATE EXTENSION IF NOT EXISTS age;"
docker exec -it paths_postgres psql -U paths_user -d paths_db -c "LOAD 'age'; SET search_path = ag_catalog, \"\$user\", public; SELECT create_graph('paths_graph');"
```

Or run the init script:
```bash
docker exec -i paths_postgres psql -U paths_user -d paths_db < scripts/init_age.sql
```

### 3. Pull Local Models (Ollama)

```bash
# Pull the LLM for structured extraction
docker exec -it paths_ollama ollama pull llama3.1:8b

# Pull the embedding model
docker exec -it paths_ollama ollama pull nomic-embed-text
```

### 4. Environment Setup

```bash
# Copy and edit environment file
cp .env.example .env
# Edit .env for local development (localhost instead of Docker service names)
```

### 5. Install Dependencies

```bash
pip install -r requirements.txt
```

### 6. Run Migrations

```bash
alembic upgrade head
```

### 7. Start the Application

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### Upload CV
```bash
POST /api/v1/cv-ingestion/upload
# Multipart file upload, accepts PDF, DOCX, or TXT
curl -X POST http://localhost:8000/api/v1/cv-ingestion/upload \
  -F "file=@resume.pdf"
```

### Check Job Status
```bash
GET /api/v1/cv-ingestion/jobs/{job_id}
```

### Get Candidate Data
```bash
GET /api/v1/candidates/{candidate_id}
```

### Health Check
```bash
GET /health
# Returns per-service status: postgres, age, qdrant, ollama
```

## Testing & Verification

### Run Integration Test
```bash
# With the API running:
python scripts/verify_ingestion.py

# Or with pytest:
pytest app/tests/integration/test_cv_ingestion_pipeline.py -v -s
```

### Verify Data in PostgreSQL
```bash
docker exec -it paths_postgres psql -U paths_user -d paths_db -c "SELECT id, full_name, email FROM candidates;"
docker exec -it paths_postgres psql -U paths_user -d paths_db -c "SELECT * FROM candidate_skills;"
```

### Verify Apache AGE Graph
```bash
docker exec -it paths_postgres psql -U paths_user -d paths_db -c "LOAD 'age'; SET search_path = ag_catalog, \"\$user\", public; SELECT * FROM cypher('paths_graph', \$\$MATCH (n:Candidate) RETURN n\$\$) as (v agtype);"
```

### Verify Qdrant Vectors
```bash
curl http://localhost:6333/collections/candidate_cv_chunks
```

## Project Structure

```
backend/
├── app/
│   ├── main.py                          # FastAPI app + root health endpoint
│   ├── core/
│   │   ├── config.py                    # Pydantic settings from env
│   │   ├── database.py                  # SQLAlchemy engine & session
│   │   ├── logging.py                   # Structured logging
│   │   └── security.py                  # Auth utilities
│   ├── api/v1/
│   │   ├── health.py                    # Health check endpoints
│   │   ├── cv_ingestion.py              # Upload + job status endpoints
│   │   ├── candidates.py                # Candidate preview endpoint
│   │   └── system.py                    # System/bootstrap endpoints
│   ├── agents/cv_ingestion/
│   │   ├── state.py                     # LangGraph state TypedDict
│   │   ├── nodes.py                     # Pipeline node functions
│   │   ├── graph.py                     # LangGraph workflow definition
│   │   └── schemas.py                   # Pydantic extraction schemas
│   ├── db/models/                        # SQLAlchemy ORM models
│   ├── repositories/
│   │   ├── graph_repo.py                # Apache AGE Cypher operations
│   │   └── vector_repo.py               # Qdrant vector operations
│   ├── services/
│   │   ├── age_service.py               # AGE service layer
│   │   ├── cv_ingestion_service.py      # Pipeline orchestration
│   │   ├── embedding_service.py         # Ollama embedding calls
│   │   ├── postgres_service.py          # PG health/diagnostics
│   │   └── qdrant_service.py            # Qdrant service layer
│   └── tests/integration/
│       └── test_cv_ingestion_pipeline.py
├── alembic/                              # Database migrations
├── scripts/
│   ├── init_age.sql                     # AGE graph initialization
│   └── verify_ingestion.py             # End-to-end verification
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── requirements.txt
```

## Known Limitations

1. **Ollama model pull required**: The LLM and embedding models must be manually pulled into the Ollama container after first start.
2. **OCR not implemented**: Scanned PDFs without text layers will fail extraction. Only text-based PDFs are supported.
3. **No authentication**: API endpoints are unprotected in the current version.
4. **AGE parameterized queries**: Apache AGE's Cypher parameter handling varies by driver; the current implementation uses string-substituted Cypher queries with care.
5. **Single-threaded pipeline**: Each CV is processed sequentially through the LangGraph pipeline. For production, consider adding a task queue (Celery/RQ).
