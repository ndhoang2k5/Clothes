
from sqlalchemy.orm import Session
from ...entities import models
from ..serializers import serialize_product, serialize_product_list_item
from sqlalchemy.orm import selectinload

class UserProductService:
    @staticmethod
    def get_active_products(db: Session, category_slug: str = None, page: int = 1, per_page: int = 24):
        query = (
            db.query(models.Product)
            .options(
                selectinload(models.Product.images),
                selectinload(models.Product.variants),
                selectinload(models.Product.category),
            )
            .filter(models.Product.is_active == True)  # noqa: E712
        )
        if category_slug:
            query = query.join(models.Category).filter(models.Category.slug == category_slug)
        query = query.order_by(models.Product.updated_at.desc(), models.Product.id.desc())
        total = query.count()
        if per_page and per_page > 0:
            page = max(1, page)
            offset = (page - 1) * per_page
            items = query.limit(per_page).offset(offset).all()
            return {
                "items": [serialize_product_list_item(p) for p in items],
                "total": total,
                "page": page,
                "per_page": per_page,
            }
        return {
            "items": [serialize_product_list_item(p) for p in query.all()],
            "total": total,
            "page": 1,
            "per_page": 0,
        }

    @staticmethod
    def get_active_product(db: Session, product_id: int):
        return (
            db.query(models.Product)
            .options(
                selectinload(models.Product.images),
                selectinload(models.Product.variants).selectinload(models.ProductVariant.images),
                selectinload(models.Product.category),
            )
            .filter(models.Product.id == product_id)
            .filter(models.Product.is_active == True)  # noqa: E712
            .first()
        )
