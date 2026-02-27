"""
NovaX — Prediction Model (SQLAlchemy)
Stores user predictions and ML predictions for the prediction arena.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models import Base


class Prediction(Base):
    __tablename__ = "predictions"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    ticker: Mapped[str] = mapped_column(String(10), index=True)

    # User's prediction
    user_direction: Mapped[str] = mapped_column(
        String(10)  # "Bullish", "Bearish", "Neutral"
    )

    # ML prediction
    ml_predicted_price: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=18, scale=4), nullable=True
    )
    ml_confidence: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=5, scale=4), nullable=True  # 0.0 - 1.0
    )

    # Actual result (filled after market close)
    actual_price: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=18, scale=4), nullable=True
    )
    previous_close: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=18, scale=4), nullable=True
    )

    # Outcome
    outcome: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True  # "correct", "incorrect"
    )
    ml_outcome: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True  # "correct", "incorrect"
    )
    ai_explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    submitted_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now()
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Relationships
    user = relationship("User", back_populates="predictions")

    def __repr__(self):
        return f"<Prediction(ticker={self.ticker}, direction={self.user_direction})>"
