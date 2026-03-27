"""
NovaX — User Model (SQLAlchemy)
Stores user accounts for email/password and Web3 wallet auth.
"""

from typing import Optional

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models import Base


class User(Base):
    __tablename__ = "users"

    email: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    wallet_address: Mapped[Optional[str]] = mapped_column(
        String(42), unique=True, index=True, nullable=True
    )
    firebase_uid: Mapped[Optional[str]] = mapped_column(
        String(128), unique=True, index=True, nullable=True
    )
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)

    # Relationships
    holdings = relationship("Holding", back_populates="user", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username})>"
