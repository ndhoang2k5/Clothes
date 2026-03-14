
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
def get_products(
    category: str | None = None,
    page: int = 1,
    per_page: int = 24,
    db: Session = Depends(get_db),
):
    return UserProductService.get_active_products(db, category, page=page, per_page=per_page)

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


@router.get("/collections")
def get_collections(db: Session = Depends(get_db)):
    """Danh sách bộ sưu tập hiển thị cho user (chỉ active)."""
    return AdminService.list_collections(db, include_inactive=False)


@router.get("/blogs")
def get_blogs(category: str | None = None, limit: int = 3, db: Session = Depends(get_db)):
    """Blog / tips cho user – chỉ bài đã publish."""
    items = AdminService.list_blogs(db, category=category, published_only=True)
    if limit and limit > 0:
        items = items[: limit]
    return items
