"""
NovaX — Portfolio Analysis Service
Calculates allocation, P&L, risk metrics (Beta, Sharpe, VaR), and diversification.
"""

import asyncio
from typing import List, Dict
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import yfinance as yf

from services.ml_service import MLService


class PortfolioService:
    """Portfolio analysis and risk calculation engine."""

    @classmethod
    async def analyze_portfolio(
        cls,
        holdings: List[dict],
    ) -> dict:
        """
        Full portfolio analysis:
        1. Fetch current prices via yfinance (with Redis cache)
        2. Calculate P&L per holding + overall
        3. Calculate allocation % per stock/sector
        4. Risk metrics: Beta, Sharpe, VaR, Herfindahl
        """
        if not holdings:
            return {
                "total_value": 0,
                "total_invested": 0,
                "total_pnl": 0,
                "total_pnl_percent": 0,
                "holdings": [],
                "risk_metrics": {
                    "beta": 0, "sharpe_ratio": 0,
                    "value_at_risk_95": 0, "herfindahl_index": 0,
                    "max_drawdown": 0,
                },
                "sector_allocation": {},
            }

        tickers = [h["ticker"] for h in holdings]

        # Fetch all prices concurrently instead of sequentially
        async def _fetch_price(ticker: str):
            try:
                return ticker, await MLService.get_current_price(ticker)
            except Exception:
                return ticker, 0.0

        price_results = await asyncio.gather(*[_fetch_price(t) for t in tickers])
        prices = dict(price_results)

        # Calculate holdings analysis
        total_value = 0
        total_invested = 0
        analyzed_holdings = []
        sector_values: Dict[str, float] = {}

        for h in holdings:
            ticker = h["ticker"]
            qty = float(h["quantity"])
            avg_price = float(h["avg_buy_price"])
            current_price = prices.get(ticker, avg_price)
            sector = h.get("sector", "Unknown")

            market_value = qty * current_price
            invested = qty * avg_price
            pnl = market_value - invested
            pnl_pct = ((current_price - avg_price) / avg_price * 100) if avg_price else 0

            total_value += market_value
            total_invested += invested

            sector_values[sector] = sector_values.get(sector, 0) + market_value

            analyzed_holdings.append({
                "ticker": ticker,
                "quantity": qty,
                "avg_buy_price": round(avg_price, 2),
                "current_price": round(current_price, 2),
                "market_value": round(market_value, 2),
                "pnl": round(pnl, 2),
                "pnl_percent": round(pnl_pct, 2),
                "allocation_percent": 0,  # Calculated below
                "sector": sector,
            })

        # Calculate allocation percentages
        for h in analyzed_holdings:
            h["allocation_percent"] = round(
                (h["market_value"] / total_value * 100) if total_value else 0, 2
            )

        # Sector allocation
        sector_allocation = {
            sector: round(value / total_value * 100, 2) if total_value else 0
            for sector, value in sector_values.items()
        }

        # Risk metrics
        risk_metrics = await cls._calculate_risk_metrics(tickers, holdings, total_value)

        total_pnl = total_value - total_invested
        total_pnl_pct = (total_pnl / total_invested * 100) if total_invested else 0

        return {
            "total_value": round(total_value, 2),
            "total_invested": round(total_invested, 2),
            "total_pnl": round(total_pnl, 2),
            "total_pnl_percent": round(total_pnl_pct, 2),
            "holdings": analyzed_holdings,
            "risk_metrics": risk_metrics,
            "sector_allocation": sector_allocation,
        }

    @classmethod
    async def _calculate_risk_metrics(
        cls, tickers: List[str], holdings: List[dict], total_value: float
    ) -> dict:
        """
        Calculate portfolio risk metrics:
        - Beta: covariance with SPY
        - Sharpe Ratio: (Rp - Rf) / σp
        - VaR 95%: 5th percentile of portfolio returns
        - Herfindahl Index: concentration measure
        - Max Drawdown: largest peak-to-trough decline
        """
        try:
            # Fetch 1yr daily returns for all tickers + SPY benchmark — 15s timeout
            all_tickers = list(set(tickers + ["SPY"]))
            end_date = datetime.now()
            start_date = end_date - timedelta(days=365)

            loop = asyncio.get_event_loop()
            data = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    lambda: yf.download(
                        all_tickers,
                        start=start_date.strftime("%Y-%m-%d"),
                        end=end_date.strftime("%Y-%m-%d"),
                        progress=False,
                    ),
                ),
                timeout=15.0,
            )

            if data.empty:
                raise ValueError("No price data available")

            close_prices = data["Close"] if "Close" in data.columns else data
            returns = close_prices.pct_change().dropna()

            # Portfolio weights
            weights = []
            valid_tickers = []
            for h in holdings:
                ticker = h["ticker"]
                if ticker in returns.columns:
                    qty = float(h["quantity"])
                    price = float(close_prices[ticker].iloc[-1])
                    weights.append(qty * price)
                    valid_tickers.append(ticker)

            if not valid_tickers:
                raise ValueError("No valid tickers for risk calculation")

            total = sum(weights)
            weights = np.array([w / total for w in weights])

            portfolio_returns = (returns[valid_tickers] * weights).sum(axis=1)
            spy_returns = returns["SPY"] if "SPY" in returns.columns else portfolio_returns

            # Beta
            cov_matrix = np.cov(portfolio_returns, spy_returns)
            beta = cov_matrix[0, 1] / cov_matrix[1, 1] if cov_matrix[1, 1] != 0 else 1.0

            # Sharpe Ratio (risk-free rate ~4.5% annual)
            risk_free_daily = 0.045 / 252
            excess_returns = portfolio_returns - risk_free_daily
            sharpe = (excess_returns.mean() / excess_returns.std() * np.sqrt(252)
                      if excess_returns.std() != 0 else 0)

            # VaR at 95% confidence
            var_95 = float(np.percentile(portfolio_returns, 5)) * total_value

            # Herfindahl Index (concentration)
            herfindahl = float(np.sum(weights ** 2))

            # Max Drawdown
            cumulative = (1 + portfolio_returns).cumprod()
            peak = cumulative.expanding().max()
            drawdown = (cumulative - peak) / peak
            max_drawdown = float(drawdown.min())

            return {
                "beta": round(float(beta), 4),
                "sharpe_ratio": round(float(sharpe), 4),
                "value_at_risk_95": round(float(var_95), 2),
                "herfindahl_index": round(herfindahl, 4),
                "max_drawdown": round(max_drawdown * 100, 2),
            }

        except Exception as e:
            print(f"  ⚠️ Risk calculation error: {e}")
            return {
                "beta": 0.0,
                "sharpe_ratio": 0.0,
                "value_at_risk_95": 0.0,
                "herfindahl_index": 0.0,
                "max_drawdown": 0.0,
            }
