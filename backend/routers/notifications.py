from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import json
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import get_db
from models import Notification, User, PushSubscription
from middleware.auth import auth_required
from utils.vapid import get_or_create_vapid_keys

router = APIRouter()

class UpdateSettingsRequest(BaseModel):
    settings: Dict[str, Any]

class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str

class PushSubscriptionRequest(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys

# Default settings if none are set
DEFAULT_SETTINGS = {
    "task_assigned": {"in_app": True, "email": True, "push": True},
    "task_updated": {"in_app": True, "email": True, "push": True},
    "task_due_today": {"in_app": True, "email": True, "push": True},
    "task_overdue": {"in_app": True, "email": True, "push": True},
    "mentioned_in_comment": {"in_app": True, "email": True, "push": True},
    "comment_added": {"in_app": True, "email": True, "push": True},
    "project_completed": {"in_app": True, "email": True, "push": True},
    "client_added": {"in_app": True, "email": True, "push": True},
    "leave_request_submitted": {"in_app": True, "email": True, "push": True},
    "leave_approved": {"in_app": True, "email": True, "push": True},
    "leave_rejected": {"in_app": True, "email": True, "push": True},
    "company_event_added": {"in_app": True, "email": True, "push": True}
}

@router.get("/vapid-public-key")
def get_vapid_public_key():
    keys = get_or_create_vapid_keys()
    return {"publicKey": keys.get("public_key")}

@router.post("/subscribe")
def subscribe_push(req: PushSubscriptionRequest, request: Request, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    user_id = user.get("id")
    if not user_id or not isinstance(user_id, str):
        return JSONResponse(status_code=400, content={"error": "User ID is required"})
    user_agent = request.headers.get("user-agent", "")
    
    # Check if subscription endpoint already exists
    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == req.endpoint).first()
    if existing:
        existing.userId = user_id  # type: ignore
        existing.p256dh = req.keys.p256dh  # type: ignore
        existing.auth = req.keys.auth  # type: ignore
        existing.userAgent = user_agent  # type: ignore
    else:
        sub = PushSubscription(
            id=str(uuid.uuid4()),
            userId=user_id,
            endpoint=req.endpoint,
            p256dh=req.keys.p256dh,
            auth=req.keys.auth,
            userAgent=user_agent,
            createdAt=datetime.now(timezone.utc).isoformat()
        )
        db.add(sub)
    db.commit()
    return {"message": "Push subscription saved successfully"}

@router.post("/unsubscribe")
def unsubscribe_push(req: Dict[str, str], user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    endpoint = req.get("endpoint")
    if endpoint:
        db.query(PushSubscription).filter(PushSubscription.endpoint == endpoint).delete()
        db.commit()
    return {"message": "Unsubscribed successfully"}

@router.post("/test-push")
def test_push_notification(user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    from utils.notification_helper import send_web_push_to_user
    user_id = user.get("id")
    if not user_id or not isinstance(user_id, str):
        return JSONResponse(status_code=400, content={"error": "User ID is required"})
    title = f"Message from {user.get('name', 'CRM Dashboard')}"
    body = "You may have new messages or task updates. Click to open!"
    count = send_web_push_to_user(db, user_id, title, body, notif_type="system_test")
    return {"message": f"Sent test push notification to {count} device(s)"}


@router.get("")
@router.get("/")
def get_notifications(user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    user_id = user.get("id")
    notifications = db.query(Notification).filter(Notification.userId == user_id).order_by(Notification.createdAt.desc()).limit(50).all()
    
    result = []
    for n in notifications:
        result.append({
            "id": n.id,
            "userId": n.userId,
            "title": n.title,
            "content": n.content,
            "type": n.type,
            "read": bool(n.read),
            "createdAt": n.createdAt
        })
    return result

@router.put("/read-all")
def read_all_notifications(user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    user_id = user.get("id")
    db.query(Notification).filter(Notification.userId == user_id, Notification.read == False).update({"read": True})
    db.commit()
    return {"message": "All notifications marked as read"}

@router.delete("/clear-all")
def clear_all_notifications(user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    user_id = user.get("id")
    db.query(Notification).filter(Notification.userId == user_id).delete()
    db.commit()
    return {"message": "All notifications cleared"}

@router.put("/{notification_id}/read")
def read_notification(notification_id: str, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    user_id = user.get("id")
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.userId == user_id).first()
    if not n:
        return JSONResponse(status_code=404, content={"error": "Notification not found"})
    n.read = True  # type: ignore
    db.commit()
    return {"message": "Notification marked as read"}

@router.get("/settings")
def get_notification_settings(user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    user_id = user.get("id")
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        return JSONResponse(status_code=404, content={"error": "User not found"})
        
    settings = u.notificationSettings
    if not settings:
        return DEFAULT_SETTINGS
    
    if isinstance(settings, str):
        try:
            return json.loads(settings)
        except Exception:
            return DEFAULT_SETTINGS
            
    return settings

@router.put("/settings")
def update_notification_settings(req: UpdateSettingsRequest, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    user_id = user.get("id")
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        return JSONResponse(status_code=404, content={"error": "User not found"})
        
    u.notificationSettings = req.settings  # type: ignore
    db.commit()
    return {"message": "Settings updated successfully", "settings": req.settings}

