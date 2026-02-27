"""
NovaX — News Schemas (Pydantic)
Request/response models for news intelligence.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NewsArticle(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    source: str
    url: str
    image_url: Optional[str] = None
    published_at: datetime

    # Enrichment from FinBERT
    sentiment: str  # "positive", "negative", "neutral"
    sentiment_score: float  # 0.0 - 1.0
    impact: str  # "High", "Medium", "Low"

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SentimentSummary(BaseModel):
    total_articles: int
    positive_count: int
    negative_count: int
    neutral_count: int
    average_score: float
    high_impact_count: int
    market_mood: str  # "Bullish", "Bearish", "Mixed"
