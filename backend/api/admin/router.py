
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

@router.get("/categories")
def list_categories(active_only: bool = True, db: Session = Depends(get_db)):
    return AdminService.list_categories(db, active_only=active_only)

@router.get("/products")
def list_products(include_inactive: bool = True, db: Session = Depends(get_db)):
    return AdminService.list_products(db, include_inactive=include_inactive)

@router.get("/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = AdminService.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    # reuse serializer by calling update_product with no changes is ugly; just serialize in service
    from ...service.serializers import serialize_product
    return serialize_product(product)

@router.post("/products")
def create_product(data: dict, db: Session = Depends(get_db)):
    return AdminService.create_product(db, data)

@router.put("/products/{product_id}")
def update_product(product_id: int, data: dict, db: Session = Depends(get_db)):
    updated = AdminService.update_product(db, product_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Product not found")
    return updated

@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    ok = AdminService.delete_product(db, product_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}

@router.post("/products/{product_id}/variants")
def add_variant(product_id: int, data: dict, db: Session = Depends(get_db)):
    v = AdminService.create_variant(db, product_id, data)
    if not v:
        raise HTTPException(status_code=404, detail="Product not found")
    from ...service.serializers import serialize_variant
    return serialize_variant(v)

@router.put("/variants/{variant_id}")
def update_variant(variant_id: int, data: dict, db: Session = Depends(get_db)):
    v = AdminService.update_variant(db, variant_id, data)
    if not v:
        raise HTTPException(status_code=404, detail="Variant not found")
    from ...service.serializers import serialize_variant
    return serialize_variant(v)

@router.delete("/variants/{variant_id}")
def delete_variant(variant_id: int, db: Session = Depends(get_db)):
    ok = AdminService.delete_variant(db, variant_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Variant not found")
    return {"ok": True}

@router.post("/products/{product_id}/images")
def add_product_image(product_id: int, data: dict, db: Session = Depends(get_db)):
    img = AdminService.add_product_image(db, product_id, data)
    if not img:
        raise HTTPException(status_code=404, detail="Product not found")
    return {
        "id": img.id,
        "product_id": img.product_id,
        "image_url": img.image_url,
        "alt_text": img.alt_text,
        "sort_order": img.sort_order,
        "is_primary": img.is_primary,
    }

@router.delete("/product-images/{image_id}")
def delete_product_image(image_id: int, db: Session = Depends(get_db)):
    ok = AdminService.delete_product_image(db, image_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"ok": True}

@router.post("/variants/{variant_id}/images")
def add_variant_image(variant_id: int, data: dict, db: Session = Depends(get_db)):
    img = AdminService.add_variant_image(db, variant_id, data)
    if not img:
        raise HTTPException(status_code=404, detail="Variant not found")
    return {
        "id": img.id,
        "variant_id": img.variant_id,
        "image_url": img.image_url,
        "alt_text": img.alt_text,
        "sort_order": img.sort_order,
        "is_primary": img.is_primary,
    }

@router.delete("/variant-images/{image_id}")
def delete_variant_image(image_id: int, db: Session = Depends(get_db)):
    ok = AdminService.delete_variant_image(db, image_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"ok": True}


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
