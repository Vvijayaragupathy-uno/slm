import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from pathlib import Path

# Use SQLite by default for development
DEFAULT_DB_URL = "sqlite:///./aiccore.db"
DATABASE_URL = os.getenv("AICCORE_DATABASE_URL", DEFAULT_DB_URL)

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

def init_db():
    from .models import Base
    Base.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
