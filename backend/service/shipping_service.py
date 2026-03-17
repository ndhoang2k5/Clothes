"""
ShippingService – Phase A.4.
Tính phí ship theo bảng shipping_rules: chọn rule có min_order_total lớn nhất mà ≤ cart_total.
Trả về baseFee, discountFromShipping, finalFee.
"""
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..entities import models


class ShippingService:
    @staticmethod
    def calculate_fee(db: Session, cart_total: float) -> dict:
        """
        cart_total: tổng tiền hàng (subtotal).
        Trả về: { "baseFee": float, "discountFromShipping": float, "finalFee": float, "ruleId": int | None }.
        """
        try:
            total = float(cart_total) if cart_total is not None else 0
        except (TypeError, ValueError):
            total = 0

        rule = (
            db.query(models.ShippingRule)
            .filter(
                models.ShippingRule.is_active == True,  # noqa: E712
                models.ShippingRule.min_order_total <= total,
            )
            .order_by(desc(models.ShippingRule.min_order_total))
            .first()
        )

        if not rule:
            return {
                "baseFee": 0,
                "discountFromShipping": 0,
                "finalFee": 0,
                "ruleId": None,
            }

        base_fee = float(rule.base_fee or 0)
        discount = 0.0
        if rule.discount_type == "free":
            discount = base_fee
        elif rule.discount_type == "percent":
            value = float(rule.discount_value or 0)
            discount = base_fee * (value / 100)
        else:  # fixed
            discount = float(rule.discount_value or 0)

        discount = min(discount, base_fee)
        final_fee = max(0, round(base_fee - discount, 2))

        return {
            "baseFee": round(base_fee, 2),
            "discountFromShipping": round(discount, 2),
            "finalFee": final_fee,
            "ruleId": rule.id,
        }

    @staticmethod
    def list(db: Session, active_only: bool | None = None):
        query = (
            db.query(models.ShippingRule)
            .order_by(models.ShippingRule.min_order_total.asc(), models.ShippingRule.sort_order.asc())
        )
        if active_only is not None:
            query = query.filter(models.ShippingRule.is_active == active_only)
        return query.all()

    @staticmethod
    def get_by_id(db: Session, rule_id: int):
        return db.query(models.ShippingRule).filter(models.ShippingRule.id == rule_id).first()

    @staticmethod
    def create(db: Session, data: dict):
        payload = {
            k: v for k, v in data.items()
            if k in ("min_order_total", "base_fee", "discount_type", "discount_value", "is_active", "sort_order")
        }
        for key in ("min_order_total", "base_fee", "discount_value"):
            if key in payload and payload[key] is not None:
                payload[key] = Decimal(str(payload[key]))
        if "discount_type" not in payload:
            payload["discount_type"] = "fixed"
        rule = models.ShippingRule(**payload)
        db.add(rule)
        db.commit()
        db.refresh(rule)
        return rule

    @staticmethod
    def update(db: Session, rule_id: int, data: dict):
        rule = db.query(models.ShippingRule).filter(models.ShippingRule.id == rule_id).first()
        if not rule:
            return None
        for k in ("min_order_total", "base_fee", "discount_type", "discount_value", "is_active", "sort_order"):
            if k in data:
                v = data[k]
                if k in ("min_order_total", "base_fee", "discount_value") and v is not None:
                    v = Decimal(str(v))
                setattr(rule, k, v)
        import datetime
        rule.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(rule)
        return rule

    @staticmethod
    def delete(db: Session, rule_id: int) -> bool:
        rule = db.query(models.ShippingRule).filter(models.ShippingRule.id == rule_id).first()
        if not rule:
            return False
        db.delete(rule)
        db.commit()
        return True
