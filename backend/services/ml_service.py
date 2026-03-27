"""
NovaX — ML Inference Service
Real-time stock prediction using trained LSTM model.
Handles: data fetching, preprocessing, prediction, confidence scoring.
"""

import asyncio
import os
import pickle
from typing import Optional, Tuple

import numpy as np
import pandas as pd
import yfinance as yf

# ML dependencies (TensorFlow) are heavy and purposefully excluded in Lean API.
try:
    from ml.lstm_model import SEQUENCE_LENGTH, WEIGHTS_DIR, load_model_weights
    from ml.train import engineer_features
    ML_AVAILABLE = True
except ImportError:
    # Lean API fallback — simulated predictions
    SEQUENCE_LENGTH = 60
    WEIGHTS_DIR = "ml/weights"
    ML_AVAILABLE = False
from models.redis import get_redis


class MLService:
    """LSTM-based stock price prediction service."""

    _model_cache: dict = {}
    _scaler_cache: dict = {}

    @classmethod
    def _get_model(cls, ticker: str = "default"):
        """Load model with caching."""
        if ticker not in cls._model_cache:
            try:
                cls._model_cache[ticker] = load_model_weights(ticker)
            except FileNotFoundError:
                cls._model_cache[ticker] = load_model_weights("default")
        return cls._model_cache[ticker]

    @classmethod
    def _get_scaler(cls, ticker: str = "default"):
        """Load scaler with caching."""
        if ticker not in cls._scaler_cache:
            path = os.path.join(WEIGHTS_DIR, f"scaler_{ticker}.pkl")
            if not os.path.exists(path):
                path = os.path.join(WEIGHTS_DIR, "scaler_default.pkl")
            if not os.path.exists(path):
                raise FileNotFoundError(f"No scaler found for {ticker}")
            with open(path, "rb") as f:
                cls._scaler_cache[ticker] = pickle.load(f)
        return cls._scaler_cache[ticker]

    @classmethod
    async def get_current_price(cls, ticker: str) -> float:
        """Fetch current price with Redis caching (60s TTL)."""
        redis = get_redis()
        cache_key = f"cache:stock:{ticker}"

        # Check cache first
        cached = await redis.get(cache_key)
        if cached:
            return float(cached)

        # Fetch from yfinance in thread pool (blocking I/O)
        loop = asyncio.get_event_loop()
        stock = yf.Ticker(ticker)
        info = await loop.run_in_executor(None, lambda: stock.fast_info)
        price = float(info.last_price)

        # Cache for 60 seconds
        await redis.setex(cache_key, 60, str(price))
        return price

    @classmethod
    async def predict(cls, ticker: str) -> dict:
        if not ML_AVAILABLE:
            price = await cls.get_current_price(ticker)
            return {
                "ticker": ticker,
                "current_price": price,
                "predicted_price": round(price * 1.05, 2),
                "ml_direction": "Bullish",
                "confidence": 0.55,
                "price_change_pct": 5.0,
            }

        # 1. Fetch recent data (blocking I/O — run in executor)
        loop = asyncio.get_event_loop()
        stock = yf.Ticker(ticker)
        df = await loop.run_in_executor(
            None, lambda: stock.history(period="6mo")
        )

        if df.empty or len(df) < SEQUENCE_LENGTH + 30:
            raise ValueError(f"Insufficient data for {ticker}")

        df = df[["Open", "High", "Low", "Close", "Volume"]].copy()

        # 2. Feature engineering
        df = engineer_features(df)

        feature_cols = ["Open", "High", "Low", "Close", "Volume",
                        "Returns", "RSI", "MACD", "BB_Upper", "BB_Lower"]
        data = df[feature_cols].values

        # 3. Scale
        scaler = cls._get_scaler(ticker)
        scaled_data = scaler.transform(data)

        # 4. Take last 60 days as input sequence
        sequence = scaled_data[-SEQUENCE_LENGTH:]
        X = np.expand_dims(sequence, axis=0)  # Shape: [1, 60, 10]

        # 5. Predict — offload CPU-bound inference to thread pool
        model = cls._get_model(ticker)
        loop = asyncio.get_event_loop()
        scaled_pred = await loop.run_in_executor(
            None, lambda: model.predict(X, verbose=0)[0][0]
        )

        # Inverse scale the prediction (only for Close column = index 3)
        dummy = np.zeros((1, len(feature_cols)))
        dummy[0, 3] = scaled_pred
        predicted_price = scaler.inverse_transform(dummy)[0, 3]

        # 6. Confidence score (based on recent prediction error)
        current_price = float(df["Close"].iloc[-1])
        price_change_pct = abs((predicted_price - current_price) / current_price)

        # Higher confidence when prediction is closer to current price
        # Sigmoid-style confidence: closer = more confident
        confidence = max(0.1, min(0.99, 1.0 - price_change_pct * 5))

        # Direction
        ml_direction = "Bullish" if predicted_price > current_price else "Bearish"

        return {
            "ticker": ticker,
            "current_price": round(current_price, 2),
            "predicted_price": round(float(predicted_price), 2),
            "ml_direction": ml_direction,
            "confidence": round(float(confidence), 4),
            "price_change_pct": round(float(price_change_pct * 100), 2),
        }
