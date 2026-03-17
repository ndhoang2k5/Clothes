"""
VoucherService – Phase A.3 / A.5.
- validate_voucher: kiểm tra mã và tính số tiền giảm.
- consume_voucher: tăng used_count sau khi đặt đơn thành công.
- CRUD cho admin.
"""
import datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from ..entities import models


def _code_upper(code: str) -> str:
    return (code or "").strip().upper()


class VoucherService:
    @staticmethod
    def get_by_code(db: Session, code: str):
        c = _code_upper(code)
        if not c:
            return None
        return db.query(models.Voucher).filter(models.Voucher.code == c).first()

    @staticmethod
    def get_by_id(db: Session, voucher_id: int):
        return db.query(models.Voucher).filter(models.Voucher.id == voucher_id).first()

    @staticmethod
    def list(db: Session, q: str | None = None, is_active: bool | None = None, page: int = 1, per_page: int = 30):
        query = db.query(models.Voucher).order_by(models.Voucher.created_at.desc(), models.Voucher.id.desc())
        if q and str(q).strip():
            term = f"%{str(q).strip()}%"
            query = query.filter(models.Voucher.code.ilike(term))
        if is_active is not None:
            query = query.filter(models.Voucher.is_active == is_active)
        total = query.count()
        if per_page and per_page > 0:
            page = max(1, page)
            offset = (page - 1) * per_page
            items = query.limit(per_page).offset(offset).all()
        else:
            items = query.all()
            page = 1
            per_page = 0
        return {"items": items, "total": total, "page": page, "per_page": per_page}

    @staticmethod
    def validate_voucher(db: Session, code: str, cart_total: float) -> dict:
        """
        Trả về { "ok": bool, "discount_amount": float | None, "reason": str }.
        cart_total là tổng tiền hàng (subtotal) trước giảm giá.
        """
        voucher = VoucherService.get_by_code(db, code)
        if not voucher:
            return {"ok": False, "discount_amount": None, "reason": "Mã không tồn tại"}
        if not voucher.is_active:
            return {"ok": False, "discount_amount": None, "reason": "Mã đã bị tắt"}
        now = datetime.datetime.utcnow()
        if voucher.valid_from and now < voucher.valid_from:
            return {"ok": False, "discount_amount": None, "reason": "Mã chưa có hiệu lực"}
        if voucher.valid_to and now > voucher.valid_to:
            return {"ok": False, "discount_amount": None, "reason": "Mã đã hết hạn"}
        if voucher.usage_limit is not None and (voucher.used_count or 0) >= voucher.usage_limit:
            return {"ok": False, "discount_amount": None, "reason": "Mã đã hết lượt sử dụng"}
        try:
            total = float(cart_total) if cart_total is not None else 0
        except (TypeError, ValueError):
            total = 0
        min_total = float(voucher.min_order_total or 0)
        if total < min_total:
            return {
                "ok": False,
                "discount_amount": None,
                "reason": f"Đơn tối thiểu {min_total:,.0f} để áp dụng mã",
            }
        value = float(voucher.value or 0)
        if voucher.type == "percent":
            discount = total * (value / 100)
            if voucher.max_discount is not None:
                cap = float(voucher.max_discount)
                discount = min(discount, cap)
        else:
            discount = value
        if discount <= 0:
            return {"ok": True, "discount_amount": 0, "reason": None}
        discount = round(discount, 2)
        return {"ok": True, "discount_amount": discount, "reason": None}

    @staticmethod
    def consume_voucher(db: Session, code: str) -> bool:
        """Tăng used_count sau khi order thành công. Trả về True nếu cập nhật thành công."""
        voucher = VoucherService.get_by_code(db, code)
        if not voucher:
            return False
        voucher.used_count = (voucher.used_count or 0) + 1
        voucher.updated_at = datetime.datetime.utcnow()
        db.commit()
        return True

    @staticmethod
    def create(db: Session, data: dict):
        payload = {
            k: v for k, v in data.items()
            if k in ("code", "type", "value", "min_order_total", "max_discount", "usage_limit",
                     "used_count", "valid_from", "valid_to", "is_active")
        }
        if "code" in payload and payload["code"]:
            payload["code"] = _code_upper(payload["code"])
        if "type" not in payload:
            payload["type"] = "fixed"
        if "value" in payload and payload["value"] is not None:
            payload["value"] = Decimal(str(payload["value"]))
        if "min_order_total" in payload and payload["min_order_total"] is not None:
            payload["min_order_total"] = Decimal(str(payload["min_order_total"]))
        else:
            payload["min_order_total"] = Decimal("0")
        if "max_discount" in payload and payload["max_discount"] is not None:
            payload["max_discount"] = Decimal(str(payload["max_discount"]))
        voucher = models.Voucher(**payload)
        db.add(voucher)
        db.commit()
        db.refresh(voucher)
        return voucher

    @staticmethod
    def update(db: Session, voucher_id: int, data: dict):
        voucher = db.query(models.Voucher).filter(models.Voucher.id == voucher_id).first()
        if not voucher:
            return None
        for k in ("code", "type", "value", "min_order_total", "max_discount", "usage_limit",
                  "used_count", "valid_from", "valid_to", "is_active"):
            if k in data:
                v = data[k]
                if k == "code" and v is not None:
                    v = _code_upper(str(v))
                if k in ("value", "min_order_total", "max_discount") and v is not None:
                    v = Decimal(str(v))
                setattr(voucher, k, v)
        voucher.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(voucher)
        return voucher
