"""
NovaX — Portfolio Holding Model (SQLAlchemy)
Stores user stock holdings for portfolio analysis.
"""

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models import Base


class Holding(Base):
    __tablename__ = "holdings"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    ticker: Mapped[str] = mapped_column(String(10), index=True)
    quantity: Mapped[float] = mapped_column(Numeric(precision=18, scale=8))
    avg_buy_price: Mapped[float] = mapped_column(Numeric(precision=18, scale=4))
    sector: Mapped[str] = mapped_column(String(100), nullable=True, default=None)

    # Relationships
    user = relationship("User", back_populates="holdings")

    def __repr__(self):
        return f"<Holding(ticker={self.ticker}, qty={self.quantity})>"
