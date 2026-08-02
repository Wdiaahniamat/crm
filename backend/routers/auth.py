from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
import os
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Any

from database import get_db
from models import User
from middleware.auth import JWT_SECRET

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str
    captcha_token: str
    captcha_answer: str

class ForgotPasswordRequest(BaseModel):
    username: str
    email: str
    newPassword: str

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    username = req.username
    password = req.password
    
    # Validate CAPTCHA
    try:
        decoded_captcha = jwt.decode(req.captcha_token, JWT_SECRET, algorithms=["HS256"])
        if str(decoded_captcha.get("answer")) != req.captcha_answer:
            return JSONResponse(status_code=400, content={"error": "Incorrect CAPTCHA answer"})
        if decoded_captcha.get("exp", 0) < datetime.now(timezone.utc).timestamp():
            return JSONResponse(status_code=400, content={"error": "CAPTCHA expired"})
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Invalid or missing CAPTCHA"})
    
    user = db.query(User).filter(
        (func.lower(User.username) == username.strip().lower()) |
        (func.lower(User.email) == username.strip().lower())
    ).first()
    
    if not user:
        return JSONResponse(status_code=401, content={"error": "Invalid username or password"})
    
    if user.status != 'active':
        return JSONResponse(status_code=403, content={"error": "Your account is not active yet. Wait for admin approval."})
    
    try:
        valid = bcrypt.checkpw(password.encode('utf-8'), user.passwordHash.encode('utf-8'))
    except ValueError:
        valid = False
        
    if not valid:
        return JSONResponse(status_code=401, content={"error": "Invalid username or password"})
        
    payload = {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "name": user.name,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    
    safe_user: dict[str, Any] = {c.name: getattr(user, c.name) for c in user.__table__.columns if c.name != 'passwordHash'}
    import json
    docs = safe_user.get('documents', [])
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
        safe_user['documents'] = safe_docs
        
    return {"token": token, "user": safe_user}

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        func.lower(User.username) == req.username.strip().lower(),
        func.lower(User.email) == req.email.strip().lower()
    ).first()
                
    if not user:
        return JSONResponse(status_code=404, content={"error": "No user found matching that username and email"})
        
    new_hash = bcrypt.hashpw(req.newPassword.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user.passwordHash = new_hash  # type: ignore
    db.commit()
    
    return {"message": "Password reset successfully"}

@router.get("/captcha")
def generate_captcha():
    import random
    num1 = random.randint(1, 10)
    num2 = random.randint(1, 10)
    operator = random.choice(["+", "-"])
    
    if operator == "+":
        answer = num1 + num2
        question = f"What is {num1} + {num2}?"
    else:
        # Ensure positive result for simplicity
        if num1 < num2:
            num1, num2 = num2, num1
        answer = num1 - num2
        question = f"What is {num1} - {num2}?"
        
    payload = {
        "answer": answer,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    
    return {"question": question, "token": token}
