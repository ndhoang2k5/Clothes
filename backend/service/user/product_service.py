
from sqlalchemy.orm import Session
from ...entities import models
from ..serializers import serialize_product

class UserProductService:
    @staticmethod
    def get_active_products(db: Session, category_slug: str = None):
        query = db.query(models.Product).filter(models.Product.is_active == True)  # noqa: E712
        if category_slug:
            query = query.join(models.Category).filter(models.Category.slug == category_slug)
        return [serialize_product(p) for p in query.all()]
