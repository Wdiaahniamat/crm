from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from database import get_db
from models import CompanyAsset
from middleware.auth import auth_required

router = APIRouter()

class CreateAssetRequest(BaseModel):
    companyName: str
    assetType: str
    name: str
    value: str
    notes: Optional[str] = ""
    status: Optional[str] = "Active"
    folder: Optional[str] = "Company Data"
    fileName: Optional[str] = None
    fileData: Optional[str] = None

class UpdateAssetRequest(BaseModel):
    companyName: Optional[str] = None
    assetType: Optional[str] = None
    name: Optional[str] = None
    value: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    folder: Optional[str] = None
    fileName: Optional[str] = None
    fileData: Optional[str] = None

@router.get("/")
def get_assets(user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    assets = db.query(CompanyAsset).all()
    return assets

@router.post("/")
def create_asset(req: CreateAssetRequest, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    if user.get('role') != 'admin':
        return JSONResponse(status_code=403, content={"error": "Only admins can manage company assets"})
    new_asset = CompanyAsset(
        id=str(uuid.uuid4()),
        companyName=req.companyName,
        assetType=req.assetType,
        name=req.name,
        value=req.value,
        notes=req.notes,
        status=req.status,
        folder=req.folder,
        fileName=req.fileName,
        fileData=req.fileData,
        updatedAt=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    )
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    return new_asset

@router.put("/{asset_id}")
def update_asset(asset_id: str, req: UpdateAssetRequest, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    if user.get('role') != 'admin':
        return JSONResponse(status_code=403, content={"error": "Only admins can manage company assets"})
    target = db.query(CompanyAsset).filter(CompanyAsset.id == asset_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Asset not found"})
    
    if req.companyName is not None: target.companyName = req.companyName  # type: ignore
    if req.assetType is not None: target.assetType = req.assetType  # type: ignore
    if req.name is not None: target.name = req.name  # type: ignore
    if req.value is not None: target.value = req.value  # type: ignore
    if req.notes is not None: target.notes = req.notes  # type: ignore
    if req.status is not None: target.status = req.status  # type: ignore
    if req.folder is not None: target.folder = req.folder  # type: ignore
    if req.fileName is not None: target.fileName = req.fileName  # type: ignore
    if req.fileData is not None: target.fileData = req.fileData  # type: ignore
    
    target.updatedAt = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")  # type: ignore
    db.commit()
    db.refresh(target)
    return target

@router.delete("/{asset_id}")
def delete_asset(asset_id: str, user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    if user.get('role') != 'admin':
        return JSONResponse(status_code=403, content={"error": "Only admins can manage company assets"})
    target = db.query(CompanyAsset).filter(CompanyAsset.id == asset_id).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Asset not found"})
    
    db.delete(target)
    db.commit()
    return {"message": "Asset deleted successfully"}
