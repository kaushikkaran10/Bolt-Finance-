"""
NovaX — SQLAlchemy Database Setup
Async PostgreSQL engine + session factory.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Convention for Alembic auto-generate
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=convention)

    id: Mapped[str] = mapped_column(
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )


async def get_db() -> AsyncSession:
    """Dependency: yields an async DB session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables on startup."""
    try:
        async with engine.begin() as conn:
            from models.user import User  # noqa: F401
            from models.portfolio import Holding  # noqa: F401
            from models.prediction import Prediction  # noqa: F401

            await conn.run_sync(Base.metadata.create_all)
        print("  ✅ PostgreSQL tables initialized")
    except Exception as e:
        print(f"  ⚠️ PostgreSQL connection failed: {e}")
        print("  → Continuing without database (non-critical for health check)")


async def close_db():
    """Dispose engine on shutdown."""
    await engine.dispose()
    print("  🛑 PostgreSQL connection closed")
