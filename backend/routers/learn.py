"""
NovaX — Learn Router
Educational learning modules for financial literacy.
"""

import json
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from models.user import User
from routers.auth import get_current_user
from models.redis import get_redis

router = APIRouter()


# --- Learning Module Data (could move to DB later) ---

class LearningModule(BaseModel):
    id: str
    title: str
    description: str
    category: str  # "beginner", "intermediate", "advanced"
    duration_minutes: int
    topics: List[str]
    content: Optional[str] = None


class ModuleProgress(BaseModel):
    module_id: str
    completed: bool
    progress_percent: float
    last_accessed: Optional[str] = None


MODULES = [
    LearningModule(
        id="basics-01",
        title="Stock Market Fundamentals",
        description="Learn the basics of how stock markets work, key terminology, and market structure.",
        category="beginner",
        duration_minutes=15,
        topics=["Market Structure", "Order Types", "Stock Exchanges", "Market Hours"],
        content="""# Stock Market Fundamentals

## What is a Stock Market?
A stock market is a venue where buyers and sellers trade shares of publicly listed companies. The price of a stock is determined by supply and demand.

## Key Terminology
- **Bull Market**: A market trending upward
- **Bear Market**: A market trending downward
- **Market Cap**: Total value of a company's shares
- **Volume**: Number of shares traded in a period
- **P/E Ratio**: Price-to-Earnings ratio, a valuation metric

## Order Types
- **Market Order**: Buy/sell at current market price
- **Limit Order**: Buy/sell at a specified price or better
- **Stop Loss**: Automatically sell when price drops to a level

## Market Hours
- NYSE & NASDAQ: 9:30 AM - 4:00 PM EST
- Pre-market: 4:00 AM - 9:30 AM EST
- After-hours: 4:00 PM - 8:00 PM EST
""",
    ),
    LearningModule(
        id="ta-01",
        title="Technical Analysis 101",
        description="Understanding charts, patterns, and technical indicators for trading decisions.",
        category="intermediate",
        duration_minutes=25,
        topics=["Candlestick Charts", "Support/Resistance", "RSI", "MACD", "Bollinger Bands"],
        content="""# Technical Analysis 101

## Chart Types
- **Line Chart**: Simple price over time
- **Candlestick Chart**: Shows open, high, low, close (OHLC)
- **Bar Chart**: Similar to candlestick with different visualization

## Key Indicators
### RSI (Relative Strength Index)
- Measures momentum (0-100 scale)
- Above 70 = overbought (sell signal)
- Below 30 = oversold (buy signal)

### MACD (Moving Average Convergence Divergence)
- Shows trend direction and momentum
- Signal line crossovers indicate buy/sell opportunities

### Bollinger Bands
- Upper/lower bands show volatility
- Price touching upper band = potentially overbought
- Price touching lower band = potentially oversold
""",
    ),
    LearningModule(
        id="risk-01",
        title="Risk Management Strategies",
        description="Learn how to manage portfolio risk, diversification, and position sizing.",
        category="intermediate",
        duration_minutes=20,
        topics=["Diversification", "Position Sizing", "Stop Losses", "Risk/Reward Ratio"],
        content="""# Risk Management Strategies

## The Golden Rules
1. Never risk more than 2% of portfolio on a single trade
2. Always use stop losses
3. Diversify across sectors and asset classes

## Key Metrics
- **Sharpe Ratio**: Risk-adjusted returns (higher = better)
- **Beta**: Volatility relative to market
- **VaR (Value at Risk)**: Maximum expected loss at a confidence level
- **Max Drawdown**: Largest peak-to-trough decline

## Portfolio Diversification
- Spread investments across different sectors
- Include different asset classes (stocks, bonds, commodities)
- Consider geographic diversification
- Monitor correlation between holdings
""",
    ),
    LearningModule(
        id="ai-trading-01",
        title="AI in Trading",
        description="How machine learning and AI are revolutionizing financial markets.",
        category="advanced",
        duration_minutes=30,
        topics=["ML Models in Finance", "Sentiment Analysis", "Algorithmic Trading", "LSTM Networks"],
        content="""# AI in Trading

## Machine Learning in Finance
- **Supervised Learning**: Predict future prices from historical data
- **NLP**: Analyze news sentiment for market signals
- **Reinforcement Learning**: Optimize trading strategies

## LSTM for Stock Prediction
Long Short-Term Memory networks capture long-term dependencies in time-series data.
- Input: 60-day windows of OHLCV + technical indicators
- Output: Predicted next-day close price
- Key advantage: Handles sequential patterns in market data

## Sentiment Analysis
- FinBERT analyzes financial news for positive/negative/neutral sentiment
- High-impact news can move markets significantly
- Combining sentiment with technical analysis improves predictions

## Limitations
- Markets are inherently unpredictable
- Past performance doesn't guarantee future results
- AI models can overfit to historical patterns
- Always combine AI insights with your own research
""",
    ),
    LearningModule(
        id="web3-01",
        title="Web3 & DeFi Basics",
        description="Introduction to blockchain, wallets, and decentralized finance.",
        category="beginner",
        duration_minutes=20,
        topics=["Blockchain Basics", "Crypto Wallets", "DeFi Protocols", "Smart Contracts"],
        content="""# Web3 & DeFi Basics

## Blockchain Fundamentals
- Decentralized, immutable ledger
- Consensus mechanisms (PoW, PoS)
- Smart contracts: self-executing code on blockchain

## Wallets
- **MetaMask**: Popular browser wallet for Ethereum
- **Hardware Wallets**: Ledger, Trezor for cold storage
- **Seed Phrase**: Never share your 12/24-word recovery phrase

## DeFi (Decentralized Finance)
- Lending/Borrowing (Aave, Compound)
- Decentralized Exchanges (Uniswap, SushiSwap)
- Yield Farming and Liquidity Pools
- Risks: Smart contract bugs, impermanent loss, rug pulls
""",
    ),
]


