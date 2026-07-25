from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import bcrypt
import uuid
from datetime import datetime, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Request, User
from middleware.auth import auth_required, admin_only

router = APIRouter()

class CreateRequest(BaseModel):
    name: str
    email: str
    username: str
    password: str
    department: Optional[str] = None
    phone: Optional[str] = None

@router.post("")
@router.post("/")
def submit_request(req: CreateRequest, db: Session = Depends(get_db)):
    if not req.name or not req.email or not req.username or not req.password:
        return JSONResponse(status_code=400, content={"error": "Name, email, username and password are required"})
        
    users = db.query(User).all()
    requests = db.query(Request).all()
    
    username_taken = any((u.username or '').lower() == req.username.lower() for u in users) or \
                     any((r.username or '').lower() == req.username.lower() and r.status == 'pending' for r in requests)
                     
    if username_taken:
        return JSONResponse(status_code=409, content={"error": "That username is already in use or pending approval"})
        
    new_request = Request(
        id=str(uuid.uuid4()),
        name=req.name,
        email=req.email,
        username=req.username,
        passwordHash=bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
        department=req.department or 'General',
        phone=req.phone or '',
        status="pending",
        createdAt=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    )
    
    db.add(new_request)
    db.commit()
    
    # Notify admins about the new account request
    from utils.notification_helper import create_notification
    admins = db.query(User).filter(User.role == 'admin').all()
    for admin in admins:
        create_notification(
            db=db,
            user_id=str(admin.id),
            title="New Account Request",
            content=f"{req.name} ({req.username}) has requested an account.",
            event_type="requests"
        )
    
    return JSONResponse(status_code=201, content={"message": "Account request submitted. An admin will review it shortly."})

@router.get("")
@router.get("/")
def list_requests(admin: dict = Depends(admin_only), db: Session = Depends(get_db)):
    requests = db.query(Request).all()
    users = db.query(User).all()
    users_by_username = {(u.username or '').lower(): u for u in users if u.username}
    
    request_usernames = set()
    result = []
    
    for r in requests:
        if r.username:
            request_usernames.add(r.username.lower())
        r_dict = {c.name: getattr(r, c.name) for c in r.__table__.columns if c.name != 'passwordHash'}
        if r.username and r.username.lower() in users_by_username:
            u = users_by_username[r.username.lower()]
            r_dict['userStatus'] = u.status
            r_dict['userId'] = u.id
        result.append(r_dict)
        
    # Include deactivated employees who may not have a request entry
    for u in users:
        if u.role == 'employee' and u.status == 'inactive' and (u.username or '').lower() not in request_usernames:
            result.append({
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "username": u.username,
                "department": u.department or 'General',
                "phone": u.phone or '',
                "status": "approved",
                "userStatus": "inactive",
                "userId": u.id,
                "createdAt": u.createdAt
            })
            
    return result

@router.post("/{request_id}/approve")
def approve_request(request_id: str, admin: dict = Depends(admin_only), db: Session = Depends(get_db)):
    target = db.query(Request).filter(Request.id == request_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Request not found"})
        
    if target.status != 'pending':
        return JSONResponse(status_code=400, content={"error": "Request already processed"})
        
    now = datetime.now(timezone.utc)
    new_user = User(
        id=str(uuid.uuid4()),
        name=target.name,
        username=target.username,
        email=target.email,
        passwordHash=target.passwordHash,
        role="employee",
        department=target.department,
        phone=target.phone,
        status="active",
        employeeRole="Staff",
        team="General",
        contractType="Permanent",
        joiningDate=now.isoformat()[:10],
        onboardingDate=now.isoformat()[:10],
        createdAt=now.isoformat().replace("+00:00", "Z")
    )
    
    db.add(new_user)
    target.status = 'approved'  # type: ignore
    db.commit()
    db.refresh(new_user)
    
    safe_user = {c.name: getattr(new_user, c.name) for c in new_user.__table__.columns if c.name != 'passwordHash'}
    return {"message": "Request approved. Employee account created.", "user": safe_user}

@router.post("/{request_id}/reject")
def reject_request(request_id: str, admin: dict = Depends(admin_only), db: Session = Depends(get_db)):
    target = db.query(Request).filter(Request.id == request_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Request not found"})
        
    if target.status != 'pending':
        return JSONResponse(status_code=400, content={"error": "Request already processed"})
        
    target.status = 'rejected'  # type: ignore
    db.commit()
    
    return {"message": "Request rejected"}

@router.delete("/{request_id}")
def delete_request(request_id: str, admin: dict = Depends(admin_only), db: Session = Depends(get_db)):
    target_req = db.query(Request).filter(Request.id == request_id).first()
    if target_req:
        if target_req.username:
            user = db.query(User).filter(func.lower(User.username) == target_req.username.lower()).first()
            if user:
                db.delete(user)
        db.delete(target_req)
        db.commit()
        return {"message": "Account request and employee deleted successfully"}
        
    target_user = db.query(User).filter(User.id == request_id).first()
    if target_user:
        if target_user.username:
            req = db.query(Request).filter(func.lower(Request.username) == target_user.username.lower()).first()
            if req:
                db.delete(req)
        db.delete(target_user)
        db.commit()
        return {"message": "Employee deleted successfully"}
        
    return JSONResponse(status_code=404, content={"error": "Request or user not found"})

