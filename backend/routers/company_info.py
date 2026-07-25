from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import datetime
from pydantic import BaseModel
from database import get_db
from models import CompanyInfo
from middleware.auth import auth_required, admin_only

router = APIRouter()

class CompanyInfoRequest(BaseModel):
    title: str
    content: str

@router.get("")
@router.get("/")
def get_company_info(db: Session = Depends(get_db), current_user: dict = Depends(auth_required)):
    info_list = db.query(CompanyInfo).order_by(CompanyInfo.title.asc()).all()
    return info_list

@router.post("")
@router.post("/")
def create_company_info(req: CompanyInfoRequest, db: Session = Depends(get_db), current_user: dict = Depends(admin_only)):
    info_id = str(uuid.uuid4())
    timestamp = datetime.datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z')
    
    new_info = CompanyInfo(
        id=info_id,
        title=req.title,
        content=req.content,
        updatedAt=timestamp
    )
    db.add(new_info)
    db.commit()
    db.refresh(new_info)
    return new_info

@router.put("/{id}")
def update_company_info(id: str, req: CompanyInfoRequest, db: Session = Depends(get_db), current_user: dict = Depends(admin_only)):
    info = db.query(CompanyInfo).filter(CompanyInfo.id == id).first()
    if not info:
        raise HTTPException(status_code=404, detail="Company info entry not found")
        
    timestamp = datetime.datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z')
    info.title = req.title
    info.content = req.content
    info.updatedAt = timestamp
    
    db.commit()
    db.refresh(info)
    return info

@router.delete("/{id}")
def delete_company_info(id: str, db: Session = Depends(get_db), current_user: dict = Depends(admin_only)):
    info = db.query(CompanyInfo).filter(CompanyInfo.id == id).first()
    if not info:
        raise HTTPException(status_code=404, detail="Company info entry not found")
        
    db.delete(info)
    db.commit()
    return {"status": "ok"}