@router.get("/modules", response_model=List[LearningModule])
async def get_modules(category: Optional[str] = None):
    """Get all available learning modules, optionally filtered by category."""
    modules = MODULES if not category else [m for m in MODULES if m.category == category]
    # Return without full content for listing (saves bandwidth)
    return [
        LearningModule(**{**m.model_dump(), "content": None})
        for m in modules
    ]


@router.get("/modules/{module_id}", response_model=LearningModule)
async def get_module(module_id: str):
    """Get a specific learning module with full content."""
    for m in MODULES:
        if m.id == module_id:
            return m
    raise HTTPException(status_code=404, detail="Module not found")


@router.post("/modules/{module_id}/progress", response_model=ModuleProgress)
async def update_progress(
    module_id: str,
    progress_percent: float = 100.0,
    user: User = Depends(get_current_user),
):
    """Track user progress on a learning module."""
    # Validate module exists
    module_exists = any(m.id == module_id for m in MODULES)
    if not module_exists:
        raise HTTPException(status_code=404, detail="Module not found")

    redis = get_redis()
    key = f"learn:progress:{user.id}:{module_id}"

    progress_data = {
        "module_id": module_id,
        "progress_percent": min(progress_percent, 100.0),
        "completed": progress_percent >= 100.0,
        "last_accessed": datetime.now(timezone.utc).isoformat(),
    }

    await redis.set(key, json.dumps(progress_data))

    return ModuleProgress(**progress_data)


@router.get("/progress", response_model=List[ModuleProgress])
async def get_all_progress(user: User = Depends(get_current_user)):
    """Get progress for all modules for the current user."""
    redis = get_redis()
    progress_list = []

    for module in MODULES:
        key = f"learn:progress:{user.id}:{module.id}"
        data = await redis.get(key)
        if data:
            progress_list.append(ModuleProgress(**json.loads(data)))
        else:
            progress_list.append(ModuleProgress(
                module_id=module.id,
                completed=False,
                progress_percent=0.0,
            ))

    return progress_list
