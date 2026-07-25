from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime
from sqlalchemy.orm import Session

from database import get_db
from models import Project
from middleware.auth import auth_required

router = APIRouter()

class CreateProjectRequest(BaseModel):
    name: str
    clientId: Optional[str] = None
    description: Optional[str] = ""
    status: Optional[str] = "Active"
    employeeIds: Optional[list] = []

class UpdateProjectRequest(BaseModel):
    name: Optional[str] = None
    clientId: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    employeeIds: Optional[list] = None

@router.get("")
@router.get("/")
def get_projects(user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    if user.get('role') == 'admin':
        return db.query(Project).all()
    else:
        # For sqlite JSON column we need to do it in python if we don't have json functions
        # For simplicity, fetch all and filter in python
        projects = db.query(Project).all()
        return [p for p in projects if user.get('id') in (p.employeeIds or [])]

@router.post("")
@router.post("/")
def create_project(req: CreateProjectRequest, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    new_project = Project(
        id=str(uuid.uuid4()),
        name=req.name,
        clientId=req.clientId,
        description=req.description,
        status=req.status,
        employeeIds=req.employeeIds,
        createdAt=datetime.utcnow().isoformat() + "Z"
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@router.put("/{project_id}")
def update_project(project_id: str, req: UpdateProjectRequest, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    target = db.query(Project).filter(Project.id == project_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Project not found"})
        
    old_status = target.status
    if req.name is not None: target.name = req.name  # type: ignore
    if req.clientId is not None: target.clientId = req.clientId  # type: ignore
    if req.description is not None: target.description = req.description  # type: ignore
    if req.status is not None: target.status = req.status  # type: ignore
    if req.employeeIds is not None: target.employeeIds = req.employeeIds  # type: ignore
    
    # Notify team if project is marked Completed
    if req.status is not None and req.status.lower() == "completed" and (old_status or "").lower() != "completed":
        from utils.notification_helper import create_notification
        import json
        
        # Determine employee IDs. If target.employeeIds is a string (JSON representation), parse it.
        emp_ids = target.employeeIds
        if isinstance(emp_ids, str):
            try:
                emp_ids = json.loads(emp_ids)
            except Exception:
                emp_ids = []
                
        if isinstance(emp_ids, list):
            for emp_id in emp_ids:
                create_notification(
                    db,
                    emp_id,
                    "Project Completed",
                    f"Project '{target.name}' has been completed.",
                    "project_completed"
                )
    
    db.commit()
    db.refresh(target)
    return target

@router.delete("/{project_id}")
def delete_project(project_id: str, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    target = db.query(Project).filter(Project.id == project_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Project not found"})
        
    db.delete(target)
    db.commit()
    return {"message": "Project deleted"}
