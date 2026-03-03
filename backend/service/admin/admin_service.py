
from sqlalchemy.orm import Session
from ...entities import models
from ..serializers import serialize_banner, serialize_order, serialize_product

class AdminService:
    @staticmethod
    def get_all_orders(db: Session):
        orders = db.query(models.Order).order_by(models.Order.created_at.desc()).all()
        return [serialize_order(o) for o in orders]

    @staticmethod
    def create_product(db: Session, data: dict):
        product = models.Product(**data)
        db.add(product)
        db.commit()
        db.refresh(product)
        return serialize_product(product)

    @staticmethod
    def list_banners(db: Session, slot: str | None = None, active_only: bool = True):
        query = db.query(models.Banner)
        if slot:
            query = query.filter(models.Banner.slot == slot)
        if active_only:
            query = query.filter(models.Banner.is_active == True)  # noqa: E712
        query = query.order_by(models.Banner.slot.asc(), models.Banner.sort_order.asc(), models.Banner.id.asc())
        return [serialize_banner(b) for b in query.all()]

    @staticmethod
    def create_banner(db: Session, data: dict):
        banner = models.Banner(**data)
        db.add(banner)
        db.commit()
        db.refresh(banner)
        return serialize_banner(banner)

    @staticmethod
    def update_banner(db: Session, banner_id: int, data: dict):
        banner = db.query(models.Banner).filter(models.Banner.id == banner_id).first()
        if not banner:
            return None
        for k, v in data.items():
            if hasattr(banner, k):
                setattr(banner, k, v)
        banner.updated_at = __import__("datetime").datetime.utcnow()
        db.commit()
        db.refresh(banner)
        return serialize_banner(banner)

    @staticmethod
    def delete_banner(db: Session, banner_id: int) -> bool:
        banner = db.query(models.Banner).filter(models.Banner.id == banner_id).first()
        if not banner:
            return False
        db.delete(banner)
        db.commit()
        return True
