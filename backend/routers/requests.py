from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import bcrypt
import uuid
from datetime import datetime, timezone
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
    
    return JSONResponse(status_code=201, content={"message": "Account request submitted. An admin will review it shortly."})

@router.get("/")
def list_requests(admin: dict = Depends(admin_only), db: Session = Depends(get_db)):
    requests = db.query(Request).all()
    return [{c.name: getattr(r, c.name) for c in r.__table__.columns if c.name != 'passwordHash'} for r in requests]

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
