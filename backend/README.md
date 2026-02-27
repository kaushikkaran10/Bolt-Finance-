# NovaX Backend

AI-powered fintech platform backend built with **FastAPI**, featuring stock prediction (LSTM), news intelligence (FinBERT), portfolio analysis, AI chat (Gemini), and real-time community features.

## 🏗️ Architecture

```
backend/
├── main.py                    # FastAPI entry + CORS + routers
├── config.py                  # Pydantic Settings (env vars)
├── routers/                   # API route handlers
│   ├── auth.py               # JWT + Web3 auth
│   ├── predict.py            # Stock prediction arena
│   ├── news.py               # News intelligence
│   ├── portfolio.py          # Portfolio CRUD + analysis
│   ├── chat.py               # AI advisor (Gemini SSE)
│   ├── learn.py              # Learning modules
│   └── community.py          # WebSocket community
├── models/                    # Database models
│   ├── __init__.py           # SQLAlchemy engine + Base
│   ├── user.py               # User model
│   ├── portfolio.py          # Holdings model
│   ├── prediction.py         # Predictions model
│   ├── redis.py              # Redis connection
│   └── mongo.py              # MongoDB connection
├── schemas/                   # Pydantic request/response schemas
├── services/                  # Business logic
│   ├── ml_service.py         # LSTM inference pipeline
│   ├── news_service.py       # FinBERT sentiment pipeline
│   ├── portfolio_service.py  # Risk calculations
│   └── gemini_service.py     # Gemini API wrapper
├── ml/                        # Machine learning
│   ├── lstm_model.py         # LSTM architecture
│   ├── train.py              # Training script
│   └── weights/              # Saved model weights
└── tasks/                     # Celery async tasks
    ├── __init__.py           # Celery app + Beat schedule
    ├── prediction_tasks.py   # Prediction resolution
    └── news_tasks.py         # News fetch + analysis
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 16+
- Redis 7+
- MongoDB 7+

### Local Development

```bash
# 1. Clone and navigate
cd backend

# 2. Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 5. Run the server
uvicorn main:app --reload --port 8000

# 6. (Optional) Start Celery worker
celery -A tasks worker --loglevel=info

# 7. (Optional) Start Celery Beat
celery -A tasks beat --loglevel=info
```

### Docker (Recommended)

```bash
# From project root
docker-compose up --build
```

This starts: Backend, Celery Worker, Celery Beat, PostgreSQL, Redis, MongoDB, Nginx.

## 🧠 Train ML Model

```bash
cd backend
python -m ml.train --ticker AAPL --epochs 50
python -m ml.train --ticker GOOGL --epochs 50
python -m ml.train --ticker MSFT --epochs 50
```

## 📡 API Endpoints

| Method | Endpoint                   | Description              |
| ------ | -------------------------- | ------------------------ |
| `POST` | `/api/auth/register`       | Register new user        |
| `POST` | `/api/auth/login`          | Login (email + password) |
| `POST` | `/api/auth/web3`           | MetaMask wallet auth     |
| `POST` | `/api/auth/refresh`        | Rotate JWT tokens        |
| `POST` | `/api/auth/logout`         | Logout (blacklist token) |
| `POST` | `/api/predict/submit`      | Submit stock prediction  |
| `GET`  | `/api/predict/history`     | User prediction history  |
| `GET`  | `/api/predict/leaderboard` | Top predictors           |
| `GET`  | `/api/news/`               | Enriched news articles   |
| `GET`  | `/api/news/trending`       | High-impact news         |
| `GET`  | `/api/news/sentiment`      | Market sentiment summary |
| `POST` | `/api/portfolio/holdings`  | Add holding              |
| `GET`  | `/api/portfolio/holdings`  | List holdings            |
| `GET`  | `/api/portfolio/analyze`   | Full portfolio analysis  |
| `POST` | `/api/chat/message`        | AI chat (standard)       |
| `POST` | `/api/chat/message/stream` | AI chat (SSE streaming)  |
| `GET`  | `/api/learn/modules`       | Learning modules         |
| `WS`   | `/ws/community`            | Community WebSocket      |
| `GET`  | `/health`                  | Health check             |
| `GET`  | `/metrics`                 | Prometheus metrics       |
| `GET`  | `/docs`                    | Swagger API docs         |

## ⚙️ Environment Variables

See `.env.example` for all required configuration.

## 🔑 Key Technologies

- **FastAPI** — Async Python web framework
- **PostgreSQL** — User data, holdings, predictions
- **MongoDB** — News articles + sentiment
- **Redis** — Caching, sessions, Celery broker, Pub/Sub
- **TensorFlow/Keras** — LSTM stock prediction
- **HuggingFace Transformers** — FinBERT sentiment
- **Google Gemini** — AI chat advisor
- **Celery** — Background task queue
- **Docker** — Containerization
- **Nginx** — Reverse proxy + rate limiting
