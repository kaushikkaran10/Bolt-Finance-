"""
NovaX — Prediction Router
Stock prediction arena: submit predictions, get ML inference, track history, leaderboard.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from models import get_db
from models.user import User
from models.prediction import Prediction
from models.redis import get_redis
from routers.auth import get_current_user
from schemas.predict import (
    PredictionSubmit,
    PredictionResponse,
    PredictionResult,
    LeaderboardEntry,
)
from services.ml_service import MLService

router = APIRouter()
settings = get_settings()


@router.post("/submit", response_model=PredictionResult)
async def submit_prediction(
    request: PredictionSubmit,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a stock prediction:
    1. Accept user prediction (ticker + direction)
    2. Run LSTM inference for ML prediction
    3. Store both predictions
    4. Return comparison: User Pred | ML Pred | Confidence
    """
    ticker = request.ticker.upper()

    # Run ML inference
    try:
        ml_result = await MLService.predict(ticker)
    except FileNotFoundError:
        # No trained model — use a demo response
        ml_result = {
            "ticker": ticker,
            "current_price": 0.0,
            "predicted_price": 0.0,
            "ml_direction": "Neutral",
            "confidence": 0.5,
            "price_change_pct": 0.0,
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"ML prediction failed: {str(e)}")

    # Store prediction
    prediction = Prediction(
        user_id=user.id,
        ticker=ticker,
        user_direction=request.direction,
        ml_predicted_price=ml_result["predicted_price"],
        ml_confidence=ml_result["confidence"],
        previous_close=ml_result["current_price"],
    )
    db.add(prediction)
    await db.flush()

    return PredictionResult(
        prediction_id=prediction.id,
        ticker=ticker,
        user_direction=request.direction,
        ml_predicted_price=ml_result["predicted_price"],
        ml_confidence=ml_result["confidence"],
        current_price=ml_result["current_price"],
        ml_direction=ml_result["ml_direction"],
    )


@router.get("/history", response_model=List[PredictionResponse])
async def get_prediction_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's prediction history, newest first."""
    result = await db.execute(
        select(Prediction)
        .where(Prediction.user_id == user.id)
        .order_by(Prediction.submitted_at.desc())
        .limit(50)
    )
    predictions = result.scalars().all()
    return [PredictionResponse.model_validate(p) for p in predictions]


@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(db: AsyncSession = Depends(get_db)):
    """
    Get top users by prediction accuracy.
    Uses Redis sorted set for fast retrieval, falls back to DB calculation.
    """
    redis = get_redis()

    # Try Redis sorted set first
    leaderboard_data = await redis.zrevrange(
        "leaderboard:predictions", 0, 19, withscores=True
    )

    if leaderboard_data:
        # Batch fetch all users in one query (eliminates N+1)
        user_ids = [user_id for user_id, _ in leaderboard_data]
        score_map = {user_id: score for user_id, score in leaderboard_data}

        users_result = await db.execute(
            select(User).where(User.id.in_(user_ids))
        )
        users_map = {u.id: u for u in users_result.scalars().all()}

        # Fetch prediction counts in one aggregation query
        counts_result = await db.execute(
            select(
                Prediction.user_id,
                func.count().label("total"),
                func.sum(case((Prediction.outcome == "correct", 1), else_=0)).label("correct"),
            )
            .where(
                Prediction.user_id.in_(user_ids),
                Prediction.outcome.isnot(None),
            )
            .group_by(Prediction.user_id)
        )
        counts_map = {row.user_id: row for row in counts_result.all()}

        entries = []
        for rank, user_id in enumerate(user_ids, 1):
            user = users_map.get(user_id)
            if user:
                counts = counts_map.get(user_id)
                entries.append(LeaderboardEntry(
                    user_id=user_id,
                    username=user.username,
                    total_predictions=counts.total if counts else 0,
                    correct_predictions=counts.correct if counts else 0,
                    accuracy=round(score_map[user_id], 2),
                    rank=rank,
                ))
        return entries

    # Fallback: calculate from DB
    result = await db.execute(
        select(
            Prediction.user_id,
            func.count().label("total"),
            func.sum(
                case((Prediction.outcome == "correct", 1), else_=0)
            ).label("correct"),
        )
        .where(Prediction.outcome.isnot(None))
        .group_by(Prediction.user_id)
        .order_by(func.count().desc())
        .limit(20)
    )

    entries = []
    for rank, row in enumerate(result.all(), 1):
        user_result = await db.execute(select(User).where(User.id == row.user_id))
        user = user_result.scalar_one_or_none()
        if user:
            total = row.total or 0
            correct = row.correct or 0
            accuracy = (correct / total * 100) if total else 0
            entries.append(LeaderboardEntry(
                user_id=row.user_id,
                username=user.username,
                total_predictions=total,
                correct_predictions=correct,
                accuracy=round(accuracy, 2),
                rank=rank,
            ))

    return entries
