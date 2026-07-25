from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from database import get_db
from models import Attendance
from middleware.auth import auth_required

router = APIRouter()

@router.get("")
@router.get("/")
def get_attendance(user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    if user.get('role') == 'admin':
        attendance = db.query(Attendance).all()
    else:
        attendance = db.query(Attendance).filter(Attendance.employeeId == user.get('id')).all()
    return attendance

@router.post("/check-in")
def check_in(user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    today = datetime.now(timezone.utc).isoformat()[:10]
    
    existing = db.query(Attendance).filter(
        Attendance.employeeId == user.get('id'),
        Attendance.date == today
    ).first()
    
    if existing:
        return JSONResponse(status_code=400, content={"error": "Already checked in today"})
        
    now = datetime.now(timezone.utc)
    # If check-in is after 10:00 AM UTC (adjust as per actual timezone requirements)
    is_late = now.hour >= 10
    
    new_attendance = Attendance(
        id=str(uuid.uuid4()),
        employeeId=user.get('id'),
        employeeName=user.get('name'),
        date=today,
        checkInTime=now.isoformat() + "Z",
        status="Late" if is_late else "Present"
    )
    
    db.add(new_attendance)
    db.commit()
    db.refresh(new_attendance)
    return new_attendance
