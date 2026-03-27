"""
NovaX Backend — Configuration
Loads all settings from environment variables via Pydantic Settings.
"""

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # --- App ---
    app_name: str = "NovaX"
    debug: bool = False
    cors_origins: List[str] = ["http://localhost:3000"]

    # --- PostgreSQL ---
    database_url: str = "postgresql+asyncpg://novax:novax_secret@localhost:5432/novax_db"

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"

    # --- MongoDB ---
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "novax_news"

    # --- JWT ---
    jwt_secret: str = "change-this-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    @field_validator("jwt_secret")
    @classmethod
    def jwt_secret_must_be_set(cls, v: str) -> str:
        if v == "change-this-in-production":
            raise ValueError(
                "JWT_SECRET must be set in .env — "
                "do not use the default placeholder in any environment."
            )
        return v

    # --- Firebase Admin ---
    firebase_project_id: str = ""
    firebase_client_email: str = ""
    firebase_private_key: str = ""

    # --- Gemini AI ---
    gemini_api_key: str = ""

    # --- NewsAPI ---
    news_api_key: str = ""

    # --- Sentry ---
    sentry_dsn: str = ""

    # --- Celery ---
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
