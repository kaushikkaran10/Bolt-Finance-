"""
NovaX Backend — FastAPI Application Entry Point
Monolith with logically separated routers for hackathon speed.
"""

from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from config import get_settings
from models import init_db, close_db
from models.mongo import init_mongo, close_mongo
from models.redis import init_redis, close_redis

from routers import auth, learn, predict, news, portfolio, chat, community

settings = get_settings()

# --- Sentry Error Tracking ---
if settings.sentry_dsn:
    sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup & shutdown lifecycle hooks."""
    # Startup - skip database initialization, do it lazily when endpoints are called
    print("✅ NovaX Backend started successfully")
    yield
    # Shutdown - close connections gracefully
    await close_db()
    await close_redis()
    await close_mongo()
    print("🛑 NovaX Backend shut down")


app = FastAPI(
    title="NovaX API",
    description="AI-powered fintech platform — Stock Prediction, News Intelligence, Portfolio Analysis, AI Chat",
    version="1.0.0",
    lifespan=lifespan,
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Prometheus Metrics ---
Instrumentator().instrument(app).expose(app)

# --- Register Routers ---
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(learn.router, prefix="/api/learn", tags=["Learn"])
app.include_router(predict.router, prefix="/api/predict", tags=["Predict"])
app.include_router(news.router, prefix="/api/news", tags=["News"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Portfolio"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(community.router, prefix="/ws", tags=["Community"])


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": "1.0.0",
    }
