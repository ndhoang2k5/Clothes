import datetime
import re
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


def serialize_variant_list_item(variant) -> dict:
    """Lightweight variant for product listing (no images / timestamps)."""
    return {
        "id": variant.id,
        "product_id": variant.product_id,
        "sku": getattr(variant, "sku", None),
        "size": getattr(variant, "size", None),
        "color": getattr(variant, "color", None),
        "material": getattr(variant, "material", None),
        "stock": getattr(variant, "stock", 0),
        "price_override": _num(getattr(variant, "price_override", None)),
        "discount_price_override": _num(getattr(variant, "discount_price_override", None)),
        "is_active": getattr(variant, "is_active", True),
    }


def serialize_product_list_item(product) -> dict:
    """Lightweight product for listing pages (small payload)."""
    imgs = sorted(getattr(product, "images", []) or [], key=lambda x: (getattr(x, "sort_order", 0), x.id))
    primary = next((i for i in imgs if getattr(i, "is_primary", False)), None) or (imgs[0] if imgs else None)
    return {
        "id": product.id,
        "category_id": product.category_id,
        "category_slug": getattr(getattr(product, "category", None), "slug", None),
        "name": product.name,
        "slug": getattr(product, "slug", None),
        "base_price": _num(product.base_price),
        "discount_price": _num(product.discount_price),
        "currency": getattr(product, "currency", "VND"),
        "kind": getattr(product, "kind", "single"),
        "is_active": getattr(product, "is_active", True),
        "is_hot": getattr(product, "is_hot", False),
        "is_new": getattr(product, "is_new", False),
        "is_sale": getattr(product, "is_sale", False),
        "updated_at": _dt(getattr(product, "updated_at", None)),
        "primary_image_url": primary.image_url if primary else None,
        # cung cấp thêm một ít ảnh cho hiệu ứng hover (tối đa 4 ảnh)
        "image_urls": [img.image_url for img in imgs[:4]],
        "variants": [serialize_variant_list_item(v) for v in getattr(product, "variants", [])],
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


def serialize_customer(customer) -> dict:
    """Không trả về password_hash."""
    return {
        "id": customer.id,
        "name": getattr(customer, "name", None),
        "phone": getattr(customer, "phone", None),
        "email": getattr(customer, "email", None),
        "default_address": getattr(customer, "default_address", None),
        "created_at": _dt(getattr(customer, "created_at", None)),
        "updated_at": _dt(getattr(customer, "updated_at", None)),
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
    raw_note = getattr(order, "note", None)
    applied_voucher_code = None
    applied_gift_voucher_code = None
    clean_note = raw_note
    if isinstance(raw_note, str) and raw_note.strip():
        m = re.search(r"\[VOUCHER:([A-Za-z0-9_-]{1,64})\]", raw_note)
        if m:
            applied_voucher_code = m.group(1)
        mg = re.search(r"\[GIFT_VOUCHER:([A-Za-z0-9_-]{1,64})\]", raw_note)
        if mg:
            applied_gift_voucher_code = mg.group(1)
        clean_note = re.sub(r"\s*\[VOUCHER:[A-Za-z0-9_-]{1,64}\]\s*", "\n", raw_note).strip()
        clean_note = re.sub(r"\s*\[GIFT_VOUCHER:[A-Za-z0-9_-]{1,64}\]\s*", "\n", clean_note).strip()
        if applied_voucher_code or applied_gift_voucher_code:
            clean_note = re.sub(r"\n{3,}", "\n\n", clean_note)
            if clean_note == "":
                clean_note = None
    return {
        "id": order.id,
        "order_code": getattr(order, "order_code", None),
        "customer_id": getattr(order, "customer_id", None),
        "customer_name": order.customer_name,
        "phone": order.phone,
        "email": getattr(order, "email", None),
        "address": order.address,
        "note": clean_note,
        "applied_voucher_code": applied_voucher_code,
        "applied_gift_voucher_code": applied_gift_voucher_code,
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


def serialize_collection(collection) -> dict:
    items = sorted(getattr(collection, "items", []) or [], key=lambda x: (getattr(x, "sort_order", 0), x.product_id))
    return {
        "id": collection.id,
        "name": collection.name,
        "slug": getattr(collection, "slug", None),
        "description": getattr(collection, "description", None),
        "cover_image": getattr(collection, "cover_image", None),
        "is_active": getattr(collection, "is_active", True),
        "sort_order": getattr(collection, "sort_order", 0),
        "product_ids": [it.product_id for it in items],
        "created_at": _dt(getattr(collection, "created_at", None)),
        "updated_at": _dt(getattr(collection, "updated_at", None)),
    }


def serialize_product_picker_item(product) -> dict:
    imgs = sorted(getattr(product, "images", []) or [], key=lambda x: (getattr(x, "sort_order", 0), x.id))
    primary = next((i for i in imgs if getattr(i, "is_primary", False)), None) or (imgs[0] if imgs else None)
    variants = getattr(product, "variants", []) or []
    total_stock = 0
    for v in variants:
        try:
            total_stock += int(getattr(v, "stock", 0) or 0)
        except Exception:
            pass
    sku = None
    if variants:
        sku = getattr(variants[0], "sku", None)
    return {
        "id": product.id,
        "name": product.name,
        "slug": getattr(product, "slug", None),
        "base_price": _num(getattr(product, "base_price", None)),
        "discount_price": _num(getattr(product, "discount_price", None)),
        "currency": getattr(product, "currency", "VND"),
        "primary_image_url": primary.image_url if primary else None,
        "sku": sku,
        "total_stock": total_stock,
        "is_active": getattr(product, "is_active", True),
        "kind": getattr(product, "kind", "single"),
    }


def serialize_shipping_rule(rule) -> dict:
    return {
        "id": rule.id,
        "min_order_total": _num(getattr(rule, "min_order_total", 0)),
        "base_fee": _num(getattr(rule, "base_fee", 0)),
        "discount_type": getattr(rule, "discount_type", "fixed"),
        "discount_value": _num(getattr(rule, "discount_value", 0)),
        "is_active": getattr(rule, "is_active", True),
        "sort_order": getattr(rule, "sort_order", 0),
        "created_at": _dt(getattr(rule, "created_at", None)),
        "updated_at": _dt(getattr(rule, "updated_at", None)),
    }


def serialize_voucher(voucher) -> dict:
    return {
        "id": voucher.id,
        "code": voucher.code,
        "display_name": getattr(voucher, "display_name", None),
        "image_url": getattr(voucher, "image_url", None),
        "auto_apply": getattr(voucher, "auto_apply", False),
        "type": getattr(voucher, "type", "fixed"),
        "value": _num(getattr(voucher, "value", None)),
        "min_order_total": _num(getattr(voucher, "min_order_total", 0)),
        "max_discount": _num(getattr(voucher, "max_discount", None)),
        "usage_limit": getattr(voucher, "usage_limit", None),
        "used_count": getattr(voucher, "used_count", 0),
        "valid_from": _dt(getattr(voucher, "valid_from", None)),
        "valid_to": _dt(getattr(voucher, "valid_to", None)),
        "is_active": getattr(voucher, "is_active", True),
        "created_at": _dt(getattr(voucher, "created_at", None)),
        "updated_at": _dt(getattr(voucher, "updated_at", None)),
    }


def serialize_blog(blog) -> dict:
    return {
        "id": blog.id,
        "title": blog.title,
        "slug": getattr(blog, "slug", None),
        "content": getattr(blog, "content", ""),
        "thumbnail": getattr(blog, "thumbnail", None),
        "author": getattr(blog, "author", None),
        "category": getattr(blog, "category", None),
        "is_published": getattr(blog, "is_published", False),
        "published_at": _dt(getattr(blog, "published_at", None)),
        "created_at": _dt(getattr(blog, "created_at", None)),
        "updated_at": _dt(getattr(blog, "updated_at", None)),
    }

