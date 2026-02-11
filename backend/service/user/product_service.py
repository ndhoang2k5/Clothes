
from sqlalchemy.orm import Session
from ...entities import models

class UserProductService:
    @staticmethod
    def get_active_products(db: Session, category_slug: str = None):
        query = db.query(models.Product)
        if category_slug:
            query = query.join(models.Category).filter(models.Category.slug == category_slug)
        return query.all()
