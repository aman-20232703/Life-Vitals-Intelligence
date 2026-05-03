from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Feedback(Base):
    __tablename__ = "feedbacks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    
    overall_rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    ease_of_use: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    features_used: Mapped[str] = mapped_column(Text, nullable=False)
    comments: Mapped[str] = mapped_column(Text, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    user = relationship("User")


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    user = relationship("User")


class Experience(Base):
    __tablename__ = "experiences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    
    country_visited: Mapped[str] = mapped_column(String(100), nullable=False)
    visit_duration: Mapped[int] = mapped_column(Integer, nullable=False)  # days
    
    healthcare: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    nutrition: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    environment: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    safety: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    education: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    physical_activity: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    overall_experience: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    
    comments: Mapped[str] = mapped_column(Text, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    user = relationship("User")
