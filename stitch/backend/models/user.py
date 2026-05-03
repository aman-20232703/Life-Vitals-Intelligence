from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(30), nullable=False)
    country: Mapped[str] = mapped_column(String(80), nullable=False)

    height_cm: Mapped[int] = mapped_column(Integer, nullable=False)
    weight_kg: Mapped[int] = mapped_column(Integer, nullable=False)
    smoking_status: Mapped[str] = mapped_column(String(40), nullable=False)
    alcohol_consumption: Mapped[str] = mapped_column(String(40), nullable=False)
    physical_activity: Mapped[str] = mapped_column(String(40), nullable=False)

    education_level: Mapped[str] = mapped_column(String(80), nullable=False)
    occupation: Mapped[str] = mapped_column(String(120), nullable=False)
    income_range: Mapped[str] = mapped_column(String(80), nullable=False)
    user_role: Mapped[str] = mapped_column(String(80), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")
