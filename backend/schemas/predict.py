"""
NovaX — Prediction Schemas (Pydantic)
Request/response models for the prediction arena.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PredictionSubmit(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=10, examples=["AAPL"])
    direction: str = Field(
        ..., pattern=r"^(Bullish|Bearish|Neutral)$",
        description="User's market direction prediction"
    )


class PredictionResponse(BaseModel):
    id: str
    ticker: str
    user_direction: str
    ml_predicted_price: Optional[float] = None
    ml_confidence: Optional[float] = None
    actual_price: Optional[float] = None
    outcome: Optional[str] = None
    ml_outcome: Optional[str] = None
    ai_explanation: Optional[str] = None
    submitted_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PredictionResult(BaseModel):
    """Returned immediately after submission."""
    prediction_id: str
    ticker: str
    user_direction: str
    ml_predicted_price: float
    ml_confidence: float
    current_price: float
    ml_direction: str  # "Bullish" / "Bearish" based on ML prediction vs current


class LeaderboardEntry(BaseModel):
    user_id: str
    username: str
    total_predictions: int
    correct_predictions: int
    accuracy: float
    rank: int
