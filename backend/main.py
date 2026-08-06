import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from database import engine, Base
from routers import auth, requests, users, tasks, leaves, attendance, clients, projects, departments, events, meetings, chat, notifications, assets, announcements, company_info, upload

# Ensure all database tables are created
Base.metadata.create_all(bind=engine)

from jobs import scheduler
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(title="CRM Backend", lifespan=lifespan)

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://crm.xebright.tech"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(requests.router, prefix="/api/requests", tags=["requests"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(leaves.router, prefix="/api/leaves", tags=["leaves"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["attendance"])
app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(departments.router, prefix="/api/departments", tags=["departments"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(meetings.router, prefix="/api/meetings", tags=["meetings"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(assets.router, prefix="/api/assets", tags=["assets"])
app.include_router(announcements.router, prefix="/api/announcements", tags=["announcements"])
app.include_router(company_info.router, prefix="/api/company-info", tags=["company-info"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])

@app.get("/api/init-admin")
def init_admin():
    import uuid
    import bcrypt
    from datetime import datetime, timezone
    from models import User
    from database import SessionLocal
    
    password_bytes = "AmnaWdiaah@2026".encode('utf-8')
    hashed_password = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')
    
    db = SessionLocal()
    try:
        admin_user = User(
            id=str(uuid.uuid4()),
            name="Administrator",
            username="admin",
            email="admin@xebright.tech",
            passwordHash=hashed_password,
            role="admin",
            department="IT",
            phone="",
            status="active",
            createdAt=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            documents=[]
        )
        db.add(admin_user)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        return {"status": "error"}
    finally:
        db.close()

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    detail = exc.detail
    if isinstance(detail, dict) and "error" in detail:
        return JSONResponse(status_code=exc.status_code, content=detail)
    return JSONResponse(status_code=exc.status_code, content={"error": detail})

@app.exception_handler(404)
async def custom_404_handler(request, __):
    return JSONResponse(status_code=404, content={"error": "Not found"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
