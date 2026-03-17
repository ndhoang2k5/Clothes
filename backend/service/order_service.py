"""
OrderService – Phase A.5.
create_order: resolve cart items (giá hiện tại DB), voucher, shipping; lưu Order + OrderItem trong 1 transaction.
"""
import datetime
import random
import string
from decimal import Decimal
from sqlalchemy.orm import Session
from ..entities import models
from .voucher_service import VoucherService
from .shipping_service import ShippingService


def _get_unit_price(product, variant=None):
    """Đơn giá bán tại thời điểm: ưu tiên variant override, else product."""
    if variant is not None:
        p = variant.discount_price_override if getattr(variant, "discount_price_override", None) is not None else variant.price_override
        if p is not None:
            return float(p)
    # from product
    if getattr(product, "discount_price", None) is not None:
        return float(product.discount_price)
    return float(product.base_price or 0)


def _variant_label(variant):
    if not variant:
        return None
    parts = []
    if getattr(variant, "size", None):
        parts.append(str(variant.size))
    if getattr(variant, "color", None):
        parts.append(str(variant.color))
    return " / ".join(parts) if parts else None


def _generate_order_code():
    prefix = "ORD"
    date = datetime.datetime.utcnow().strftime("%Y%m%d")
    rnd = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}-{date}-{rnd}"


class OrderService:
    @staticmethod
    def create_order(db: Session, payload: dict):
        """
        payload: {
          "customer": { "name", "phone", "email?", "address" },
          "items": [ { "productId": int, "variantId": int?, "quantity": int } ],
          "voucherCode": str?,
          "note": str?
        }
        Trả về Order đã lưu (có id, order_code, items). Raise ValueError nếu dữ liệu không hợp lệ.
        """
        customer = payload.get("customer") or {}
        name = (customer.get("name") or "").strip()
        phone = (customer.get("phone") or "").strip()
        address = (customer.get("address") or "").strip()
        if not name or not phone or not address:
            raise ValueError("Thiếu thông tin khách hàng: name, phone, address là bắt buộc")

        raw_items = payload.get("items") or []
        if not raw_items:
            raise ValueError("Giỏ hàng trống")

        resolved_items = []
        subtotal = Decimal("0")

        for raw in raw_items:
            product_id = raw.get("productId")
            variant_id = raw.get("variantId")
            try:
                qty = int(raw.get("quantity") or 0)
            except (TypeError, ValueError):
                qty = 0
            if not product_id or qty <= 0:
                continue

            product = db.query(models.Product).filter(models.Product.id == int(product_id)).first()
            if not product:
                raise ValueError(f"Sản phẩm id {product_id} không tồn tại")

            variant = None
            if variant_id:
                variant = (
                    db.query(models.ProductVariant)
                    .filter(
                        models.ProductVariant.id == int(variant_id),
                        models.ProductVariant.product_id == product.id,
                    )
                    .first()
                )
                if not variant:
                    raise ValueError(f"Biến thể id {variant_id} không tồn tại hoặc không thuộc sản phẩm")

            unit_price = _get_unit_price(product, variant)
            line_total = Decimal(str(unit_price)) * qty
            product_name = product.name or f"#{product.id}"
            variant_label = _variant_label(variant)

            resolved_items.append({
                "product_id": product.id,
                "variant_id": variant.id if variant else None,
                "product_name": product_name,
                "variant_label": variant_label,
                "quantity": qty,
                "unit_price": Decimal(str(unit_price)),
                "line_total": line_total,
            })
            subtotal += line_total

        if not resolved_items:
            raise ValueError("Không có dòng hàng hợp lệ")

        subtotal_float = float(subtotal)
        voucher_code = (payload.get("voucherCode") or "").strip()
        voucher_discount = Decimal("0")
        if voucher_code:
            vres = VoucherService.validate_voucher(db, voucher_code, subtotal_float)
            if vres.get("ok"):
                voucher_discount = Decimal(str(vres.get("discount_amount") or 0))
            else:
                raise ValueError(vres.get("reason") or "Mã giảm giá không hợp lệ")

        ship = ShippingService.calculate_fee(db, subtotal_float)
        shipping_fee = Decimal(str(ship["finalFee"]))
        total_amount = subtotal - voucher_discount + shipping_fee
        total_amount = max(Decimal("0"), total_amount)

        order_code = _generate_order_code()
        while db.query(models.Order).filter(models.Order.order_code == order_code).first():
            order_code = _generate_order_code()

        order = models.Order(
            order_code=order_code,
            customer_name=name,
            phone=phone,
            email=(customer.get("email") or "").strip() or None,
            address=address,
            note=(payload.get("note") or "").strip() or None,
            status="pending",
            subtotal=subtotal,
            discount_total=voucher_discount,
            shipping_fee=shipping_fee,
            total_amount=total_amount,
        )
        db.add(order)
        db.flush()

        for it in resolved_items:
            db.add(models.OrderItem(
                order_id=order.id,
                product_id=it["product_id"],
                variant_id=it["variant_id"],
                product_name=it["product_name"],
                variant_label=it["variant_label"],
                quantity=it["quantity"],
                unit_price=it["unit_price"],
                line_total=it["line_total"],
            ))

        if voucher_code and voucher_discount > 0:
            VoucherService.consume_voucher(db, voucher_code)

        db.commit()
        db.refresh(order)
        order = db.query(models.Order).filter(models.Order.id == order.id).first()
        return order

    @staticmethod
    def get_by_id(db: Session, order_id: int):
        return (
            db.query(models.Order)
            .filter(models.Order.id == order_id)
            .first()
        )

    @staticmethod
    def get_all_orders(db: Session, page: int = 1, per_page: int = 50):
        query = db.query(models.Order).order_by(models.Order.created_at.desc())
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
