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
        "images": [
            {
                "id": img.id,
                "image_url": img.image_url,
                "alt_text": getattr(img, "alt_text", None),
                "sort_order": getattr(img, "sort_order", 0),
                "is_primary": getattr(img, "is_primary", False),
            }
            for img in sorted(getattr(variant, "images", []) or [], key=lambda x: (getattr(x, "sort_order", 0), x.id))
        ],
    }


def serialize_product(product) -> dict:
    imgs = sorted(getattr(product, "images", []) or [], key=lambda x: (getattr(x, "sort_order", 0), x.id))
    primary = next((i for i in imgs if getattr(i, "is_primary", False)), None) or (imgs[0] if imgs else None)

    return {
        "id": product.id,
        "category_id": product.category_id,
        "category_slug": getattr(getattr(product, "category", None), "slug", None),
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
        "primary_image_url": primary.image_url if primary else None,
        "images": [
            {
                "id": img.id,
                "image_url": img.image_url,
                "alt_text": getattr(img, "alt_text", None),
                "sort_order": getattr(img, "sort_order", 0),
                "is_primary": getattr(img, "is_primary", False),
            }
            for img in imgs
        ],
        "variants": [serialize_variant(v) for v in getattr(product, "variants", [])],
        "combo_items": [
            {
                "combo_product_id": getattr(ci, "combo_product_id", None),
                "component_variant_id": getattr(ci, "component_variant_id", None),
                "quantity": getattr(ci, "quantity", 1),
            }
            for ci in getattr(product, "combo_components", []) or []
        ],
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


def _normalize_banner_image_url(url: Any) -> str:
    """Chuẩn hóa URL thành path (dùng khi lưu DB)."""
    if not url or not isinstance(url, str):
        return ""
    u = url.strip()
    if u.startswith("http://") or u.startswith("https://"):
        try:
            from urllib.parse import urlparse
            u = urlparse(u).path or u
        except Exception:
            pass
    return u if u.startswith("/") else f"/{u}"


def _banner_image_url_for_response(url: Any) -> str:
    """Trả về path (/static/uploads/...) cho client; nếu không chuẩn thì vẫn trả giá trị gốc (path/URL) để ảnh vẫn có thể hiển thị."""
    if url is None:
        return ""
    raw = (url.strip() if isinstance(url, str) else str(url)).strip()
    if not raw:
        return ""
    path = _normalize_banner_image_url(raw)
    if path and "/static/uploads/" in path:
        return path
    return raw


def serialize_banner(banner) -> dict:
    raw_image = getattr(banner, "image_url", None) or ""
    return {
        "id": banner.id,
        "slot": banner.slot,
        "sort_order": banner.sort_order,
        "image_url": _banner_image_url_for_response(raw_image),
        "title": banner.title,
        "subtitle": getattr(banner, "subtitle", None),
        "link_url": banner.link_url,
        "is_active": banner.is_active,
        "created_at": _dt(getattr(banner, "created_at", None)),
        "updated_at": _dt(getattr(banner, "updated_at", None)),
    }


def serialize_category(category) -> dict:
    return {
        "id": category.id,
        "parent_id": getattr(category, "parent_id", None),
        "name": category.name,
        "slug": category.slug,
        "icon": getattr(category, "icon", None),
        "image_url": getattr(category, "image_url", None),
        "description": getattr(category, "description", None),
        "is_active": getattr(category, "is_active", True),
        "sort_order": getattr(category, "sort_order", 0),
        "created_at": _dt(getattr(category, "created_at", None)),
        "updated_at": _dt(getattr(category, "updated_at", None)),
    }

