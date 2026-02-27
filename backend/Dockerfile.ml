# =============================================
# NovaX — ML Worker Dockerfile
# Includes TensorFlow, PyTorch, Transformers
# Only used by celery-worker and celery-beat
# =============================================

FROM python:3.11-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-ml.txt requirements-api.txt ./
RUN pip install --no-cache-dir --user --default-timeout=1000 -r requirements-ml.txt

# --- Stage 2: Runtime ---
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

COPY . .

RUN mkdir -p ml/weights

CMD ["celery", "-A", "tasks", "worker", "--loglevel=info"]
