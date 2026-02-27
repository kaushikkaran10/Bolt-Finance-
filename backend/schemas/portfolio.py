"""
NovaX — Portfolio Schemas (Pydantic)
Request/response models for portfolio analysis.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class HoldingCreate(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=10)
    quantity: float = Field(..., gt=0)
    avg_buy_price: float = Field(..., gt=0)


class HoldingResponse(BaseModel):
    id: str
    ticker: str
    quantity: float
    avg_buy_price: float
    sector: Optional[str] = None

    model_config = {"from_attributes": True}


class HoldingAnalysis(BaseModel):
    ticker: str
    quantity: float
    avg_buy_price: float
    current_price: float
    market_value: float
    pnl: float
    pnl_percent: float
    allocation_percent: float
    sector: Optional[str] = None


class RiskMetrics(BaseModel):
    beta: float
    sharpe_ratio: float
    value_at_risk_95: float  # VaR at 95% confidence
    herfindahl_index: float  # Diversification score (lower = more diversified)
    max_drawdown: float


class PortfolioReport(BaseModel):
    total_value: float
    total_invested: float
    total_pnl: float
    total_pnl_percent: float
    holdings: List[HoldingAnalysis]
    risk_metrics: RiskMetrics
    sector_allocation: dict  # {sector: percentage}
