"""
CustomerService – Phase A.2.
Dùng cho admin (list/get/create/update) và sau này cho Order (find_by_email, link customer_id).
"""
from sqlalchemy.orm import Session
from ..entities import models


class CustomerService:
    @staticmethod
    def get_by_id(db: Session, customer_id: int):
        return db.query(models.Customer).filter(models.Customer.id == customer_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str):
        if not email or not str(email).strip():
            return None
        return db.query(models.Customer).filter(models.Customer.email == str(email).strip()).first()

    @staticmethod
    def list(
        db: Session,
        q: str | None = None,
        page: int = 1,
        per_page: int = 30,
    ):
        query = db.query(models.Customer)
        if q and str(q).strip():
            term = f"%{str(q).strip()}%"
            query = query.filter(
                (models.Customer.name.ilike(term))
                | (models.Customer.email.ilike(term))
                | (models.Customer.phone.ilike(term))
            )
        total = query.order_by(None).count()
        query = query.order_by(models.Customer.updated_at.desc(), models.Customer.id.desc())
        if per_page and per_page > 0:
            page = max(1, page)
            offset = (page - 1) * per_page
            items = query.limit(per_page).offset(offset).all()
        else:
            items = query.all()
            page = 1
            per_page = 0
        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
        }

    @staticmethod
    def create(db: Session, data: dict):
        payload = {
            k: v for k, v in data.items()
            if k in ("name", "phone", "email", "password_hash", "default_address")
        }
        if "email" in payload and payload["email"]:
            payload["email"] = str(payload["email"]).strip()
        customer = models.Customer(**payload)
        db.add(customer)
        db.commit()
        db.refresh(customer)
        return customer

    @staticmethod
    def update(db: Session, customer_id: int, data: dict):
        customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
        if not customer:
            return None
        for k in ("name", "phone", "email", "password_hash", "default_address"):
            if k in data:
                v = data[k]
                if k == "email" and v is not None:
                    v = str(v).strip()
                setattr(customer, k, v)
        import datetime
        customer.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(customer)
        return customer
