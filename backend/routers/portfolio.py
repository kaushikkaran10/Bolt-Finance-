"""
NovaX — Portfolio Router
CRUD for holdings + full portfolio analysis with risk metrics.
"""

import json

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from models import get_db
from models.user import User
from models.portfolio import Holding
from models.redis import get_redis
from routers.auth import get_current_user
from schemas.portfolio import HoldingCreate, HoldingResponse, PortfolioReport
from services.portfolio_service import PortfolioService

router = APIRouter()


@router.post("/holdings", response_model=HoldingResponse, status_code=status.HTTP_201_CREATED)
async def add_holding(
    request: HoldingCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a new holding to the user's portfolio."""
    ticker = request.ticker.upper()

    # Check if holding already exists
    result = await db.execute(
        select(Holding).where(
            Holding.user_id == user.id,
            Holding.ticker == ticker,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Update existing: weighted average price, add quantity
        total_qty = float(existing.quantity) + request.quantity
        weighted_price = (
            float(existing.quantity) * float(existing.avg_buy_price)
            + request.quantity * request.avg_buy_price
        ) / total_qty
        existing.quantity = total_qty
        existing.avg_buy_price = weighted_price
        await db.flush()
        return HoldingResponse.model_validate(existing)

    # Create new holding
    holding = Holding(
        user_id=user.id,
        ticker=ticker,
        quantity=request.quantity,
        avg_buy_price=request.avg_buy_price,
    )
    db.add(holding)
    await db.flush()
    return HoldingResponse.model_validate(holding)


@router.get("/holdings", response_model=List[HoldingResponse])
async def get_holdings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all holdings for the current user."""
    result = await db.execute(
        select(Holding).where(Holding.user_id == user.id)
    )
    holdings = result.scalars().all()
    return [HoldingResponse.model_validate(h) for h in holdings]


@router.delete("/holdings/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holding(
    holding_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a holding from the portfolio."""
    result = await db.execute(
        select(Holding).where(
            Holding.id == holding_id,
            Holding.user_id == user.id,
        )
    )
    holding = result.scalar_one_or_none()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    await db.delete(holding)


@router.get("/analyze", response_model=PortfolioReport)
async def analyze_portfolio(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Full portfolio analysis:
    - Allocation % per stock/sector
    - P&L per holding + overall
    - Risk Score: Beta, Sharpe, VaR, Herfindahl
    Cached in Redis per user for 5 minutes.
    """
    redis = get_redis()
    cache_key = f"cache:portfolio:analyze:{user.id}"

    # Serve from cache if available
    cached = await redis.get(cache_key)
    if cached:
        return PortfolioReport(**json.loads(cached))

    result = await db.execute(
        select(Holding).where(Holding.user_id == user.id)
    )
    holdings = result.scalars().all()

    holdings_data = [
        {
            "ticker": h.ticker,
            "quantity": float(h.quantity),
            "avg_buy_price": float(h.avg_buy_price),
            "sector": h.sector or "Unknown",
        }
        for h in holdings
    ]

    report = await PortfolioService.analyze_portfolio(holdings_data)

    # Cache for 5 minutes
    await redis.setex(cache_key, 300, json.dumps(report))

    return PortfolioReport(**report)
