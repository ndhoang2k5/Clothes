import datetime
from decimal import Decimal
from typing import Any, Optional


def _num(v: Any) -> Optional[float]:
    if v is None:
        return None
    if isinstance(v, Decimal):
        return float(v)
    return float(v)


def _dt(v: Any) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.isoformat()
    return str(v)


def serialize_variant(variant) -> dict:
    return {
        "id": variant.id,
        "product_id": variant.product_id,
        "sku": getattr(variant, "sku", None),
        "size": variant.size,
        "color": variant.color,
        "material": getattr(variant, "material", None),
        "stock": variant.stock,
        "price_override": _num(getattr(variant, "price_override", None)),
        "discount_price_override": _num(getattr(variant, "discount_price_override", None)),
        "is_active": getattr(variant, "is_active", True),
        "created_at": _dt(getattr(variant, "created_at", None)),
        "updated_at": _dt(getattr(variant, "updated_at", None)),
    }


def serialize_product(product) -> dict:
    return {
        "id": product.id,
        "category_id": product.category_id,
        "name": product.name,
        "slug": getattr(product, "slug", None),
        "description": product.description,
        "base_price": _num(product.base_price),
        "discount_price": _num(product.discount_price),
        "currency": getattr(product, "currency", "VND"),
        "kind": getattr(product, "kind", "single"),
        "is_active": getattr(product, "is_active", True),
        "is_hot": product.is_hot,
        "is_new": product.is_new,
        "is_sale": getattr(product, "is_sale", False),
        "created_at": _dt(getattr(product, "created_at", None)),
        "updated_at": _dt(getattr(product, "updated_at", None)),
        "variants": [serialize_variant(v) for v in getattr(product, "variants", [])],
    }


def serialize_order_item(item) -> dict:
    return {
        "id": item.id,
        "order_id": item.order_id,
        "product_id": item.product_id,
        "variant_id": item.variant_id,
        "product_name": item.product_name,
        "variant_label": item.variant_label,
        "quantity": item.quantity,
        "unit_price": _num(item.unit_price),
        "line_total": _num(item.line_total),
    }


def serialize_order(order) -> dict:
    return {
        "id": order.id,
        "order_code": getattr(order, "order_code", None),
        "customer_name": order.customer_name,
        "phone": order.phone,
        "email": getattr(order, "email", None),
        "address": order.address,
        "note": getattr(order, "note", None),
        "status": order.status,
        "subtotal": _num(getattr(order, "subtotal", None)),
        "discount_total": _num(getattr(order, "discount_total", None)),
        "shipping_fee": _num(getattr(order, "shipping_fee", None)),
        "total_amount": _num(order.total_amount),
        "created_at": _dt(getattr(order, "created_at", None)),
        "updated_at": _dt(getattr(order, "updated_at", None)),
        "items": [serialize_order_item(i) for i in getattr(order, "items", [])],
    }


def serialize_banner(banner) -> dict:
    return {
        "id": banner.id,
        "slot": banner.slot,
        "sort_order": banner.sort_order,
        "image_url": banner.image_url,
        "title": banner.title,
        "subtitle": getattr(banner, "subtitle", None),
        "link_url": banner.link_url,
        "is_active": banner.is_active,
        "created_at": _dt(getattr(banner, "created_at", None)),
        "updated_at": _dt(getattr(banner, "updated_at", None)),
    }

