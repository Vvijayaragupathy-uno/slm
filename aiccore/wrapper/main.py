import os
import sys
from datetime import datetime
from pathlib import Path

# Add Langflow backend to path to allow imports from langflow
# Since langflow is in a subdirectory, we need to point to its source
project_root = Path(__file__).resolve().parent.parent.parent
langflow_src = project_root / "langflow" / "src" / "backend" / "base"
sys.path.insert(0, str(langflow_src))

# Import Langflow's app creator
from langflow.main import setup_app
from fastapi import Request, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Dict, Any, List

# Import AICCORE backend
from aiccore.backend.database import init_db, get_session
from aiccore.backend.models import Session as AICSession, User, Station
from aiccore.backend.middleware import AICCoreEventMiddleware
from aiccore.backend.eraser import purge_langflow_workspace
from aiccore.backend.broadcast import broadcast_manager
import random
import re

# In-memory storage for unlock rate limiting (Google standard protection)
# { ip: {"attempts": int, "locked_until": datetime} }
FAILED_ATTEMPTS = {}
LOCKOUT_DURATION_SECONDS = 300 # 5 minutes
MAX_ATTEMPTS = 5

def sanitize_string(s: str, length: int = 50) -> str:
    # Remove special chars, allow alphanumeric and underscores
    s = re.sub(r'[^\w\s-]', '', s)
    return s[:length].strip()

def generate_unlock_code():
    return f"{random.randint(0, 9999):04d}"

class UserCreateRequest(BaseModel):
    username: str
    nickname: str

class AdminLoginRequest(BaseModel):
    password: str

class SessionStartRequest(BaseModel):
    nickname: str
    station_id: Optional[str] = None
    challenge_id: Optional[str] = None

class SubmissionRequest(BaseModel):
    session_id: UUID
    flow_snapshot: Dict[str, Any]
    flow_name: Optional[str] = None
    description: Optional[str] = None

class UnlockRequest(BaseModel):
    unlock_code: str
    station_id: Optional[str] = None

class ChallengeRequest(BaseModel):
    title: str
    description: str
    complexity_level: Optional[str] = "Beginner"

class AchievementRequest(BaseModel):
    name: str
    description: str
    icon_url: Optional[str] = None

class StationRegisterRequest(BaseModel):
    id: str
    ip_address: str

