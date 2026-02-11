
from sqlalchemy.orm import Session
from ..entities import models

class ProductService:
    @staticmethod
    def get_products(db: Session, category_slug: str = None):
        query = db.query(models.Product)
        if category_slug:
            query = query.join(models.Category).filter(models.Category.slug == category_slug)
        return query.all()

    @staticmethod
    def create_product(db: Session, product_data: dict):
        db_product = models.Product(**product_data)
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product

class OrderService:
    @staticmethod
    def get_all_orders(db: Session):
        return db.query(models.Order).order_by(models.Order.created_at.desc()).all()

    @staticmethod
    def create_order(db: Session, order_data: dict):
        db_order = models.Order(**order_data)
        db.add(db_order)
        db.commit()
        db.refresh(db_order)
        return db_order
