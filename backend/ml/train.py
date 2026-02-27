"""
NovaX — LSTM Training Script
Fetches 5yr history from yfinance, engineers features, trains LSTM, saves weights.

Usage:
    python -m ml.train --ticker AAPL --epochs 50
"""

import argparse
import os
import pickle

import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.preprocessing import MinMaxScaler

from ml.lstm_model import (
    SEQUENCE_LENGTH,
    NUM_FEATURES,
    WEIGHTS_DIR,
    build_lstm_model,
    save_model_weights,
)


def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Relative Strength Index."""
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def compute_macd(series: pd.Series) -> pd.Series:
    """MACD line (12-day EMA - 26-day EMA)."""
    ema_12 = series.ewm(span=12, adjust=False).mean()
    ema_26 = series.ewm(span=26, adjust=False).mean()
    return ema_12 - ema_26


def compute_bollinger_bands(series: pd.Series, period: int = 20):
    """Bollinger Bands (upper, lower)."""
    sma = series.rolling(window=period).mean()
    std = series.rolling(window=period).std()
    upper = sma + (std * 2)
    lower = sma - (std * 2)
    return upper, lower


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add technical indicators to OHLCV data.
    Produces 10 feature columns: Open, High, Low, Close, Volume,
    Returns, RSI, MACD, BB_Upper, BB_Lower
    """
    df = df.copy()
    df["Returns"] = df["Close"].pct_change()
    df["RSI"] = compute_rsi(df["Close"])
    df["MACD"] = compute_macd(df["Close"])
    df["BB_Upper"], df["BB_Lower"] = compute_bollinger_bands(df["Close"])

    # Drop NaN rows from indicator warmup
    df.dropna(inplace=True)
    return df


def create_sequences(data: np.ndarray, seq_length: int = SEQUENCE_LENGTH):
    """Create sliding window sequences for LSTM input."""
    X, y = [], []
    for i in range(seq_length, len(data)):
        X.append(data[i - seq_length : i])
        y.append(data[i, 3])  # Index 3 = Close price (scaled)
    return np.array(X), np.array(y)


def train_model(ticker: str = "AAPL", epochs: int = 50, batch_size: int = 32):
    """
    Full training pipeline:
    1. Fetch 5yr history from yfinance
    2. Engineer features (Returns, RSI, MACD, Bollinger)
    3. Scale with MinMaxScaler
    4. Create 60-day sliding windows
    5. Train LSTM for N epochs
    6. Save weights + scaler
    """
    print(f"\n🚀 Training LSTM model for {ticker}...")

    # 1. Fetch data
    print(f"  📊 Fetching 5yr history for {ticker}...")
    stock = yf.Ticker(ticker)
    df = stock.history(period="5y")

    if df.empty:
        raise ValueError(f"No data found for ticker {ticker}")

    # Keep OHLCV columns
    df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
    print(f"  📊 Got {len(df)} rows of data")

    # 2. Feature engineering
    print("  🔧 Engineering features...")
    df = engineer_features(df)

    feature_cols = ["Open", "High", "Low", "Close", "Volume",
                    "Returns", "RSI", "MACD", "BB_Upper", "BB_Lower"]
    data = df[feature_cols].values

    # 3. Scale data
    print("  📏 Scaling data with MinMaxScaler...")
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(data)

    # 4. Create sequences
    print(f"  🧩 Creating {SEQUENCE_LENGTH}-day sequences...")
    X, y = create_sequences(scaled_data, SEQUENCE_LENGTH)

    # Train/test split (80/20)
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    print(f"  📈 Train: {len(X_train)} samples | Test: {len(X_test)} samples")

    # 5. Build and train
    print(f"  🧠 Building LSTM model...")
    model = build_lstm_model()

    print(f"  🏋️ Training for {epochs} epochs...")
    history = model.fit(
        X_train, y_train,
        epochs=epochs,
        batch_size=batch_size,
        validation_data=(X_test, y_test),
        verbose=1,
    )

    # Evaluate
    test_loss, test_mae = model.evaluate(X_test, y_test, verbose=0)
    print(f"  ✅ Test Loss (MSE): {test_loss:.6f}")
    print(f"  ✅ Test MAE: {test_mae:.6f}")

    # 6. Save model + scaler
    save_model_weights(model, ticker)

    os.makedirs(WEIGHTS_DIR, exist_ok=True)
    scaler_path = os.path.join(WEIGHTS_DIR, f"scaler_{ticker}.pkl")
    with open(scaler_path, "wb") as f:
        pickle.dump(scaler, f)
    print(f"  💾 Scaler saved: {scaler_path}")

    print(f"\n✅ Training complete for {ticker}!")
    return model, scaler, history


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train LSTM Stock Predictor")
    parser.add_argument("--ticker", type=str, default="AAPL", help="Stock ticker symbol")
    parser.add_argument("--epochs", type=int, default=50, help="Training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    args = parser.parse_args()

    train_model(ticker=args.ticker, epochs=args.epochs, batch_size=args.batch_size)
