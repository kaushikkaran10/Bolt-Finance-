"""
NovaX — LSTM Model Architecture
Two-layer LSTM for stock price prediction.
Input: [60, 10] → LSTM(128) → Dropout → LSTM(64) → Dropout → Dense(32) → Dense(1)
"""

import os

import numpy as np

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout, Input
from tensorflow.keras.optimizers import Adam


# Feature columns: OHLCV + 5 technical indicators = 10 features
SEQUENCE_LENGTH = 60
NUM_FEATURES = 10
FEATURE_NAMES = [
    "Open", "High", "Low", "Close", "Volume",
    "Returns", "RSI", "MACD", "BB_Upper", "BB_Lower"
]

WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "weights")


def build_lstm_model(
    sequence_length: int = SEQUENCE_LENGTH,
    num_features: int = NUM_FEATURES,
    learning_rate: float = 0.001,
) -> Sequential:
    """
    Build the LSTM model as specified in architecture:
    Input [60, 10] → LSTM(128, return_sequences) → Dropout(0.2)
                    → LSTM(64) → Dropout(0.2)
                    → Dense(32, ReLU) → Dense(1)
    """
    model = Sequential([
        Input(shape=(sequence_length, num_features)),
        LSTM(128, return_sequences=True),
        Dropout(0.2),
        LSTM(64, return_sequences=False),
        Dropout(0.2),
        Dense(32, activation="relu"),
        Dense(1),  # Predicted Close Price
    ])

    model.compile(
        optimizer=Adam(learning_rate=learning_rate),
        loss="mse",
        metrics=["mae"],
    )

    return model


def save_model_weights(model: Sequential, ticker: str = "default"):
    """Save model weights to disk."""
    os.makedirs(WEIGHTS_DIR, exist_ok=True)
    path = os.path.join(WEIGHTS_DIR, f"lstm_{ticker}.h5")
    model.save(path)
    print(f"  💾 Model saved: {path}")
    return path


def load_model_weights(ticker: str = "default") -> Sequential:
    """Load a trained model from disk."""
    path = os.path.join(WEIGHTS_DIR, f"lstm_{ticker}.h5")
    if not os.path.exists(path):
        # Try the default model
        path = os.path.join(WEIGHTS_DIR, "lstm_default.h5")
        if not os.path.exists(path):
            raise FileNotFoundError(f"No trained model found for ticker '{ticker}'")
    return load_model(path)
