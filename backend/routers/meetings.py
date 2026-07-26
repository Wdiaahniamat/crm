from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime
from sqlalchemy.orm import Session

from database import get_db
from models import Meeting, User
from middleware.auth import auth_required
from utils.notification_helper import create_notification

def notify_meeting_users(db: Session, meeting: Meeting, title: str, content: str):
    users = db.query(User).filter(User.role != 'admin').all()
    for u in users:
        should_notify = False
        if meeting.scope == 'Global':
            should_notify = True
        elif meeting.department and meeting.department == u.department:
            should_notify = True
        elif meeting.type == 'employee' and not meeting.scope:
            should_notify = True
            
        if should_notify:
            try:
                create_notification(db, str(u.id), title, content, "meeting_reminder")
            except Exception as err:
                print(f"[MEETING NOTIF ERROR] Failed to send notif to {u.id}: {err}")

router = APIRouter()

class CreateMeetingRequest(BaseModel):
    title: str
    date: str
    time: str
    type: str
    department: Optional[str] = ""
    scope: Optional[str] = ""
    client: Optional[str] = ""
    description: Optional[str] = ""
    agenda: Optional[str] = ""

class UpdateMeetingRequest(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    type: Optional[str] = None
    department: Optional[str] = None
    scope: Optional[str] = None
    client: Optional[str] = None
    description: Optional[str] = None
    agenda: Optional[str] = None

@router.get("")
@router.get("/")
def get_meetings(user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    if user.get('role') == 'admin':
        return db.query(Meeting).all()
    else:
        meetings = db.query(Meeting).all()
        # Employee sees global, department, or employee meetings with no specific scope
        return [m for m in meetings if m.scope == 'Global' or m.department == user.get('department') or (m.type == 'employee' and not m.scope)]

@router.post("")
@router.post("/")
def create_meeting(req: CreateMeetingRequest, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    if user.get('role') != 'admin':
        return JSONResponse(status_code=403, content={"error": "Only admins can create meetings"})
        
    new_meeting = Meeting(
        id=str(uuid.uuid4()),
        title=req.title,
        date=req.date,
        time=req.time,
        type=req.type,
        department=req.department,
        scope=req.scope,
        client=req.client,
        description=req.description,
        agenda=req.agenda,
        createdAt=datetime.utcnow().isoformat() + "Z"
    )
    db.add(new_meeting)
    db.commit()
    db.refresh(new_meeting)
    
    notify_meeting_users(db, new_meeting, "New Meeting Scheduled", f"A new meeting '{new_meeting.title}' has been scheduled for {new_meeting.date} at {new_meeting.time}.")
    
    return new_meeting

@router.put("/{meeting_id}")
def update_meeting(meeting_id: str, req: UpdateMeetingRequest, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    if user.get('role') != 'admin':
        return JSONResponse(status_code=403, content={"error": "Only admins can update meetings"})
        
    target = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Meeting not found"})
        
    if req.title is not None: target.title = req.title  # type: ignore
    if req.date is not None: target.date = req.date  # type: ignore
    if req.time is not None: target.time = req.time  # type: ignore
    if req.type is not None: target.type = req.type  # type: ignore
    if req.department is not None: target.department = req.department  # type: ignore
    if req.scope is not None: target.scope = req.scope  # type: ignore
    if req.client is not None: target.client = req.client  # type: ignore
    if req.description is not None: target.description = req.description  # type: ignore
    if req.agenda is not None: target.agenda = req.agenda  # type: ignore
    
    db.commit()
    db.refresh(target)
    
    notify_meeting_users(db, target, "Meeting Updated", f"The meeting '{target.title}' has been updated.")
    
    return target

@router.delete("/{meeting_id}")
def delete_meeting(meeting_id: str, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    if user.get('role') != 'admin':
        return JSONResponse(status_code=403, content={"error": "Only admins can delete meetings"})
        
    target = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Meeting not found"})
        
    title = target.title
    db.delete(target)
    db.commit()
    
    notify_meeting_users(db, target, "Meeting Canceled", f"The meeting '{title}' has been canceled.")
    
    return {"message": "Meeting deleted"}
