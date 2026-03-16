
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from ...service.user.product_service import UserProductService
from ...service.admin.admin_service import AdminService
from ...database_config import get_db
from ...entities import models

router = APIRouter()


def _ensure_clearance_category(db: Session):
    """Tạo danh mục 'Ưu đãi cuối mùa' (uu-dai-cuoi-mua) nếu chưa có."""
    cat = db.query(models.Category).filter(models.Category.slug == "uu-dai-cuoi-mua").first()
    if cat:
        return cat
    db.execute(
        text(
            "INSERT INTO categories (name, slug, icon, sort_order) "
            "VALUES ('Ưu đãi cuối mùa', 'uu-dai-cuoi-mua', '🏷️', 7) "
            "ON CONFLICT (slug) DO NOTHING"
        )
    )
    db.commit()
    return db.query(models.Category).filter(models.Category.slug == "uu-dai-cuoi-mua").first()


@router.get("/debug-clearance")
def debug_clearance(db: Session = Depends(get_db)):
    """Kiểm tra danh mục uu-dai-cuoi-mua và số sản phẩm có category_id trùng. Tự tạo danh mục nếu chưa có."""
    cat = _ensure_clearance_category(db)
    if not cat:
        return {"ok": False, "reason": "category_not_found", "hint": "Chạy database/init.sql để tạo danh mục."}
    count = db.query(models.Product).filter(
        models.Product.category_id == cat.id,
        models.Product.is_active == True,  # noqa: E712
    ).count()
    ids = [
        p.id for p in db.query(models.Product.id).filter(
            models.Product.category_id == cat.id,
            models.Product.is_active == True,  # noqa: E712
        ).limit(20).all()
    ]
    return {
        "ok": True,
        "category_id": cat.id,
        "category_slug": cat.slug,
        "product_count": count,
        "product_ids": ids,
    }


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
    if category and str(category).strip() == "uu-dai-cuoi-mua":
        _ensure_clearance_category(db)
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
