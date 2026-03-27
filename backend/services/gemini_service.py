"""
NovaX — Gemini AI Service
Wrapper for Google Gemini 1.5 Flash API with streaming support.
Builds context-aware system prompts for financial advisory.
"""

import json
from typing import AsyncGenerator, Optional

import google.generativeai as genai

from config import get_settings
from models.redis import get_redis

settings = get_settings()

# System prompt template
SYSTEM_PROMPT_TEMPLATE = """You are FinAI, the NovaX AI Financial Advisor — an expert quant analyst and portfolio strategist.

User Portfolio: {portfolio_summary}
Recent market sentiment: {news_summary}
User's prediction accuracy: {accuracy}%

Your style:
- Sharp, direct, data-driven. No fluff.
- Reference real concepts: Sharpe ratio, Beta, RSI, MACD, DeFi yields, options Greeks.
- Give balanced bull/bear analysis with specific price targets.
- Always add a brief risk disclaimer for trade ideas.
- Use markdown bold for key numbers and terms.
- Keep responses concise (3-5 sentences or a short bullet list)."""


class GeminiService:
    """Gemini 1.5 Flash API wrapper with streaming and context building."""

    _model = None

    @classmethod
    def _init_model(cls):
        """Initialize Gemini model."""
        if cls._model is None:
            genai.configure(api_key=settings.gemini_api_key)
            cls._model = genai.GenerativeModel(
                "gemini-1.5-flash",
                generation_config=genai.GenerationConfig(
                    temperature=0.75,
                    top_p=0.92,
                    top_k=40,
                    max_output_tokens=1024,
                ),
            )
            print("  ✅ Gemini 2.0 Flash initialized")

    @classmethod
    def build_system_prompt(
        cls,
        portfolio_summary: str = "No portfolio data",
        news_summary: str = "No recent news data",
        accuracy: float = 0.0,
    ) -> str:
        """Build the context-rich system prompt."""
        return SYSTEM_PROMPT_TEMPLATE.format(
            portfolio_summary=portfolio_summary,
            news_summary=news_summary,
            accuracy=round(accuracy, 1),
        )

    @classmethod
    async def get_conversation_history(cls, user_id: str) -> list:
        """Fetch conversation history from Redis (TTL: 24h)."""
        redis = get_redis()
        history_raw = await redis.get(f"chat:context:{user_id}")
        if history_raw:
            return json.loads(history_raw)
        return []

    @classmethod
    async def save_conversation_history(cls, user_id: str, history: list):
        """Save conversation history to Redis (TTL: 24h)."""
        redis = get_redis()
        await redis.setex(
            f"chat:context:{user_id}",
            86400,  # 24 hours
            json.dumps(history),
        )

    @classmethod
    async def chat(
        cls,
        user_message: str,
        user_id: str,
        portfolio_summary: str = "No portfolio data",
        news_summary: str = "No recent news data",
        accuracy: float = 0.0,
    ) -> str:
        """
        Non-streaming chat completion.
        Builds context → sends to Gemini → saves history → returns response.
        """
        if not settings.gemini_api_key or settings.gemini_api_key == "your-gemini-api-key":
            if "strict JSON object" in user_message:
                import re
                ticker_match = re.search(r'ticker:\s*([A-Z]+)', user_message)
                ticker = ticker_match.group(1) if ticker_match else "STOCK"
                price_match = re.search(r'price is \$([0-9.]+)', user_message)
                price = float(price_match.group(1)) if price_match else 150.0
                target = f"${(price * 1.05):.2f}"
                return f'{{"direction": "Bullish", "target": "{target}", "conf": 88}}'
            return "Demo mode is active. Please configure the GEMINI_API_KEY in the .env file to interact with the AI advisor."

        cls._init_model()

        # Get conversation history
        history = await cls.get_conversation_history(user_id)

        # Build system prompt
        system_prompt = cls.build_system_prompt(portfolio_summary, news_summary, accuracy)

        # Build messages for history
        messages = []
        for msg in history[-10:]:
            messages.append({
                "role": "user" if msg["role"] == "user" else "model",
                "parts": [msg["content"]],
            })

        # Inject context into current message to avoid breaking history role alternation
        enriched_message = f"[{system_prompt}]\n\nUser: {user_message}"

        # Generate response asynchronously
        chat_session = cls._model.start_chat(history=messages)
        response = await chat_session.send_message_async(enriched_message)
        response_text = response.text

        # Save to history (save the original short message, not the enriched one)
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": response_text})
        await cls.save_conversation_history(user_id, history)

        return response_text

    @classmethod
    async def stream_chat(
        cls,
        user_message: str,
        user_id: str,
        portfolio_summary: str = "No portfolio data",
        news_summary: str = "No recent news data",
        accuracy: float = 0.0,
    ) -> AsyncGenerator[str, None]:
        """
        Streaming chat completion for SSE.
        Yields tokens one by one for Server-Sent Events.
        """
        if not settings.gemini_api_key or settings.gemini_api_key == "your-gemini-api-key":
            import asyncio
            msg = "Demo mode is active. Please configure the GEMINI_API_KEY in the .env file to interact with the AI advisor."
            for chunk in msg.split(" "):
                yield chunk + " "
                await asyncio.sleep(0.05)
            return

        cls._init_model()

        history = await cls.get_conversation_history(user_id)
        system_prompt = cls.build_system_prompt(portfolio_summary, news_summary, accuracy)

        messages = []
        for msg in history[-10:]:
            messages.append({
                "role": "user" if msg["role"] == "user" else "model",
                "parts": [msg["content"]],
            })

        enriched_message = f"[{system_prompt}]\n\nUser: {user_message}"

        chat_session = cls._model.start_chat(history=messages)
        response = await chat_session.send_message_async(enriched_message, stream=True)

        full_response = ""
        async for chunk in response:
            if chunk.text:
                full_response += chunk.text
                yield chunk.text

        # Save history after streaming completes
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": full_response})
        await cls.save_conversation_history(user_id, history)
