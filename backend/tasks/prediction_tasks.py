"""
NovaX — Prediction Celery Tasks
Async tasks for ML inference and daily prediction resolution.
"""

import asyncio
from datetime import datetime, timezone

import yfinance as yf

from tasks import celery_app


@celery_app.task(name="tasks.prediction_tasks.run_ml_prediction")
def run_ml_prediction(ticker: str) -> dict:
    """
    Async LSTM inference task.
    Called when user submits a prediction to offload ML work.
    """
    from services.ml_service import MLService

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(MLService.predict(ticker))
        return result
    except Exception as e:
        return {"error": str(e), "ticker": ticker}
    finally:
        loop.close()


@celery_app.task(name="tasks.prediction_tasks.resolve_predictions")
def resolve_predictions():
    """
    Daily task (market close): fetch actual prices and resolve predictions.
    1. Get all unresolved predictions from today
    2. Fetch actual closing prices
    3. Compare user prediction vs actual direction
    4. Compare ML prediction vs actual
    5. Update leaderboard in Redis
    6. Generate AI explanation via Gemini
    """
    import asyncio
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

    from config import get_settings
    from models.prediction import Prediction

    settings = get_settings()

    async def _resolve():
        engine = create_async_engine(settings.database_url)
        async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async with async_session() as db:
            # Get unresolved predictions
            result = await db.execute(
                select(Prediction).where(Prediction.outcome.is_(None))
            )
            predictions = result.scalars().all()

            if not predictions:
                print("  📊 No predictions to resolve")
                return

            print(f"  📊 Resolving {len(predictions)} predictions...")

            # Group by ticker
            tickers = set(p.ticker for p in predictions)

            # Fetch actual closing prices
            actual_prices = {}
            for ticker in tickers:
                try:
                    stock = yf.Ticker(ticker)
                    hist = stock.history(period="1d")
                    if not hist.empty:
                        actual_prices[ticker] = float(hist["Close"].iloc[-1])
                except Exception as e:
                    print(f"  ⚠️ Failed to fetch {ticker}: {e}")

            # Resolve each prediction
            import redis as sync_redis
            r = sync_redis.from_url(settings.redis_url, decode_responses=True)

            for pred in predictions:
                actual_price = actual_prices.get(pred.ticker)
                if actual_price is None:
                    continue

                pred.actual_price = actual_price
                pred.resolved_at = datetime.now(timezone.utc)

                # Determine actual direction
                prev_close = float(pred.previous_close) if pred.previous_close else 0
                if prev_close == 0:
                    continue

                actual_direction = "Bullish" if actual_price > prev_close else "Bearish"

                # User outcome
                if pred.user_direction == "Neutral":
                    price_change_pct = abs((actual_price - prev_close) / prev_close)
                    pred.outcome = "correct" if price_change_pct < 0.01 else "incorrect"
                else:
                    pred.outcome = "correct" if pred.user_direction == actual_direction else "incorrect"

                # ML outcome
                if pred.ml_predicted_price:
                    ml_direction = "Bullish" if float(pred.ml_predicted_price) > prev_close else "Bearish"
                    pred.ml_outcome = "correct" if ml_direction == actual_direction else "incorrect"

                # Update leaderboard
                if pred.outcome == "correct":
                    # Increment accuracy score
                    current_score = r.zscore("leaderboard:predictions", pred.user_id)
                    if current_score is None:
                        r.zadd("leaderboard:predictions", {pred.user_id: 100.0})
                    else:
                        # Recalculate accuracy
                        from sqlalchemy import func
                        total = await db.scalar(
                            select(func.count()).where(
                                Prediction.user_id == pred.user_id,
                                Prediction.outcome.isnot(None),
                            )
                        )
                        correct = await db.scalar(
                            select(func.count()).where(
                                Prediction.user_id == pred.user_id,
                                Prediction.outcome == "correct",
                            )
                        )
                        accuracy = (correct / total * 100) if total else 0
                        r.zadd("leaderboard:predictions", {pred.user_id: accuracy})

            await db.commit()
            print(f"  ✅ Resolved {len(predictions)} predictions")

        await engine.dispose()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_resolve())
    finally:
        loop.close()
