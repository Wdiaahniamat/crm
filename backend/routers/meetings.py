from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime
from sqlalchemy.orm import Session

from database import get_db
from models import Meeting
from middleware.auth import auth_required

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

@router.get("/")
def get_meetings(user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    if user.get('role') == 'admin':
        return db.query(Meeting).all()
    else:
        meetings = db.query(Meeting).all()
        # Employee sees global, department, or internal meetings
        return [m for m in meetings if m.scope == 'Global' or m.department == user.get('department') or m.type == 'Internal']

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
    return target

@router.delete("/{meeting_id}")
def delete_meeting(meeting_id: str, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    if user.get('role') != 'admin':
        return JSONResponse(status_code=403, content={"error": "Only admins can delete meetings"})
        
    target = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Meeting not found"})
        
    db.delete(target)
    db.commit()
    return {"message": "Meeting deleted"}
