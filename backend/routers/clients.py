from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime
from sqlalchemy.orm import Session

from database import get_db
from models import Client, User
from middleware.auth import auth_required
from utils.notification_helper import create_notification

router = APIRouter()

class CreateClientRequest(BaseModel):
    name: str
    company: str
    email: str
    phone: str
    notes: Optional[str] = ""
    contractValuation: Optional[str] = ""
    renewalDate: Optional[str] = ""

class UpdateClientRequest(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    contractValuation: Optional[str] = None
    renewalDate: Optional[str] = None
    status: Optional[str] = None
    satisfaction: Optional[str] = None

@router.get("/")
def get_clients(user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    return db.query(Client).all()

@router.post("/")
def create_client(req: CreateClientRequest, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    new_client = Client(
        id=str(uuid.uuid4()),
        name=req.name,
        company=req.company,
        email=req.email,
        phone=req.phone,
        notes=req.notes,
        contractValuation=req.contractValuation,
        renewalDate=req.renewalDate,
        satisfaction="Pending",
        status="Active",
        logs=[],
        vaultFiles=[],
        reportFiles=[],
        createdAt=datetime.utcnow().isoformat() + "Z"
    )
    db.add(new_client)
    
    # Notify all admins
    admins = db.query(User).filter(User.role == 'admin').all()
    for admin in admins:
        create_notification(
            db,
            admin.id,  # type: ignore
            "New Client Added",
            f"Client '{new_client.name}' from '{new_client.company}' has been onboarded.",
            "client_added"
        )
        
    db.commit()
    db.refresh(new_client)
    return new_client

@router.put("/{client_id}")
def update_client(client_id: str, req: UpdateClientRequest, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    target = db.query(Client).filter(Client.id == client_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Client not found"})
        
    if req.name is not None: target.name = req.name  # type: ignore
    if req.company is not None: target.company = req.company  # type: ignore
    if req.email is not None: target.email = req.email  # type: ignore
    if req.phone is not None: target.phone = req.phone  # type: ignore
    if req.notes is not None: target.notes = req.notes  # type: ignore
    if req.contractValuation is not None: target.contractValuation = req.contractValuation  # type: ignore
    if req.renewalDate is not None: target.renewalDate = req.renewalDate  # type: ignore
    if req.status is not None: target.status = req.status  # type: ignore
    if req.satisfaction is not None: target.satisfaction = req.satisfaction  # type: ignore
    
    db.commit()
    db.refresh(target)
    return target

@router.delete("/{client_id}")
def delete_client(client_id: str, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    target = db.query(Client).filter(Client.id == client_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Client not found"})
        
    db.delete(target)
    db.commit()
    return {"message": "Client deleted"}
