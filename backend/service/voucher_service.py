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
    def list_auto_active(db: Session):
        """Danh sách voucher tự động còn hiệu lực (chưa kiểm min_order_total)."""
        now = datetime.datetime.utcnow()
        query = db.query(models.Voucher).filter(
            models.Voucher.is_active == True,  # noqa: E712
            models.Voucher.auto_apply == True,  # noqa: E712
        )
        query = query.filter(
            (models.Voucher.valid_from.is_(None)) | (models.Voucher.valid_from <= now)
        ).filter(
            (models.Voucher.valid_to.is_(None)) | (models.Voucher.valid_to >= now)
        )
        query = query.order_by(models.Voucher.min_order_total.desc(), models.Voucher.id.desc())
        return query.all()

    @staticmethod
    def calc_discount_amount(voucher: models.Voucher, cart_total: float) -> float:
        """Tính discount theo voucher, có clamp theo max_discount và subtotal."""
        if getattr(voucher, "type", "fixed") == "product":
            return 0.0
        try:
            total = float(cart_total) if cart_total is not None else 0
        except (TypeError, ValueError):
            total = 0
        value = float(voucher.value or 0)
        if voucher.type == "percent":
            discount = total * (value / 100)
            if voucher.max_discount is not None:
                cap = float(voucher.max_discount)
                discount = min(discount, cap)
        else:
            discount = value
        discount = max(0.0, min(discount, total))
        return round(float(discount), 2)

    @staticmethod
    def pick_best_auto_voucher(db: Session, cart_total: float):
        """Chọn voucher tự động tốt nhất (discount) cho cart_total. Backward-compat wrapper."""
        best_disc, _, best_gift, _ = VoucherService.pick_auto_vouchers(db, cart_total)
        if best_disc:
            return best_disc, VoucherService.calc_discount_amount(best_disc, cart_total)
        if best_gift:
            return best_gift, 0.0
        return None, 0.0

    @staticmethod
    def pick_auto_vouchers(db: Session, cart_total: float):
        """Trả (best_discount_voucher, discount_amount, best_gift_voucher, gift_voucher).
        Cho phép áp cả discount + gift đồng thời."""
        try:
            total = float(cart_total) if cart_total is not None else 0
        except (TypeError, ValueError):
            total = 0
        best = None
        best_discount = 0.0
        best_product_gift = None
        for v in VoucherService.list_auto_active(db):
            min_total = float(v.min_order_total or 0)
            if total < min_total:
                continue
            if v.usage_limit is not None and (v.used_count or 0) >= v.usage_limit:
                continue
            if getattr(v, "type", "fixed") == "product":
                if best_product_gift is None:
                    best_product_gift = v
                continue
            disc = VoucherService.calc_discount_amount(v, total)
            if disc > best_discount:
                best = v
                best_discount = disc
        return best, best_discount, best_product_gift, best_product_gift
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
        query = db.query(models.Voucher)
        if q and str(q).strip():
            term = f"%{str(q).strip()}%"
            query = query.filter(models.Voucher.code.ilike(term))
        if is_active is not None:
            query = query.filter(models.Voucher.is_active == is_active)
        total = query.order_by(None).count()
        query = query.order_by(models.Voucher.created_at.desc(), models.Voucher.id.desc())
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

        if voucher.type == "product":
            return {
                "ok": True,
                "discount_amount": 0,
                "voucher_type": "product",
                "gift_product_name": getattr(voucher, "display_name", None) or "Quà tặng",
                "gift_product_image": getattr(voucher, "image_url", None),
                "reason": None,
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
            return {"ok": True, "discount_amount": 0, "voucher_type": voucher.type, "reason": None}
        discount = round(discount, 2)
        return {"ok": True, "discount_amount": discount, "voucher_type": voucher.type, "reason": None}

    @staticmethod
    def consume_voucher(db: Session, code: str) -> bool:
        """Tăng used_count sau khi order thành công. Trả về True nếu cập nhật thành công."""
        voucher = VoucherService.get_by_code(db, code)
        if not voucher:
            return False
        voucher.used_count = (voucher.used_count or 0) + 1
        voucher.updated_at = datetime.datetime.utcnow()
        # commit có thể do caller (OrderService) quản lý trong 1 transaction
        return True

    @staticmethod
    def create(db: Session, data: dict):
        payload = {
            k: v for k, v in data.items()
            if k in ("code", "display_name", "image_url", "type", "value", "min_order_total", "max_discount", "usage_limit",
                     "used_count", "valid_from", "valid_to", "is_active", "auto_apply")
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
        for k in ("code", "display_name", "image_url", "type", "value", "min_order_total", "max_discount", "usage_limit",
                  "used_count", "valid_from", "valid_to", "is_active", "auto_apply"):
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
