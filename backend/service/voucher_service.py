"""
VoucherService – Phase A.3 / A.5.
- validate_voucher: kiểm tra mã và tính số tiền giảm.
- consume_voucher: tăng used_count sau khi đặt đơn thành công.
- CRUD cho admin.
"""
import datetime
import json
from decimal import Decimal
from sqlalchemy.orm import Session
from ..entities import models


def _code_upper(code: str) -> str:
    return (code or "").strip().upper()


class VoucherService:
    @staticmethod
    def _safe_float(value, default: float = 0.0) -> float:
        try:
            if value is None:
                return default
            return float(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _cart_matches_order_window(voucher: models.Voucher, cart_total: float) -> bool:
        total = VoucherService._safe_float(cart_total, 0)
        min_total = VoucherService._safe_float(voucher.min_order_total, 0)
        if total < min_total:
            return False
        max_o = getattr(voucher, "max_order_total", None)
        if max_o is not None:
            if total > VoucherService._safe_float(max_o, -1):
                return False
        return True

    @staticmethod
    def _effective_percent_value(voucher: models.Voucher):
        pv = getattr(voucher, "percent_value", None)
        if pv is not None:
            return max(0.0, VoucherService._safe_float(pv, 0))
        if getattr(voucher, "type", "fixed") == "percent":
            return max(0.0, VoucherService._safe_float(getattr(voucher, "value", 0), 0))
        return None

    @staticmethod
    def _effective_fixed_value(voucher: models.Voucher):
        fv = getattr(voucher, "fixed_value", None)
        if fv is not None:
            return max(0.0, VoucherService._safe_float(fv, 0))
        if getattr(voucher, "type", "fixed") == "fixed":
            return max(0.0, VoucherService._safe_float(getattr(voucher, "value", 0), 0))
        # Backward-compatible fallback: combo cũ có thể chỉ dùng value.
        if getattr(voucher, "type", "fixed") == "combo":
            return max(0.0, VoucherService._safe_float(getattr(voucher, "value", 0), 0))
        return None

    @staticmethod
    def _gift_payload(voucher: models.Voucher) -> tuple[str | None, str | None]:
        gift_name = (getattr(voucher, "gift_name", None) or "").strip() or None
        gift_image = (getattr(voucher, "gift_image_url", None) or "").strip() or None
        # Legacy mapping for old product voucher schema.
        if gift_name is None and (getattr(voucher, "type", "fixed") == "product"):
            gift_name = (getattr(voucher, "display_name", None) or "").strip() or "Quà tặng"
        if gift_image is None and (getattr(voucher, "type", "fixed") == "product"):
            gift_image = (getattr(voucher, "image_url", None) or "").strip() or None
        return gift_name, gift_image

    @staticmethod
    def has_gift(voucher: models.Voucher) -> bool:
        name, image = VoucherService._gift_payload(voucher)
        return bool(name or image)

    @staticmethod
    def _discount_breakdown(voucher: models.Voucher, cart_total: float) -> dict:
        total = VoucherService._safe_float(cart_total, 0)
        if total <= 0:
            return {"percent_discount": 0.0, "fixed_discount": 0.0, "discount_amount": 0.0}

        percent_value = VoucherService._effective_percent_value(voucher)
        fixed_value = VoucherService._effective_fixed_value(voucher)

        percent_discount = 0.0
        if percent_value is not None and percent_value > 0:
            percent_discount = total * (percent_value / 100.0)
            if voucher.max_discount is not None:
                percent_discount = min(percent_discount, VoucherService._safe_float(voucher.max_discount, percent_discount))

        fixed_discount = 0.0
        if fixed_value is not None and fixed_value > 0:
            fixed_discount = fixed_value

        discount = max(percent_discount, fixed_discount)
        discount = max(0.0, min(discount, total))
        return {
            "percent_discount": round(float(percent_discount), 2),
            "fixed_discount": round(float(fixed_discount), 2),
            "discount_amount": round(float(discount), 2),
        }

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
        """Tính discount theo voucher, hỗ trợ combo (%/tiền đồng thời)."""
        breakdown = VoucherService._discount_breakdown(voucher, cart_total)
        return breakdown["discount_amount"]

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
        total = VoucherService._safe_float(cart_total, 0)
        best = None
        best_discount = 0.0
        best_product_gift = None
        for v in VoucherService.list_auto_active(db):
            if not VoucherService._cart_matches_order_window(v, total):
                continue
            if v.usage_limit is not None and (v.used_count or 0) >= v.usage_limit:
                continue
            if VoucherService.has_gift(v) and best_product_gift is None:
                best_product_gift = v
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
        total = VoucherService._safe_float(cart_total, 0)
        min_total = VoucherService._safe_float(voucher.min_order_total, 0)
        if total < min_total:
            return {
                "ok": False,
                "discount_amount": None,
                "reason": f"Đơn tối thiểu {min_total:,.0f} để áp dụng mã",
            }
        max_o = getattr(voucher, "max_order_total", None)
        if max_o is not None:
            mx = VoucherService._safe_float(max_o, 0)
            if total > mx:
                return {
                    "ok": False,
                    "discount_amount": None,
                    "reason": f"Chỉ áp dụng cho đơn tối đa {mx:,.0f}đ",
                }

        discount = VoucherService.calc_discount_amount(voucher, total)
        gift_name, gift_image = VoucherService._gift_payload(voucher)

        resp = {
            "ok": True,
            "discount_amount": discount,
            "voucher_type": getattr(voucher, "type", "fixed"),
            "reason": None,
        }
        if gift_name:
            resp["gift_product_name"] = gift_name
        if gift_image:
            resp["gift_product_image"] = gift_image
        return resp

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
    def _normalize_benefits_payload(data: dict) -> None:
        if "benefits" not in data:
            return
        b = data.pop("benefits")
        if b is None:
            data["benefits_json"] = None
        elif isinstance(b, list):
            lines = [str(x).strip() for x in b if str(x).strip()]
            data["benefits_json"] = json.dumps(lines, ensure_ascii=False) if lines else None
        elif isinstance(b, str):
            lines = [ln.strip() for ln in b.splitlines() if ln.strip()]
            data["benefits_json"] = json.dumps(lines, ensure_ascii=False) if lines else None

    @staticmethod
    def create(db: Session, data: dict):
        data = dict(data or {})
        VoucherService._normalize_benefits_payload(data)
        payload = {
            k: v for k, v in data.items()
            if k in (
                "code", "display_name", "image_url", "type", "value", "min_order_total", "max_order_total",
                "max_discount", "usage_limit", "used_count", "valid_from", "valid_to", "is_active", "auto_apply",
                "show_on_homepage", "homepage_sort_order", "card_theme", "card_icon", "benefits_json", "terms_text",
                "order_condition_mode", "percent_value", "fixed_value", "gift_name", "gift_image_url", "gift_product_id",
            )
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
        if "max_order_total" in payload:
            v = payload["max_order_total"]
            payload["max_order_total"] = None if v is None or v == "" else Decimal(str(v))
        if "max_discount" in payload and payload["max_discount"] is not None:
            payload["max_discount"] = Decimal(str(payload["max_discount"]))
        if "percent_value" in payload and payload["percent_value"] is not None:
            payload["percent_value"] = Decimal(str(payload["percent_value"]))
        if "fixed_value" in payload and payload["fixed_value"] is not None:
            payload["fixed_value"] = Decimal(str(payload["fixed_value"]))
        if "gift_product_id" in payload and payload["gift_product_id"] is not None:
            payload["gift_product_id"] = int(payload["gift_product_id"])
        if "homepage_sort_order" in payload and payload["homepage_sort_order"] is not None:
            payload["homepage_sort_order"] = int(payload["homepage_sort_order"])
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
        data = dict(data or {})
        VoucherService._normalize_benefits_payload(data)
        for k in (
            "code", "display_name", "image_url", "type", "value", "min_order_total", "max_order_total",
            "max_discount", "usage_limit", "used_count", "valid_from", "valid_to", "is_active", "auto_apply",
            "show_on_homepage", "homepage_sort_order", "card_theme", "card_icon", "benefits_json", "terms_text",
            "order_condition_mode", "percent_value", "fixed_value", "gift_name", "gift_image_url", "gift_product_id",
        ):
            if k in data:
                v = data[k]
                if k == "code" and v is not None:
                    v = _code_upper(str(v))
                if k in ("value", "min_order_total", "max_discount", "percent_value", "fixed_value") and v is not None:
                    v = Decimal(str(v))
                if k == "max_order_total":
                    v = None if v is None or v == "" else Decimal(str(v))
                if k == "homepage_sort_order" and v is not None:
                    v = int(v)
                if k == "gift_product_id":
                    v = None if v is None or v == "" else int(v)
                setattr(voucher, k, v)
        voucher.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(voucher)
        return voucher
