from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID, uuid4
from sqlalchemy import Column, String, DateTime, Boolean, JSON, ForeignKey, Integer, Float
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

class Base(DeclarativeBase):
    pass

class Session(Base):
    __tablename__ = "session"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("user.id"), nullable=True)
    nickname: Mapped[str] = mapped_column(String)
    station_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    challenge_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("challenge.id"), nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_submitted: Mapped[bool] = mapped_column(Boolean, default=False)

class Event(Base):
    __tablename__ = "event"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[UUID] = mapped_column(ForeignKey("session.id"))
    sequence_number: Mapped[int] = mapped_column(Integer)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    event_type: Mapped[str] = mapped_column(String)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

class Submission(Base):
    __tablename__ = "submission"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    session_id: Mapped[UUID] = mapped_column(ForeignKey("session.id"))
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    flow_snapshot: Mapped[Dict[str, Any]] = mapped_column(JSON)
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_winner: Mapped[bool] = mapped_column(Boolean, default=False)

class User(Base):
    __tablename__ = "user"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    username: Mapped[str] = mapped_column(String, unique=True)
    nickname: Mapped[str] = mapped_column(String)
    unlock_code: Mapped[str] = mapped_column(String, unique=True, index=True) # 4-digit code
    unlock_code_generated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    honors: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict) # To store earned achievements
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Challenge(Base):
    __tablename__ = "challenge"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    complexity_level: Mapped[str] = mapped_column(String, default="Beginner")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Station(Base):
    __tablename__ = "station"
    
    id: Mapped[str] = mapped_column(String, primary_key=True) # e.g. "STATION_01"
    ip_address: Mapped[str] = mapped_column(String, unique=True)
    status: Mapped[str] = mapped_column(String, default="available") # available, occupied, maintenance
    current_session_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("session.id"), nullable=True)

class Achievement(Base):
    __tablename__ = "achievement"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    icon_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
