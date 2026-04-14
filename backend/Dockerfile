FROM python:3.11-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl wget && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# NOTE: --reload is intentionally excluded here; use it only for local dev outside Docker.
# For production or docker-compose, a clean single-worker start is more stable.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
