from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime
from sqlalchemy.orm import Session

from database import get_db
from models import Event, User
from middleware.auth import auth_required, admin_only
from utils.notification_helper import create_notification

router = APIRouter()

class CreateEventRequest(BaseModel):
    title: str
    date: str
    description: str
    type: str

class UpdateEventRequest(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None

@router.get("")
@router.get("/")
def get_events(user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    return db.query(Event).all()

@router.post("")
@router.post("/")
def create_event(req: CreateEventRequest, admin: dict = Depends(admin_only), db: Session = Depends(get_db)):
    new_event = Event(
        id=str(uuid.uuid4()),
        title=req.title,
        date=req.date,
        description=req.description,
        type=req.type,
        createdAt=datetime.utcnow().isoformat() + "Z"
    )
    db.add(new_event)
    
    # Notify all active users
    users = db.query(User).filter(User.status == 'active').all()
    for user in users:
        create_notification(
            db,
            user.id,  # type: ignore
            "New Company Event",
            f"An event '{new_event.title}' has been scheduled for {new_event.date}.",
            "company_event_added"
        )
        
    db.commit()
    db.refresh(new_event)
    return new_event

@router.put("/{event_id}")
def update_event(event_id: str, req: UpdateEventRequest, admin: dict = Depends(admin_only), db: Session = Depends(get_db)):
    target = db.query(Event).filter(Event.id == event_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Event not found"})
        
    if req.title is not None: target.title = req.title  # type: ignore
    if req.date is not None: target.date = req.date  # type: ignore
    if req.description is not None: target.description = req.description  # type: ignore
    if req.type is not None: target.type = req.type  # type: ignore
    
    db.commit()
    db.refresh(target)
    return target

@router.delete("/{event_id}")
def delete_event(event_id: str, admin: dict = Depends(admin_only), db: Session = Depends(get_db)):
    target = db.query(Event).filter(Event.id == event_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Event not found"})
        
    db.delete(target)
    db.commit()
    return {"message": "Event deleted"}
