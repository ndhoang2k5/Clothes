
from sqlalchemy.orm import Session
from ...entities import models
from ..serializers import serialize_product
from sqlalchemy.orm import selectinload

class UserProductService:
    @staticmethod
    def get_active_products(db: Session, category_slug: str = None):
        query = (
            db.query(models.Product)
            .options(
                selectinload(models.Product.images),
                selectinload(models.Product.variants).selectinload(models.ProductVariant.images),
                selectinload(models.Product.category),
            )
            .filter(models.Product.is_active == True)  # noqa: E712
        )
        if category_slug:
            query = query.join(models.Category).filter(models.Category.slug == category_slug)
        return [serialize_product(p) for p in query.all()]

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
