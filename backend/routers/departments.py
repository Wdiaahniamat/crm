from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Department
from middleware.auth import admin_only

router = APIRouter()

class CreateDepartmentRequest(BaseModel):
    name: str

@router.get("")
@router.get("/")
def get_departments(db: Session = Depends(get_db)):
    departments = db.query(Department).all()
    return [d.name for d in departments]

@router.post("")
@router.post("/")
def create_department(req: CreateDepartmentRequest, admin: dict = Depends(admin_only), db: Session = Depends(get_db)):
    existing = db.query(Department).filter(Department.name == req.name).first()
    if existing:
        return JSONResponse(status_code=400, content={"error": "Department already exists"})
    new_dept = Department(name=req.name)
    db.add(new_dept)
    db.commit()
    return [d.name for d in db.query(Department).all()]

@router.delete("/{name}")
def delete_department(name: str, admin: dict = Depends(admin_only), db: Session = Depends(get_db)):
    target = db.query(Department).filter(Department.name == name).first()
    if not target:
        return JSONResponse(status_code=404, content={"error": "Department not found"})
    db.delete(target)
    db.commit()
    return [d.name for d in db.query(Department).all()]
