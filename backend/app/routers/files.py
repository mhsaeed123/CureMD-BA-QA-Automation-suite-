import os
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
import shutil

router = APIRouter(prefix="/files", tags=["files"])

ALLOWED_DIRS = os.getenv("ALLOWED_DIRECTORIES", "./data").split(":")

@router.get("/list")
def list_files(path: str = ""):
    # Basic security check to ensure we only look inside allowed dirs
    # This is a simplified implementation. In prod, use robust path traversal checks.
    base_path = ALLOWED_DIRS[0] # Default to first allowed dir for simplicity
    target_path = os.path.join(base_path, path)

    # Path traversal check
    if not os.path.abspath(target_path).startswith(os.path.abspath(base_path)):
        raise HTTPException(status_code=403, detail="Access denied: Invalid path")

    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="Path not found")

    items = []
    for entry in os.scandir(target_path):
        items.append({
            "name": entry.name,
            "is_dir": entry.is_dir(),
            "path": os.path.join(path, entry.name),
            "size": entry.stat().st_size if not entry.is_dir() else 0
        })
    return items

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), path: str = ""):
    base_path = ALLOWED_DIRS[0]
    target_dir = os.path.join(base_path, path)

    # Path traversal check
    if not os.path.abspath(target_dir).startswith(os.path.abspath(base_path)):
        raise HTTPException(status_code=403, detail="Access denied: Invalid path")

    if not os.path.exists(target_dir):
        os.makedirs(target_dir, exist_ok=True)

    file_location = os.path.join(target_dir, file.filename)
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"filename": file.filename, "location": file_location}
