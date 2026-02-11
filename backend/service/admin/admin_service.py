
from sqlalchemy.orm import Session
from ...entities import models

class AdminService:
    @staticmethod
    def get_all_orders(db: Session):
        return db.query(models.Order).order_by(models.Order.created_at.desc()).all()

    @staticmethod
    def create_product(db: Session, data: dict):
        product = models.Product(**data)
        db.add(product)
        db.commit()
        db.refresh(product)
        return product
