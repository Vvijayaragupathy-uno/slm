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
    from .models import Base, Challenge
    Base.metadata.create_all(engine)
    
    # Populate default challenges if none exist (Google Standard Onboarding)
    with Session(engine) as session:
        from sqlalchemy import select
        stmt = select(Challenge)
        if not session.execute(stmt).scalars().first():
            challenges = [
                Challenge(
                    title="Travel Guide Bot", 
                    description="Build an agent that helps tourists find secret spots in Paris.",
                    complexity_level="Beginner"
                ),
                Challenge(
                    title="Creative Storyteller", 
                    description="Create an AI that writes spooky mystery stories based on three keywords.",
                    complexity_level="Intermediate"
                ),
                Challenge(
                    title="Smart Math Tutor", 
                    description="Develop an agent that explains complex math problems using simple analogies.",
                    complexity_level="Expert"
                )
            ]
            session.add_all(challenges)
            session.commit()
            print("✅ AICCORE: Default challenges initialized.")

def get_session():
    with Session(engine) as session:
        yield session
