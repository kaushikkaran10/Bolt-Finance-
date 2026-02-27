"""
NovaX — News Router
Serves enriched news articles with FinBERT sentiment from MongoDB.
"""

import json
from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from models.mongo import get_mongo_db
from models.redis import get_redis
from schemas.news import NewsArticle, SentimentSummary
from services.news_service import NewsService

router = APIRouter()


@router.get("/", response_model=List[NewsArticle])
async def get_news(
    limit: int = Query(20, ge=1, le=100),
    sentiment: Optional[str] = Query(None, pattern=r"^(positive|negative|neutral)$"),
    impact: Optional[str] = Query(None, pattern=r"^(High|Medium|Low)$"),
):
    """
    Get enriched news articles with sentiment analysis.
    Filters by sentiment and/or impact level. Cached 2 minutes.
    """
    redis = get_redis()
    cache_key = f"cache:news:list:{sentiment}:{impact}:{limit}"
    cached = await redis.get(cache_key)
    if cached:
        return [NewsArticle(**a) for a in json.loads(cached)]

    db = get_mongo_db()
    collection = db["news_articles"]

    query = {}
    if sentiment:
        query["sentiment"] = sentiment
    if impact:
        query["impact"] = impact

    cursor = collection.find(query).sort("published_at", -1).limit(limit)
    articles = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        articles.append(NewsArticle(**doc))

    await redis.setex(cache_key, 120, json.dumps([a.model_dump() for a in articles], default=str))
    return articles


@router.get("/trending", response_model=List[NewsArticle])
async def get_trending_news(limit: int = Query(10, ge=1, le=50)):
    """Get top news ranked by impact score. Cached 2 minutes."""
    redis = get_redis()
    cache_key = f"cache:news:trending:{limit}"
    cached = await redis.get(cache_key)
    if cached:
        return [NewsArticle(**a) for a in json.loads(cached)]

    db = get_mongo_db()
    collection = db["news_articles"]

    pipeline = [
        {
            "$addFields": {
                "impact_order": {
                    "$switch": {
                        "branches": [
                            {"case": {"$eq": ["$impact", "High"]}, "then": 3},
                            {"case": {"$eq": ["$impact", "Medium"]}, "then": 2},
                            {"case": {"$eq": ["$impact", "Low"]}, "then": 1},
                        ],
                        "default": 0,
                    }
                }
            }
        },
        {"$sort": {"impact_order": -1, "sentiment_score": -1}},
        {"$limit": limit},
    ]

    articles = []
    async for doc in collection.aggregate(pipeline):
        doc["id"] = str(doc["_id"])
        articles.append(NewsArticle(**doc))

    await redis.setex(cache_key, 120, json.dumps([a.model_dump() for a in articles], default=str))
    return articles


@router.get("/sentiment", response_model=SentimentSummary)
async def get_sentiment_summary():
    """Get overall market sentiment summary from recent articles. Cached 5 minutes."""
    redis = get_redis()
    cache_key = "cache:news:sentiment_summary"
    cached = await redis.get(cache_key)
    if cached:
        return SentimentSummary(**json.loads(cached))

    db = get_mongo_db()
    collection = db["news_articles"]

    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(hours=24)

    pipeline = [
        {"$match": {"published_at": {"$gte": cutoff}}},
        {
            "$group": {
                "_id": None,
                "total": {"$sum": 1},
                "positive": {
                    "$sum": {"$cond": [{"$eq": ["$sentiment", "positive"]}, 1, 0]}
                },
                "negative": {
                    "$sum": {"$cond": [{"$eq": ["$sentiment", "negative"]}, 1, 0]}
                },
                "neutral": {
                    "$sum": {"$cond": [{"$eq": ["$sentiment", "neutral"]}, 1, 0]}
                },
                "avg_score": {"$avg": "$sentiment_score"},
                "high_impact": {
                    "$sum": {"$cond": [{"$eq": ["$impact", "High"]}, 1, 0]}
                },
            }
        },
    ]

    result = await collection.aggregate(pipeline).to_list(1)

    if not result:
        summary = SentimentSummary(
            total_articles=0,
            positive_count=0,
            negative_count=0,
            neutral_count=0,
            average_score=0.5,
            high_impact_count=0,
            market_mood="Mixed",
        )
        await redis.setex(cache_key, 300, json.dumps(summary.model_dump()))
        return summary

    data = result[0]
    total = data["total"]

    if data["positive"] / total > 0.6:
        mood = "Bullish"
    elif data["negative"] / total > 0.6:
        mood = "Bearish"
    else:
        mood = "Mixed"

    summary = SentimentSummary(
        total_articles=total,
        positive_count=data["positive"],
        negative_count=data["negative"],
        neutral_count=data["neutral"],
        average_score=round(data["avg_score"], 4),
        high_impact_count=data["high_impact"],
        market_mood=mood,
    )
    await redis.setex(cache_key, 300, json.dumps(summary.model_dump()))
    return summary
