"""
NovaX — Chat Schemas (Pydantic)
Request/response models for the AI chat service.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class ChatHistoryItem(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    sources: Optional[List[str]] = None  # Referenced tickers, articles
