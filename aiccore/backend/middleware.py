from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import json
import asyncio
from datetime import datetime
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from .database import engine
from .models import Event
from .broadcast import broadcast_manager

class AICCoreEventMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # We only care about API calls to Langflow's flow and run endpoints
        path = request.url.path
        method = request.method
        
        # Extract Session ID from header, cookie, or query param
        session_id_str = request.headers.get("X-AICCORE-Session-ID")
        
        if not session_id_str:
            session_id_str = request.cookies.get("aiccore_session_id")
            
        if not session_id_str:
            session_id_str = request.query_params.get("session_id")
            
        if not session_id_str:
            return await call_next(request)
        
        try:
            session_id = UUID(session_id_str)
            # print(f"🎯 Intercepted AICCORE Request: {method} {path} for session {session_id}")
        except (ValueError, TypeError):
            return await call_next(request)

        # Capture "flow_saved"
        if method == "PATCH" and "/api/v1/flows/" in path:
            return await self._handle_flow_save(request, call_next, session_id)
            
        # Capture "flow_run"
        if method == "POST" and "/api/v1/run/" in path:
            return await self._handle_flow_run(request, call_next, session_id)

        return await call_next(request)

    async def _handle_flow_save(self, request, call_next, session_id):
        response = await call_next(request)
        print(f"📝 Logging flow_saved event (Status: {response.status_code})")
        self._log_event(session_id, "flow_saved", {"path": request.url.path, "status": response.status_code})
        return response

    async def _handle_flow_run(self, request, call_next, session_id):
        print(f"📝 Logging flow_run_started event")
        self._log_event(session_id, "flow_run_started", {"path": request.url.path})
        start_time = datetime.utcnow()
        response = await call_next(request)
        duration = (datetime.utcnow() - start_time).total_seconds()
        
        print(f"📝 Logging flow_run_completed event (Status: {response.status_code})")
        self._log_event(session_id, "flow_run_completed", {
            "path": request.url.path,
            "status": "success" if response.status_code < 400 else "error",
            "status_code": response.status_code,
            "duration": duration
        })
        return response

    def _log_event(self, session_id: UUID, event_type: str, payload: dict):
        with Session(engine) as db_session:
            # Get next sequence number
            stmt = select(Event).where(Event.session_id == session_id).order_by(Event.sequence_number.desc())
            last_event = db_session.execute(stmt).scalars().first()
            seq = (last_event.sequence_number + 1) if last_event else 0
            
            event = Event(
                session_id=session_id,
                sequence_number=seq,
                event_type=event_type,
                payload=payload
            )
            db_session.add(event)
            db_session.commit()
            
            # Broadcast the event for live dashboard
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(broadcast_manager.broadcast({
                        "session_id": str(session_id),
                        "event_type": event_type,
                        "sequence_number": seq,
                        "timestamp": event.timestamp,
                        "payload": payload
                    }))
            except Exception as e:
                print(f"❌ Failed to broadcast event: {e}")
