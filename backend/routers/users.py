from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import bcrypt
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import User, Request
from middleware.auth import auth_required, admin_only

router = APIRouter()

def safe_user(user: User) -> dict:
    data = {c.name: getattr(user, c.name) for c in user.__table__.columns if c.name != 'passwordHash'}
    import json
    docs = data.get('documents', [])
    if isinstance(docs, str):
        try:
            docs = json.loads(docs)
        except Exception:
            docs = []
            
    if isinstance(docs, list):
        safe_docs = []
        for doc in docs:
            if isinstance(doc, dict):
                safe_doc = dict(doc)
                safe_doc.pop('fileData', None)
                safe_docs.append(safe_doc)
            else:
                safe_docs.append(doc)
        data['documents'] = safe_docs
    return data

class UpdateMeRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    password: Optional[str] = None
    documents: Optional[list] = None

class UpdateStatusRequest(BaseModel):
    status: str

class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    employeeRole: Optional[str] = None
    team: Optional[str] = None
    joiningDate: Optional[str] = None
    onboardingDate: Optional[str] = None
    contractType: Optional[str] = None

@router.get("/me")
def get_me(user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user.get('id')).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "User not found"})
    return safe_user(target)

@router.put("/me")
def update_me(req: UpdateMeRequest, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user.get('id')).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "User not found"})
        
    if req.name is not None: target.name = req.name  # type: ignore
    if req.email is not None: target.email = req.email  # type: ignore
    if req.phone is not None: target.phone = req.phone  # type: ignore
    if req.department is not None: target.department = req.department  # type: ignore
    if req.password is not None:
        target.passwordHash = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')  # type: ignore
    if req.documents is not None: target.documents = req.documents  # type: ignore
    
    db.commit()
    db.refresh(target)
    return safe_user(target)

@router.get("")
@router.get("/")
def get_all_employees(admin: dict = Depends(admin_only), db: Session = Depends(get_db)):
    employees = db.query(User).filter(User.role == 'employee').all()
    return [safe_user(u) for u in employees]

@router.get("/{user_id}")
def get_employee(user_id: str, admin: dict = Depends(admin_only), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "User not found"})
    return safe_user(target)

@router.put("/{user_id}/status")
def update_employee_status(user_id: str, req: UpdateStatusRequest, admin: dict = Depends(admin_only), db: Session = Depends(get_db)):
    if req.status not in ["active", "inactive"]:
        return JSONResponse(status_code=400, content={"error": "Invalid status"})
        
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "User not found"})
        
    target.status = req.status  # type: ignore
    db.commit()
    db.refresh(target)
    return safe_user(target)

@router.put("/{user_id}")
def update_employee(user_id: str, req: UpdateUserRequest, admin: dict = Depends(admin_only), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "User not found"})
        
    if req.name is not None: target.name = req.name  # type: ignore
    if req.email is not None: target.email = req.email  # type: ignore
    if req.phone is not None: target.phone = req.phone  # type: ignore
    if req.department is not None: target.department = req.department  # type: ignore
    if req.employeeRole is not None: target.employeeRole = req.employeeRole  # type: ignore
    if req.team is not None: target.team = req.team  # type: ignore
    if req.joiningDate is not None: target.joiningDate = req.joiningDate  # type: ignore
    if req.onboardingDate is not None: target.onboardingDate = req.onboardingDate  # type: ignore
    if req.contractType is not None: target.contractType = req.contractType  # type: ignore
    
    db.commit()
    db.refresh(target)
    return safe_user(target)

@router.delete("/{user_id}")
def delete_employee(user_id: str, admin: dict = Depends(admin_only), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "User not found"})
        
    if target.username:
        req = db.query(Request).filter(func.lower(Request.username) == target.username.lower()).first()
        if req:
            db.delete(req)
            
    db.delete(target)
    db.commit()
    return {"message": "Employee deleted successfully"}
