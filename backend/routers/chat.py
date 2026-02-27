"""
NovaX — Chat Router
AI Strategy Advisor powered by Gemini 1.5 Flash with SSE streaming.
Context-aware: pulls portfolio, news sentiment, prediction accuracy.
"""

import asyncio
import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models import get_db
from models.user import User
from models.portfolio import Holding
from models.prediction import Prediction
from models.mongo import get_mongo_db
from routers.auth import get_current_user
from schemas.chat import ChatMessage, ChatResponse
from services.gemini_service import GeminiService

router = APIRouter()


async def _build_portfolio_summary(user_id: str, db: AsyncSession) -> str:
    """Build portfolio summary string for system prompt."""
    result = await db.execute(
        select(Holding).where(Holding.user_id == user_id)
    )
    holdings = result.scalars().all()

    if not holdings:
        return "No portfolio data"

    lines = []
    for h in holdings:
        lines.append(f"{h.ticker}: {h.quantity} shares @ ${h.avg_buy_price}")

    return "; ".join(lines)


async def _build_news_summary() -> str:
    """Build recent news sentiment summary for system prompt."""
    try:
        db = get_mongo_db()
        collection = db["news_articles"]

        from datetime import datetime, timedelta

        cutoff = datetime.utcnow() - timedelta(hours=24)
        cursor = collection.find({"published_at": {"$gte": cutoff}}).limit(5)

        articles = []
        async for doc in cursor:
            articles.append(
                f"{doc.get('title', 'N/A')} [Sentiment: {doc.get('sentiment', 'neutral')}, "
                f"Impact: {doc.get('impact', 'Low')}]"
            )

        return "; ".join(articles) if articles else "No recent news data"
    except Exception:
        return "No recent news data"


async def _get_user_accuracy(user_id: str, db: AsyncSession) -> float:
    """Calculate user's prediction accuracy percentage."""
    total = await db.scalar(
        select(func.count()).where(
            Prediction.user_id == user_id,
            Prediction.outcome.isnot(None),
        )
    )
    if not total or total == 0:
        return 0.0

    correct = await db.scalar(
        select(func.count()).where(
            Prediction.user_id == user_id,
            Prediction.outcome == "correct",
        )
    )
    return (correct / total * 100) if total else 0.0


@router.post("/message", response_model=ChatResponse)
async def chat_message(
    request: ChatMessage,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Non-streaming chat: build context → Gemini → return response.
    """
    portfolio_summary, accuracy, news_summary = await asyncio.gather(
        _build_portfolio_summary(user.id, db),
        _get_user_accuracy(user.id, db),
        _build_news_summary(),
    )

    response_text = await GeminiService.chat(
        user_message=request.message,
        user_id=user.id,
        portfolio_summary=portfolio_summary,
        news_summary=news_summary,
        accuracy=accuracy,
    )

    return ChatResponse(
        response=response_text,
        conversation_id=user.id,
    )


@router.post("/message/stream")
async def chat_message_stream(
    request: ChatMessage,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    SSE streaming chat: build context → Gemini stream → Server-Sent Events.
    Frontend consumes with EventSource API for real-time typing animation.
    """
    portfolio_summary, accuracy, news_summary = await asyncio.gather(
        _build_portfolio_summary(user.id, db),
        _get_user_accuracy(user.id, db),
        _build_news_summary(),
    )

    async def event_generator():
        async for chunk in GeminiService.stream_chat(
            user_message=request.message,
            user_id=user.id,
            portfolio_summary=portfolio_summary,
            news_summary=news_summary,
            accuracy=accuracy,
        ):
            yield f"data: {json.dumps({'token': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
