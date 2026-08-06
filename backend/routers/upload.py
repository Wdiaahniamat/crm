from fastapi import APIRouter, UploadFile, File, Depends
from fastapi.responses import JSONResponse
import os
import uuid
import shutil
from middleware.auth import auth_required

router = APIRouter()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(auth_required)):
    try:
        # Generate a unique filename to prevent collisions
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"url": f"/uploads/{unique_filename}", "fileName": file.filename}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to upload file: {str(e)}"})
