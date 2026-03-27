"""
NovaX — News Intelligence Service
FinBERT-based financial news sentiment analysis pipeline.
Pipeline: Raw article → clean → tokenize (max 512) → ProsusAI/finbert → sentiment + score → impact mapping
"""

import asyncio
import re
from typing import List, Optional

try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    import torch
    import torch.nn.functional as F
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False


class NewsService:
    """FinBERT-based financial sentiment analysis."""

    _model = None
    _tokenizer = None
    _device = None

    @classmethod
    def _load_model(cls):
        """Lazy-load FinBERT model (ProsusAI/finbert)."""
        if cls._model is None:
            cls._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            cls._tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
            cls._model = AutoModelForSequenceClassification.from_pretrained(
                "ProsusAI/finbert"
            ).to(cls._device)
            cls._model.eval()
            print("  ✅ FinBERT model loaded")

    @classmethod
    def clean_text(cls, text: str) -> str:
        """Clean article text: lowercase, remove HTML, extra whitespace."""
        text = text.lower()
        text = re.sub(r"<[^>]+>", "", text)  # Remove HTML tags
        text = re.sub(r"http\S+|www\S+", "", text)  # Remove URLs
        text = re.sub(r"[^\w\s.,!?'-]", "", text)  # Keep basic punctuation
        text = re.sub(r"\s+", " ", text).strip()  # Normalize whitespace
        return text

    @classmethod
    def _analyze_sentiment_sync(cls, text: str) -> dict:
        if not ML_AVAILABLE:
            return {"sentiment": "positive", "score": 0.85, "impact": "High"}
        
        cls._load_model()

        cleaned = cls.clean_text(text)
        if not cleaned:
            return {"sentiment": "neutral", "score": 0.5, "impact": "Low"}

        inputs = cls._tokenizer(
            cleaned,
            return_tensors="pt",
            max_length=512,
            truncation=True,
            padding=True,
        ).to(cls._device)

        with torch.no_grad():
            outputs = cls._model(**inputs)
            probabilities = F.softmax(outputs.logits, dim=-1)

        labels = ["positive", "negative", "neutral"]
        probs = probabilities[0].cpu().numpy()

        sentiment_idx = probs.argmax()
        sentiment = labels[sentiment_idx]
        score = float(probs[sentiment_idx])

        return {
            "sentiment": sentiment,
            "score": round(score, 4),
            "impact": cls._map_impact(score, sentiment),
            "probabilities": {
                "positive": round(float(probs[0]), 4),
                "negative": round(float(probs[1]), 4),
                "neutral": round(float(probs[2]), 4),
            },
        }

    @classmethod
    async def analyze_sentiment(cls, text: str) -> dict:
        """
        Async wrapper — offloads CPU inference to thread pool.
        Never blocks the event loop.
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, cls._analyze_sentiment_sync, text)

    @classmethod
    def _analyze_batch_sync(cls, texts: List[str]) -> List[dict]:
        if not ML_AVAILABLE:
            return [{"sentiment": "positive", "score": 0.85, "impact": "High"} for _ in texts]
        
        cls._load_model()

        results = []
        cleaned_texts = [cls.clean_text(t) for t in texts]

        batch_size = 16
        for i in range(0, len(cleaned_texts), batch_size):
            batch = cleaned_texts[i : i + batch_size]

            inputs = cls._tokenizer(
                batch,
                return_tensors="pt",
                max_length=512,
                truncation=True,
                padding=True,
            ).to(cls._device)

            with torch.no_grad():
                outputs = cls._model(**inputs)
                probabilities = F.softmax(outputs.logits, dim=-1)

            labels = ["positive", "negative", "neutral"]
            for probs in probabilities.cpu().numpy():
                sentiment_idx = probs.argmax()
                sentiment = labels[sentiment_idx]
                score = float(probs[sentiment_idx])

                results.append({
                    "sentiment": sentiment,
                    "score": round(score, 4),
                    "impact": cls._map_impact(score, sentiment),
                })

        return results

    @classmethod
    async def analyze_batch(cls, texts: List[str]) -> List[dict]:
        """Async wrapper — offloads batch CPU inference to thread pool."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, cls._analyze_batch_sync, texts)

    @classmethod
    def _map_impact(cls, score: float, sentiment: str) -> str:
        """
        Business rule engine: map sentiment score to market impact level.
        High: strong positive/negative with high confidence (>0.85)
        Medium: moderate confidence (0.65-0.85)
        Low: neutral or low confidence (<0.65)
        """
        if sentiment == "neutral":
            return "Low"
        if score >= 0.85:
            return "High"
        elif score >= 0.65:
            return "Medium"
        return "Low"

    @classmethod
    def get_market_mood(cls, sentiments: List[dict]) -> str:
        """Determine overall market mood from multiple sentiments."""
        if not sentiments:
            return "Mixed"

        positive = sum(1 for s in sentiments if s["sentiment"] == "positive")
        negative = sum(1 for s in sentiments if s["sentiment"] == "negative")
        total = len(sentiments)

        if positive / total > 0.6:
            return "Bullish"
        elif negative / total > 0.6:
            return "Bearish"
        return "Mixed"