def create_aiccore_app():
    """
    Creates the AICCORE application by wrapping the Langflow setup_app.
    This serves as the V1 implementation point for AICCORE logic.
    """
    # Initialize Langflow app
    # AICCORE_BACKEND_ONLY=True avoids errors when frontend files are missing/not built
    backend_only = os.getenv("AICCORE_BACKEND_ONLY", "false").lower() == "true"
    print(f"🚀 Starting Langflow with backend_only={backend_only}")
    app = setup_app(backend_only=backend_only)

    # Enable CORS for the Dashboard
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # For museum LAN, usually safe to allow all
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Initialize AICCORE Database
    print("🔧 Initializing AICCORE Database...")
    init_db()

    # Middleware to allow IFrame embedding for our dashboard
    @app.middleware("http")
    async def allow_iframe_middleware(request: Request, call_next):
        response = await call_next(request)
        # We need to remove these to allow embedding in the arena dashboard
        if "X-Frame-Options" in response.headers:
            del response.headers["X-Frame-Options"]
        # Adjust CSP to allow framing from our own domain/localhost
        csp = response.headers.get("Content-Security-Policy", "")
        if csp:
            # Add frame-ancestors to allow our dashboard
            new_csp = csp + " frame-ancestors 'self' http://localhost:3000 http://localhost:3001 http://127.0.0.1:3000 http://127.0.0.1:3001;"
            response.headers["Content-Security-Policy"] = new_csp
        return response

    @app.get("/api/v1/aiccore/health")
    async def aiccore_health():
        return {"status": "ok", "engine": "aiccore", "wrapper": "v1.0"}

    @app.websocket("/api/v1/aiccore/ws")
    async def websocket_endpoint(websocket: WebSocket):
        from aiccore.backend.broadcast import broadcast_manager
        await broadcast_manager.connect(websocket)
        try:
            while True:
                # Keep connection alive, though we mostly push data
                data = await websocket.receive_text()
                # We could handle commands from dashboard here if needed
        except WebSocketDisconnect:
            broadcast_manager.disconnect(websocket)

    @app.post("/api/v1/aiccore/auth/unlock")
    async def unlock_station(req: UnlockRequest, request: Request):
        from sqlalchemy.orm import Session
        from aiccore.backend.database import engine
        from aiccore.backend.models import User, Station, Session as AICSession
        from sqlalchemy import select
        
        client_ip = request.client.host
        now = datetime.utcnow()
        
        # 0. Rate Limiting Check
        if client_ip in FAILED_ATTEMPTS:
            failed = FAILED_ATTEMPTS[client_ip]
            if failed["locked_until"] and now < failed["locked_until"]:
                wait_time = int((failed["locked_until"] - now).total_seconds())
                raise HTTPException(status_code=429, detail=f"Too many failed attempts. Try again in {wait_time}s")
        
        print(f"🔑 Unlock attempt for code {req.unlock_code} from IP {client_ip}")
        
        with Session(engine) as db_session:
            # 1. Find User by unlock_code
            stmt = select(User).where(User.unlock_code == req.unlock_code)
            user = db_session.execute(stmt).scalars().first()
            
            if not user:
                # Handle failure tracking
                failed = FAILED_ATTEMPTS.get(client_ip, {"attempts": 0, "locked_until": None})
                failed["attempts"] += 1
                if failed["attempts"] >= MAX_ATTEMPTS:
                    from datetime import timedelta
                    failed["locked_until"] = now + timedelta(seconds=LOCKOUT_DURATION_SECONDS)
                    FAILED_ATTEMPTS[client_ip] = failed
                    raise HTTPException(status_code=429, detail="Maximum attempts reached. IP locked for 5 minutes.")
                
                FAILED_ATTEMPTS[client_ip] = failed
                
                # For Phase 1 testing, let's auto-create or reset a user if code is '0000'
                if req.unlock_code == "0000":
                    from sqlalchemy import select
                    stmt = select(User).where(User.username == "testuser")
                    user = db_session.execute(stmt).scalars().first()
                    if user:
                        user.unlock_code = "0000"
                        user.unlock_code_generated_at = datetime.utcnow()
                    else:
                        user = User(username="testuser", nickname="Test Builder", unlock_code="0000", unlock_code_generated_at=datetime.utcnow())
                        db_session.add(user)
                    
                    db_session.commit()
                    db_session.refresh(user)
                else:
                    raise HTTPException(status_code=401, detail=f"Invalid unlock code. {MAX_ATTEMPTS - failed['attempts']} attempts remaining.")
            
            # Reset failures on success
            if client_ip in FAILED_ATTEMPTS:
                del FAILED_ATTEMPTS[client_ip]
            
            # Check for OTP expiration (15 minutes)
            if user.unlock_code_generated_at:
                age_minutes = (datetime.utcnow() - user.unlock_code_generated_at).total_seconds() / 60
                if age_minutes > 15:
                    raise HTTPException(status_code=401, detail="Unlock code has expired")
            
            # 2. Identify Station
            station = None
            if req.station_id:
                station = db_session.get(Station, req.station_id)
            else:
                stmt = select(Station).where(Station.ip_address == client_ip)
                station = db_session.execute(stmt).scalars().first()
            
            # 3. Create Session
            station_id = station.id if station else (req.station_id or "STATION_LOCAL")
            
            # 3.5 Cleanup: Deactivate any other active sessions on THIS station
            from sqlalchemy import update
            db_session.execute(
                update(AICSession)
                .where(AICSession.station_id == station_id, AICSession.is_active == True)
                .values(is_active=False, end_time=datetime.utcnow())
            )

            new_session = AICSession(
                user_id=user.id,
                nickname=user.nickname,
                station_id=station_id,
                challenge_id=None
            )
            db_session.add(new_session)
            db_session.flush() # Get session ID
            
            # 4. Update Station status if found
            if station:
                station.status = "occupied"
                station.current_session_id = new_session.id
                
            # 4.5 Security Hardening: Clear unlock code after use (One-Time Use)
            # We clear it so the same code can't be used again.
            user.unlock_code = "" 
            
            db_session.commit()
            db_session.refresh(new_session)
            
            # 4.6 Broadcast Update: Tell dashboard to refresh leaderboard
            await broadcast_manager.broadcast({"type": "LEADERBOARD_UPDATE", "data": {"session_id": str(new_session.id)}})

            # 5. Purge Langflow Workspace (The Eraser)
            try:
                await purge_langflow_workspace()
            except Exception as e:
                print(f"❌ Failed to purge workspace on unlock: {e}")
                
            # 6. Return Session Info
            response = {
                "session_id": str(new_session.id),
                "nickname": user.nickname,
                "station_id": new_session.station_id
            }
            
            from fastapi.responses import JSONResponse
            res = JSONResponse(content=response)
            res.set_cookie(
                key="aiccore_session_id", 
                value=str(new_session.id), 
                httponly=True, 
                samesite="lax",
                max_age=3600 # 1 hour session
            )
            return res

    @app.get("/api/v1/aiccore/session/{session_id}/status")
    async def get_session_status(session_id: UUID):
        from sqlalchemy.orm import Session
        from aiccore.backend.database import engine
        from aiccore.backend.models import Session as AICSession
        
        with Session(engine) as db_session:
            session = db_session.get(AICSession, session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            return {"is_submitted": session.is_submitted}

    @app.post("/api/v1/aiccore/session/{session_id}/deactivate")
    async def deactivate_session(session_id: UUID):
        from sqlalchemy.orm import Session
        from aiccore.backend.database import engine
        from aiccore.backend.models import Session as AICSession
        from sqlalchemy import update
        
        with Session(engine) as db_session:
            session = db_session.get(AICSession, session_id)
            if session:
                session.is_active = False
                session.end_time = datetime.utcnow()
                db_session.commit()
                # Broadcast update
                await broadcast_manager.broadcast({"type": "LEADERBOARD_UPDATE", "data": {"session_id": str(session_id)}})
            return {"status": "deactivated"}

    @app.post("/api/v1/aiccore/submit")
    async def submit_flow(req: SubmissionRequest):
        from sqlalchemy.orm import Session
        from aiccore.backend.database import engine
        from aiccore.backend.models import Submission, Event
        
        with Session(engine) as db_session:
            # Check if session exists
            from aiccore.backend.models import Session as AICSession
            session_obj = db_session.get(AICSession, req.session_id)
            if not session_obj:
                raise HTTPException(status_code=404, detail="Session not found")
            
            # Create submission
            new_submission = Submission(
                session_id=req.session_id,
                flow_snapshot=req.flow_snapshot
            )
            # We can also store flow_name and description in the snapshot or add fields to Submission model
            # For now, we follow the model we defined.
            
            db_session.add(new_submission)
            
            # Mark session as submitted
            session_obj.is_submitted = True
            
            # Log submission event
            from sqlalchemy import select
            stmt = select(Event).where(Event.session_id == req.session_id).order_by(Event.sequence_number.desc())
            last_event = db_session.execute(stmt).scalars().first()
            seq = (last_event.sequence_number + 1) if last_event else 0
            
            sub_event = Event(
                session_id=req.session_id,
                sequence_number=seq,
                event_type="submitted",
                payload={"submission_id": str(new_submission.id)}
            )
            db_session.add(sub_event)
            
            db_session.commit()
            db_session.refresh(new_submission)
            return {"submission_id": str(new_submission.id), "status": "submitted"}

    @app.get("/api/v1/aiccore/submissions")
    async def list_submissions():
        from sqlalchemy.orm import Session
        from aiccore.backend.database import engine
        from aiccore.backend.models import Submission, Session as AICSession
        from sqlalchemy import select
        
        with Session(engine) as db_session:
            # Join with Session to get nicknames
            stmt = select(Submission, AICSession.nickname, AICSession.station_id).join(AICSession, Submission.session_id == AICSession.id)
            results = db_session.execute(stmt).all()
            
            output = []
            for sub, nickname, station_id in results:
                output.append({
                    "id": str(sub.id),
                    "nickname": nickname,
                    "station_id": station_id,
                    "submitted_at": sub.submitted_at.isoformat(),
                    "flow_snapshot": sub.flow_snapshot,
                    "score": sub.score,
                    "is_winner": sub.is_winner
                })
            return output

    @app.post("/api/v1/aiccore/submissions/{submission_id}/winner")
    async def mark_winner(submission_id: UUID):
        from sqlalchemy.orm import Session
        from aiccore.backend.database import engine
        from aiccore.backend.models import Submission
        
        with Session(engine) as db_session:
            # First, unset any previous winner if we only want one (optional but usually clear)
            from sqlalchemy import update
            db_session.execute(update(Submission).values(is_winner=False))
            
            sub_obj = db_session.get(Submission, submission_id)
            if not sub_obj:
                raise HTTPException(status_code=404, detail="Submission not found")
            
            sub_obj.is_winner = True
            db_session.commit()
            return {"status": "winner_marked", "submission_id": str(sub_obj.id)}

    @app.get("/api/v1/aiccore/leaderboard")
    async def get_leaderboard():
        from sqlalchemy.orm import Session
        from aiccore.backend.database import engine
        from aiccore.backend.models import Session as AICSession, Event, Submission
        from sqlalchemy import select, func, desc
        
        with Session(engine) as db_session:
            # Get only the latest active session for each station to avoid duplicates
            # We use a subquery or just fetch all and deduplicate in Python for simplicity in SQLite
            stmt = select(AICSession).where(AICSession.is_active == True).order_by(desc(AICSession.start_time))
            all_active = db_session.execute(stmt).scalars().all()
            
            seen_stations = set()
            sessions = []
            for s in all_active:
                # Normalize station_id for robust deduplication
                norm_station = str(s.station_id).strip().lower() if s.station_id else "0"
                if norm_station not in seen_stations:
                    sessions.append(s)
                    seen_stations.add(norm_station)
            
            leaderboard = []
            for s in sessions:
                # Count events to estimate progress
                event_stmt = select(func.count(Event.id)).where(Event.session_id == s.id)
                event_count = db_session.execute(event_stmt).scalar() or 0
                
                # Check for run success vs error
                run_stmt = select(Event).where(Event.session_id == s.id, Event.event_type == "flow_run_completed").order_by(Event.timestamp.desc())
                last_run = db_session.execute(run_stmt).scalars().first()
                
                # Determine Status
                status = "BUILDING"
                if event_count > 10: status = "PROTOTYPING"
                if last_run:
                    status = "TESTING"
                    if last_run.payload.get("status") == "success":
                        status = "READY"
                
                # Calculate simple progress % (clamped at 99 unless submitted)
                progress = min(event_count * 5, 99)
                if s.is_submitted:
                    progress = 100
                
                # Get score if exists
                sub_stmt = select(Submission).where(Submission.session_id == s.id).order_by(Submission.submitted_at.desc())
                submission = db_session.execute(sub_stmt).scalars().first()
                
                leaderboard.append({
                    "id": str(s.id),
                    "nickname": s.nickname,
                    "station": s.station_id or "0",
                    "progress": progress,
                    "status": status,
                    "score": submission.score if submission else 0,
                    "is_winner": submission.is_winner if submission else False
                })
            
            # Sort by winner (desc), then score (desc), then progress (desc)
            leaderboard.sort(key=lambda x: (x["is_winner"], x["score"], x["progress"]), reverse=True)
            return leaderboard

    @app.get("/api/v1/aiccore/challenges")
    async def list_challenges():
        from sqlalchemy.orm import Session
        from aiccore.backend.database import engine
        from aiccore.backend.models import Challenge
        from sqlalchemy import select
        
        with Session(engine) as db_session:
            stmt = select(Challenge).where(Challenge.is_active == True)
            results = db_session.execute(stmt).scalars().all()
            return results

    @app.post("/api/v1/aiccore/challenges")
    async def create_challenge(req: ChallengeRequest):
        from sqlalchemy.orm import Session
        from aiccore.backend.database import engine
        from aiccore.backend.models import Challenge
        
        with Session(engine) as db_session:
            new_challenge = Challenge(
                title=req.title,
                description=req.description,
                complexity_level=req.complexity_level
            )
            db_session.add(new_challenge)
            db_session.commit()
            db_session.refresh(new_challenge)
            return new_challenge

    @app.get("/api/v1/aiccore/achievements")
    async def list_achievements():
        from sqlalchemy.orm import Session
        from aiccore.backend.database import engine
        from aiccore.backend.models import Achievement
        from sqlalchemy import select
        
        with Session(engine) as db_session:
            stmt = select(Achievement)
            return db_session.execute(stmt).scalars().all()

    @app.post("/api/v1/aiccore/achievements")
    async def create_achievement(req: AchievementRequest):
        from sqlalchemy.orm import Session
        from aiccore.backend.database import engine
        from aiccore.backend.models import Achievement
        
        with Session(engine) as db_session:
            new_ach = Achievement(name=req.name, description=req.description, icon_url=req.icon_url)
            db_session.add(new_ach)
            db_session.commit()
            db_session.refresh(new_ach)
            return new_ach

    @app.post("/api/v1/aiccore/users/{user_id}/award/{achievement_id}")
    async def award_achievement(user_id: UUID, achievement_id: UUID):
        from sqlalchemy.orm import Session
        from aiccore.backend.database import engine
        from aiccore.backend.models import User, Achievement
        from sqlalchemy import update
        
        with Session(engine) as db_session:
            user = db_session.get(User, user_id)
            ach = db_session.get(Achievement, achievement_id)
            if not user or not ach:
                raise HTTPException(status_code=404, detail="User or Achievement not found")
            
            # Update honors JSON
            honors = dict(user.honors) if user.honors else {}
            honors[str(achievement_id)] = {
                "name": ach.name,
                "awarded_at": datetime.utcnow().isoformat()
            }
            user.honors = honors
            db_session.commit()
            return {"status": "awarded", "user_id": str(user_id), "achievement": ach.name}

    @app.post("/api/v1/aiccore/stations/register")
    async def register_station(req: StationRegisterRequest):
        from sqlalchemy.orm import Session
        from aiccore.backend.database import engine
        from aiccore.backend.models import Station
        
        with Session(engine) as db_session:
            station = db_session.get(Station, req.id)
            if station:
                station.ip_address = req.ip_address
            else:
                station = Station(id=req.id, ip_address=req.ip_address)
                db_session.add(station)
            db_session.commit()
            return {"status": "registered", "station_id": station.id, "ip": station.ip_address}

    @app.get("/api/v1/aiccore/users/{user_id}/history")
    async def get_user_history(user_id: UUID):
        from sqlalchemy.orm import Session
        from aiccore.backend.database import engine
        from aiccore.backend.models import Session as AICSession, Submission
        from sqlalchemy import select
        
        with Session(engine) as db_session:
            # Get all submissions for this user across all their sessions
            stmt = select(Submission).join(AICSession, Submission.session_id == AICSession.id).where(AICSession.user_id == user_id)
            results = db_session.execute(stmt).scalars().all()
            
            return [{
                "id": str(s.id),
                "submitted_at": s.submitted_at,
                "score": s.score,
                "is_winner": s.is_winner,
                "flow_snapshot": s.flow_snapshot
            } for s in results]

    @app.post("/api/v1/aiccore/auth/admin-login")
    async def admin_login(req: AdminLoginRequest):
        # Professional standard: Simple admin pass for museum local LAN
        # In a real cloud app, we'd use proper hashes
        if req.password == "aiccore2024":
            from fastapi.responses import JSONResponse
            res = JSONResponse(content={"status": "authenticated", "role": "admin"})
            res.set_cookie(
                key="aiccore_admin", 
                value="true", 
                httponly=True, 
                samesite="lax",
                max_age=86400 # 1 day
            )
            return res
        raise HTTPException(status_code=401, detail="Invalid admin password")

    @app.get("/api/v1/aiccore/users")
    async def list_users():
        from sqlalchemy.orm import Session
        from aiccore.backend.database import engine
        from sqlalchemy import select
        
        with Session(engine) as db_session:
            stmt = select(User).order_by(User.created_at.desc())
            results = db_session.execute(stmt).scalars().all()
            return results

    @app.post("/api/v1/aiccore/users")
    async def create_user(req: UserCreateRequest):
        from sqlalchemy.orm import Session
        from aiccore.backend.database import engine
        
        # Google Standard: Input Sanitization
        clean_username = sanitize_string(req.username.lower().replace(" ", "_"), 30)
        clean_nickname = sanitize_string(req.nickname, 30)
        
        if not clean_username or not clean_nickname:
            raise HTTPException(status_code=400, detail="Invalid username or nickname content")

        with Session(engine) as db_session:
            # Check if username exists
            from sqlalchemy import select
            stmt = select(User).where(User.username == clean_username)
            existing = db_session.execute(stmt).scalars().first()
            if existing:
                raise HTTPException(status_code=400, detail="Username already exists. Please choose another.")
            
            new_user = User(
                username=clean_username,
                nickname=clean_nickname,
                unlock_code=generate_unlock_code(),
                unlock_code_generated_at=datetime.utcnow()
            )
            db_session.add(new_user)
            db_session.commit()
            db_session.refresh(new_user)
            
            # Broadcast registry update
            await broadcast_manager.broadcast({"type": "REGISTRY_UPDATE", "data": {"user_id": str(new_user.id)}})
            
            return new_user

    @app.post("/api/v1/aiccore/users/{user_id}/regenerate")
    async def regenerate_code(user_id: UUID):
        from sqlalchemy.orm import Session
        from aiccore.backend.database import engine
        
        with Session(engine) as db_session:
            user = db_session.get(User, user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Generate a unique code
            new_code = generate_unlock_code()
            # Ensure uniqueness (simple loop for 4 digits)
            for _ in range(10):
                from sqlalchemy import select
                stmt = select(User).where(User.unlock_code == new_code)
                if not db_session.execute(stmt).scalars().first():
                    break
                new_code = generate_unlock_code()
            
            user.unlock_code = new_code
            user.unlock_code_generated_at = datetime.utcnow()
            db_session.commit()
            return {"unlock_code": user.unlock_code, "generated_at": user.unlock_code_generated_at.isoformat()}

    @app.post("/api/v1/aiccore/sync/push")
    async def push_to_cloud():
        """
        Simulates the Sync Gateway pushing winners and honors to the cloud.
        In a real deployment, this would be a background task calling an external API.
        """
        return {"status": "synced", "items_pushed": 5, "timestamp": datetime.utcnow().isoformat()}

    # Attach AICCORE Telemetry Middleware
    app.add_middleware(AICCoreEventMiddleware)
    
    return app

app = create_aiccore_app()

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting AICCORE Museum Agent Arena...")
    uvicorn.run(app, host="0.0.0.0", port=7860)
