from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from database import get_db
from models import Leave, User
from middleware.auth import auth_required, admin_only
from utils.notification_helper import create_notification

router = APIRouter()

class CreateLeaveRequest(BaseModel):
    startDate: str
    endDate: str
    reason: str
    type: str

class UpdateLeaveStatusRequest(BaseModel):
    status: str

@router.get("/")
def get_leaves(user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    if user.get('role') == 'admin':
        leaves = db.query(Leave).all()
    else:
        leaves = db.query(Leave).filter(Leave.employeeId == user.get('id')).all()
    return leaves

@router.post("/")
def create_leave(req: CreateLeaveRequest, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    new_leave = Leave(
        id=str(uuid.uuid4()),
        employeeId=user.get('id'),
        employeeName=user.get('name'),
        startDate=req.startDate,
        endDate=req.endDate,
        reason=req.reason,
        type=req.type,
        status="pending",
        createdAt=datetime.now(timezone.utc).isoformat() + "Z",
        decidedAt=None
    )
    db.add(new_leave)
    
    # Notify all admins of a new leave request
    admins = db.query(User).filter(User.role == 'admin').all()
    for admin in admins:
        create_notification(
            db,
            admin.id,  # type: ignore
            "Leave Request Submitted",
            f"New leave request submitted by {new_leave.employeeName} for {new_leave.startDate} to {new_leave.endDate}.",
            "leave_request_submitted"
        )
        
    db.commit()
    db.refresh(new_leave)
    return new_leave

@router.put("/{leave_id}/status")
def update_leave_status(leave_id: str, req: UpdateLeaveStatusRequest, admin: dict = Depends(admin_only), db: Session = Depends(get_db)):
    target = db.query(Leave).filter(Leave.id == leave_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Leave request not found"})
        
    target.status = req.status  # type: ignore
    target.decidedAt = datetime.now(timezone.utc).isoformat() + "Z"  # type: ignore
    
    # Notify requester
    event_type = "leave_approved" if req.status == "approved" else "leave_rejected"
    title = f"Leave Request {req.status.capitalize()}"
    content = f"Your leave request for {target.startDate} to {target.endDate} has been {req.status}."
    if target.employeeId:
        create_notification(db, target.employeeId, title, content, event_type)  # type: ignore
        
    db.commit()
    db.refresh(target)
    return target

@router.delete("/{leave_id}")
def delete_leave(leave_id: str, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    target = db.query(Leave).filter(Leave.id == leave_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Leave request not found"})
        
    if user.get('role') != 'admin' and target.employeeId != user.get('id'):
        return JSONResponse(status_code=403, content={"error": "Unauthorized to delete this request"})
        
    db.delete(target)
    db.commit()
    return {"message": "Leave request deleted"}
