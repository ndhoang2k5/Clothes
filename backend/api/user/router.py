
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...service.user.product_service import UserProductService
from ...service.admin.admin_service import AdminService
from ...database_config import get_db
from fastapi import HTTPException

router = APIRouter()

@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    return AdminService.list_categories(db, active_only=True)

@router.get("/products")
def get_products(category: str = None, db: Session = Depends(get_db)):
    return UserProductService.get_active_products(db, category)

@router.get("/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = UserProductService.get_active_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    from ...service.serializers import serialize_product
    return serialize_product(product)


@router.get("/products/{product_id}/combo-items")
def get_product_combo_items(product_id: int, db: Session = Depends(get_db)):
    items = AdminService.list_combo_items(db, product_id)
    if items is None:
        raise HTTPException(status_code=404, detail="Product not found or not combo")
    return items


@router.get("/banners")
def get_banners(slot: str | None = None, db: Session = Depends(get_db)):
    # User-facing banners: only active banners
    return AdminService.list_banners(db, slot=slot, active_only=True)
