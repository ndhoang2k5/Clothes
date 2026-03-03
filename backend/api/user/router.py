
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...service.user.product_service import UserProductService
from ...service.admin.admin_service import AdminService
from ...database_config import get_db

router = APIRouter()

@router.get("/products")
def get_products(category: str = None, db: Session = Depends(get_db)):
    return UserProductService.get_active_products(db, category)


@router.get("/banners")
def get_banners(slot: str | None = None, db: Session = Depends(get_db)):
    # User-facing banners: only active banners
    return AdminService.list_banners(db, slot=slot, active_only=True)
