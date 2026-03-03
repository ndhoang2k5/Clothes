
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from ...service.admin.admin_service import AdminService
from ...database_config import get_db
from pathlib import Path
import uuid

router = APIRouter()

@router.get("/orders")
def get_orders(db: Session = Depends(get_db)):
    return AdminService.get_all_orders(db)

@router.post("/products")
def create_product(data: dict, db: Session = Depends(get_db)):
    return AdminService.create_product(db, data)


@router.get("/banners")
def list_banners(slot: str | None = None, active_only: bool = True, db: Session = Depends(get_db)):
    return AdminService.list_banners(db, slot=slot, active_only=active_only)


@router.post("/banners")
def create_banner(data: dict, db: Session = Depends(get_db)):
    return AdminService.create_banner(db, data)


@router.put("/banners/{banner_id}")
def update_banner(banner_id: int, data: dict, db: Session = Depends(get_db)):
    updated = AdminService.update_banner(db, banner_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Banner not found")
    return updated


@router.delete("/banners/{banner_id}")
def delete_banner(banner_id: int, db: Session = Depends(get_db)):
    ok = AdminService.delete_banner(db, banner_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"ok": True}


@router.post("/upload-image")
def upload_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")

    backend_dir = Path(__file__).resolve().parents[2]  # backend/
    upload_dir = backend_dir / "static" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "").suffix.lower()
    if ext not in [".png", ".jpg", ".jpeg", ".webp", ".gif"]:
        ext = ".png"

    name = f"{uuid.uuid4().hex}{ext}"
    dst = upload_dir / name
    with dst.open("wb") as f:
        f.write(file.file.read())

    return {"url": f"/static/uploads/{name}"}
