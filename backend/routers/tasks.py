from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from database import get_db
from models import Task
from middleware.auth import auth_required

from utils.notification_helper import create_notification

router = APIRouter()

class CreateTaskRequest(BaseModel):
    title: str
    description: str
    assignedTo: str
    priority: str
    projectId: Optional[str] = None
    dueDate: Optional[str] = None

class UpdateTaskStatusRequest(BaseModel):
    status: str
    pmedName: Optional[str] = None
    pmedData: Optional[str] = None
    pmedFiles: Optional[list] = None
    pmedStatus: Optional[str] = None

class UpdateTaskDetailsRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignedTo: Optional[str] = None
    priority: Optional[str] = None
    projectId: Optional[str] = None
    dueDate: Optional[str] = None
    status: Optional[str] = None

@router.get("")
@router.get("/")
def get_tasks(user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    if user.get('role') == 'admin':
        tasks = db.query(Task).all()
    else:
        tasks = db.query(Task).filter(Task.assignedTo == user.get('id')).all()
    return tasks

@router.post("")
@router.post("/")
def create_task(req: CreateTaskRequest, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    new_task = Task(
        id=str(uuid.uuid4()),
        title=req.title,
        description=req.description,
        assignedTo=req.assignedTo,
        assignedBy=user.get('id'),
        priority=req.priority,
        status="To Do",
        projectId=req.projectId,
        dueDate=req.dueDate,
        createdAt=now_str,
        updatedAt=now_str,
        completedAt=None
    )
    db.add(new_task)
    
    # Trigger notification for Task Assigned
    if new_task.assignedTo != user.get('id'):
        create_notification(
            db, 
            new_task.assignedTo,  # type: ignore
            "New Task Assigned", 
            f"You have been assigned a new task: '{new_task.title}'", 
            "task_assigned"
        )
        
    db.commit()
    db.refresh(new_task)
    return new_task

@router.put("/{task_id}/status")
def update_task_status(task_id: str, req: UpdateTaskStatusRequest, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    target = db.query(Task).filter(Task.id == task_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Task not found"})
        
    if user.get('role') != 'admin' and target.assignedTo != user.get('id') and target.assignedBy != user.get('id'):
        return JSONResponse(status_code=403, content={"error": "Unauthorized to update this task"})
        
    old_status = target.status
    target.status = req.status  # type: ignore
    target.updatedAt = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")  # type: ignore
    if req.status == 'Done' or req.status == 'completed':
        target.completedAt = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")  # type: ignore
    elif target.status != 'Done' and target.status != 'completed':
        target.completedAt = None  # type: ignore
        
    if req.pmedName is not None:
        target.pmedName = req.pmedName  # type: ignore
    if req.pmedData is not None:
        target.pmedData = req.pmedData  # type: ignore
    if req.pmedFiles is not None:
        target.pmedFiles = req.pmedFiles  # type: ignore
    if req.pmedStatus is not None:
        target.pmedStatus = req.pmedStatus  # type: ignore
    
    # Trigger notification for Task Updated
    sender_name = user.get('name') or user.get('username') or "System"
    notification_content = f"Task '{target.title}' status changed from '{old_status}' to '{req.status}' by {sender_name}."
    
    # Notify assignee if updated by someone else
    if target.assignedTo and target.assignedTo != user.get('id'):
        create_notification(db, target.assignedTo, "Task Updated", notification_content, "task_updated")  # type: ignore
        
    # Notify assigner/admin if updated by assignee
    if target.assignedBy and target.assignedBy != user.get('id'):
        create_notification(db, target.assignedBy, "Task Updated", notification_content, "task_updated")  # type: ignore
        
    db.commit()
    db.refresh(target)
    return target

@router.put("/{task_id}")
def update_task_details(task_id: str, req: UpdateTaskDetailsRequest, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    target = db.query(Task).filter(Task.id == task_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Task not found"})

    if user.get('role') != 'admin' and target.assignedTo != user.get('id') and target.assignedBy != user.get('id'):
        return JSONResponse(status_code=403, content={"error": "Unauthorized to update this task"})

    old_assigned = target.assignedTo

    if req.title is not None:
        target.title = req.title  # type: ignore
    if req.description is not None:
        target.description = req.description  # type: ignore
    if req.assignedTo is not None:
        target.assignedTo = req.assignedTo  # type: ignore
    if req.priority is not None:
        target.priority = req.priority  # type: ignore
    if req.projectId is not None:
        target.projectId = req.projectId  # type: ignore
    if req.dueDate is not None:
        target.dueDate = req.dueDate  # type: ignore
    if req.status is not None:
        target.status = req.status  # type: ignore

    target.updatedAt = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")  # type: ignore

    # Notification triggers
    if req.assignedTo and req.assignedTo != old_assigned and req.assignedTo != user.get('id'):
        create_notification(
            db,
            req.assignedTo,
            "New Task Assigned",
            f"You have been assigned task '{target.title}' by {user.get('name', 'Admin')}.",
            "task_assigned"
        )
    elif target.assignedTo and target.assignedTo != user.get('id'):
        create_notification(
            db,
            target.assignedTo,  # type: ignore
            "Task Updated",
            f"Task '{target.title}' details were updated.",
            "task_updated"
        )

    db.commit()
    db.refresh(target)
    return target

class AddCommentRequest(BaseModel):
    text: str

@router.delete("/{task_id}")
def delete_task(task_id: str, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    target = db.query(Task).filter(Task.id == task_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Task not found"})
        
    if user.get('role') != 'admin' and target.assignedBy != user.get('id'):
        return JSONResponse(status_code=403, content={"error": "Unauthorized to delete this task"})
        
    db.delete(target)
    db.commit()
    return {"message": "Task deleted"}

@router.post("/{task_id}/comments")
def add_task_comment(task_id: str, req: AddCommentRequest, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    target = db.query(Task).filter(Task.id == task_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Task not found"})
        
    if not req.text or not req.text.strip():
        return JSONResponse(status_code=400, content={"error": "Comment text cannot be empty"})
        
    comment_item = {
        "id": str(uuid.uuid4()),
        "authorId": user.get('id'),
        "authorName": user.get('name') or user.get('username') or "User",
        "authorRole": user.get('role'),
        "text": req.text.strip(),
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    }
    
    raw_comments = target.comments  # type: ignore
    current_comments = list(raw_comments) if isinstance(raw_comments, list) else []
    current_comments.append(comment_item)
    target.comments = current_comments  # type: ignore
    target.updatedAt = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")  # type: ignore
    
    sender_name = user.get('name') or user.get('username') or "Someone"
    notif_title = f"New note on task '{target.title}'"
    notif_body = f"{sender_name}: {req.text.strip()[:100]}"
    
    if target.assignedBy and target.assignedBy != user.get('id'):
        create_notification(db, target.assignedBy, notif_title, notif_body, "comment_added")  # type: ignore
    if target.assignedTo and target.assignedTo != user.get('id'):
        create_notification(db, target.assignedTo, notif_title, notif_body, "comment_added")  # type: ignore
        
    db.commit()
    db.refresh(target)
    return target
