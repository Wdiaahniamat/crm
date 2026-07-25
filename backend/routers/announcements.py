from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import uuid
import datetime
from pydantic import BaseModel
from database import get_db
from models import Announcement, User
from middleware.auth import auth_required, admin_only
from utils.notification_helper import create_notification

router = APIRouter()

class CreateAnnouncementRequest(BaseModel):
    title: str
    content: str

@router.get("")
@router.get("/")
def get_announcements(db: Session = Depends(get_db), current_user: dict = Depends(auth_required)):
    announcements = db.query(Announcement).order_by(Announcement.createdAt.desc()).all()
    return announcements

@router.post("")
@router.post("/")
def create_announcement(req: CreateAnnouncementRequest, db: Session = Depends(get_db), current_user: dict = Depends(admin_only)):
    a_id = str(uuid.uuid4())
    timestamp = datetime.datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z')
    
    author_name = current_user.get('name') or current_user.get('username') or 'Admin'
    
    new_announcement = Announcement(
        id=a_id,
        title=req.title,
        content=req.content,
        authorId=current_user.get('id'),
        authorName=author_name,
        createdAt=timestamp
    )
    
    db.add(new_announcement)
    
    all_users = db.query(User).all()
    for u in all_users:
        if u.id != current_user.get('id'):
            create_notification(db, str(u.id), "New Announcement", req.title, "announcement")
            
    db.commit()
    
    return {"status": "ok", "id": a_id}

@router.delete("/{id}")
def delete_announcement(id: str, db: Session = Depends(get_db), current_user: dict = Depends(admin_only)):
    announcement = db.query(Announcement).filter(Announcement.id == id).first()
    if announcement:
        db.delete(announcement)
        db.commit()
    return {"status": "ok"}
