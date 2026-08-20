import datetime
import os
import re
from decimal import Decimal
from pathlib import Path
from typing import Any, Optional


def _backend_static_dir() -> Path:
    return Path(__file__).resolve().parent.parent / "static"


def _local_upload_file_missing(url: Optional[str]) -> bool:
    """
    True nếu URL là ảnh upload của hệ thống (/static/uploads/...) nhưng file không còn trên đĩa.
    URL ngoài hoặc không parse được → coi là không bỏ (để client tự xử lý).
    """
    if not url or not isinstance(url, str):
        return True
    raw = url.strip()
    if raw.startswith("http://") or raw.startswith("https://"):
        try:
            from urllib.parse import urlparse

            path = urlparse(raw).path or ""
        except Exception:
            return False
    else:
        path = raw if raw.startswith("/") else f"/{raw}"
    if "/static/uploads/" not in path:
        return False
    rel = path.split("/static/", 1)[-1].lstrip("/")
    if not rel.startswith("uploads/"):
        return False
    fp = _backend_static_dir() / rel.replace("/", os.sep)
    return not fp.is_file()


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


def serialize_variant(variant, omit_missing_upload_files: bool = False) -> dict:
    vimgs = sorted(
        getattr(variant, "images", []) or [],
        key=lambda x: (getattr(x, "sort_order", 0), x.id),
    )
    if omit_missing_upload_files:
        vimgs = [img for img in vimgs if not _local_upload_file_missing(getattr(img, "image_url", None))]
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
            for img in vimgs
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


def _product_category_slugs(product) -> list[str]:
    slugs: list[str] = []
    pcs = getattr(product, "product_categories", None) or []
    for pc in pcs:
        cat = getattr(pc, "category", None)
        slug = getattr(cat, "slug", None)
        if slug:
            slugs.append(str(slug))
    if not slugs:
        primary = getattr(getattr(product, "category", None), "slug", None)
        if primary:
            slugs = [str(primary)]
    return slugs


def serialize_product_list_item(
    product,
    omit_missing_upload_files: bool = False,
    promo_percent: int | None = None,
) -> dict:
    """Lightweight product for listing pages (small payload)."""
    from .promotion_service import apply_promo_to_payload

    imgs = sorted(getattr(product, "images", []) or [], key=lambda x: (getattr(x, "sort_order", 0), x.id))
    if omit_missing_upload_files:
        imgs = [img for img in imgs if not _local_upload_file_missing(getattr(img, "image_url", None))]
    primary = next((i for i in imgs if getattr(i, "is_primary", False)), None) or (imgs[0] if imgs else None)
    payload = {
        "id": product.id,
        "category_id": product.category_id,
        "category_slug": getattr(getattr(product, "category", None), "slug", None),
        "category_slugs": _product_category_slugs(product),
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
        # Chỉ 2 ảnh cho list/card (primary + 1 hover) để giảm payload & bandwidth
        "image_urls": [img.image_url for img in imgs[:2]],
        "variants": [serialize_variant_list_item(v) for v in getattr(product, "variants", [])],
    }
    return apply_promo_to_payload(payload, promo_percent)


def serialize_product(
    product,
    omit_missing_upload_files: bool = False,
    promo_percent: int | None = None,
) -> dict:
    from .promotion_service import apply_promo_to_payload

    imgs = sorted(getattr(product, "images", []) or [], key=lambda x: (getattr(x, "sort_order", 0), x.id))
    if omit_missing_upload_files:
        imgs = [img for img in imgs if not _local_upload_file_missing(getattr(img, "image_url", None))]
    primary = next((i for i in imgs if getattr(i, "is_primary", False)), None) or (imgs[0] if imgs else None)

    payload = {
        "id": product.id,
        "category_id": product.category_id,
        "category_slug": getattr(getattr(product, "category", None), "slug", None),
        "category_slugs": _product_category_slugs(product),
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
        "variants": [
            serialize_variant(v, omit_missing_upload_files=omit_missing_upload_files)
            for v in getattr(product, "variants", [])
        ],
        "combo_items": [
            {
                "combo_product_id": getattr(ci, "combo_product_id", None),
                "component_variant_id": getattr(ci, "component_variant_id", None),
                "quantity": getattr(ci, "quantity", 1),
            }
            for ci in getattr(product, "combo_components", []) or []
        ],
    }
    return apply_promo_to_payload(payload, promo_percent)


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
    raw_mobile_image = getattr(banner, "mobile_image_url", None) or ""
    return {
        "id": banner.id,
        "slot": banner.slot,
        "sort_order": banner.sort_order,
        "image_url": _banner_image_url_for_response(raw_image),
        "mobile_image_url": _banner_image_url_for_response(raw_mobile_image),
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
    benefits = _voucher_benefits_list(voucher)
    return {
        "id": voucher.id,
        "code": voucher.code,
        "display_name": getattr(voucher, "display_name", None),
        "image_url": getattr(voucher, "image_url", None),
        "auto_apply": getattr(voucher, "auto_apply", False),
        "type": getattr(voucher, "type", "fixed"),
        "value": _num(getattr(voucher, "value", None)),
        "percent_value": _num(getattr(voucher, "percent_value", None)),
        "fixed_value": _num(getattr(voucher, "fixed_value", None)),
        "gift_name": getattr(voucher, "gift_name", None),
        "gift_image_url": getattr(voucher, "gift_image_url", None),
        "gift_product_id": getattr(voucher, "gift_product_id", None),
        "min_order_total": _num(getattr(voucher, "min_order_total", 0)),
        "max_order_total": _num(getattr(voucher, "max_order_total", None)),
        "max_discount": _num(getattr(voucher, "max_discount", None)),
        "usage_limit": getattr(voucher, "usage_limit", None),
        "used_count": getattr(voucher, "used_count", 0),
        "valid_from": _dt(getattr(voucher, "valid_from", None)),
        "valid_to": _dt(getattr(voucher, "valid_to", None)),
        "is_active": getattr(voucher, "is_active", True),
        "show_on_homepage": bool(getattr(voucher, "show_on_homepage", False)),
        "show_in_checkout": bool(getattr(voucher, "show_in_checkout", True)),
        "homepage_sort_order": int(getattr(voucher, "homepage_sort_order", 0) or 0),
        "card_theme": getattr(voucher, "card_theme", None) or "amber",
        "card_icon": getattr(voucher, "card_icon", None) or "gift",
        "benefits": benefits,
        "terms_text": getattr(voucher, "terms_text", None),
        "order_condition_mode": getattr(voucher, "order_condition_mode", None) or "from",
        "created_at": _dt(getattr(voucher, "created_at", None)),
        "updated_at": _dt(getattr(voucher, "updated_at", None)),
    }


def _voucher_benefits_list(voucher) -> list:
    import json
    raw = getattr(voucher, "benefits_json", None)
    if not raw:
        return []
    try:
        data = json.loads(raw)
        return [str(x) for x in data] if isinstance(data, list) else []
    except Exception:
        return []


def _promo_card_discount_label(voucher) -> str:
    t = getattr(voucher, "type", "fixed")
    percent_val = getattr(voucher, "percent_value", None)
    fixed_val = getattr(voucher, "fixed_value", None)
    if percent_val is None and t == "percent":
        percent_val = getattr(voucher, "value", 0)
    if fixed_val is None and t == "fixed":
        fixed_val = getattr(voucher, "value", 0)

    p = float(percent_val or 0)
    f = float(fixed_val or 0)

    if p > 0:
        if abs(p - round(p)) < 1e-9:
            return f"Giảm {int(p)}%"
        return f"Giảm {p}%"
    if f > 0:
        return f"Giảm {int(f):,}đ".replace(",", ".")
    name = (
        getattr(voucher, "gift_name", None)
        or getattr(voucher, "display_name", None)
        or getattr(voucher, "code", "")
        or "Quà tặng"
    )
    return str(name)


def _promo_card_condition_label(voucher) -> str:
    mode = (getattr(voucher, "order_condition_mode", None) or "from").strip().lower()
    min_o = float(getattr(voucher, "min_order_total", 0) or 0)
    max_o = getattr(voucher, "max_order_total", None)
    if mode == "under":
        cap = max_o if max_o is not None else (min_o if min_o > 0 else None)
        if cap is not None:
            k = int(float(cap) // 1000)
            return f"Đơn hàng dưới {k}K"
        return "Mọi đơn hàng"
    if min_o <= 0:
        return "Áp dụng mọi đơn"
    k = int(min_o // 1000)
    return f"Đơn hàng từ {k}K"


def serialize_homepage_promo_voucher(voucher) -> dict:
    """Public JSON cho thẻ khuyến mãi trên trang chủ (không trả usage_limit…)."""
    benefits = _voucher_benefits_list(voucher)
    gift_name = (
        getattr(voucher, "gift_name", None)
        or (getattr(voucher, "display_name", None) if getattr(voucher, "type", "fixed") == "product" else None)
    )
    if gift_name:
        has_gift_line = any(str(b).strip().lower().startswith("tặng") for b in benefits)
        if not has_gift_line:
            benefits = [*benefits, f"Tặng {gift_name}"]
    return {
        "id": voucher.id,
        "code": voucher.code,
        "type": getattr(voucher, "type", "fixed"),
        "discount_label": _promo_card_discount_label(voucher),
        "condition_label": _promo_card_condition_label(voucher),
        "benefits": benefits,
        "terms_text": getattr(voucher, "terms_text", None),
        "card_theme": getattr(voucher, "card_theme", None) or "amber",
        "card_icon": getattr(voucher, "card_icon", None) or "gift",
    }


def serialize_blog(blog) -> dict:
    status = getattr(blog, "status", None)
    if not status:
        status = "published" if getattr(blog, "is_published", False) else "draft"
    return {
        "id": blog.id,
        "title": blog.title,
        "slug": getattr(blog, "slug", None),
        "content": getattr(blog, "content", ""),
        "thumbnail": getattr(blog, "thumbnail", None),
        "author": getattr(blog, "author", None),
        "category": getattr(blog, "category", None),
        "status": status,
        "is_published": getattr(blog, "is_published", False),
        "scheduled_at": _dt(getattr(blog, "scheduled_at", None)),
        "reviewed_at": _dt(getattr(blog, "reviewed_at", None)),
        "published_at": _dt(getattr(blog, "published_at", None)),
        "created_at": _dt(getattr(blog, "created_at", None)),
        "updated_at": _dt(getattr(blog, "updated_at", None)),
    }


def serialize_blog_summary(blog) -> dict:
    """Payload nhẹ cho danh sách blog; nội dung đầy đủ chỉ trả ở API detail."""
    import json

    is_mapping = isinstance(blog, dict)
    content = str((blog.get("content") if is_mapping else getattr(blog, "content", "")) or "")
    pieces: list[str] = []
    try:
        document = json.loads(content)
        if isinstance(document, dict) and isinstance(document.get("blocks"), list):
            for block in document["blocks"]:
                if not isinstance(block, dict):
                    continue
                text_value = block.get("text")
                if text_value:
                    pieces.append(str(text_value))
                items = block.get("items")
                if isinstance(items, list):
                    pieces.extend(str(item) for item in items if item)
    except (TypeError, ValueError):
        pieces.append(content)

    excerpt = " ".join(pieces).replace("\n", " ")
    excerpt = " ".join(excerpt.split())
    if len(excerpt) > 180:
        excerpt = excerpt[:177].rstrip() + "..."

    payload = dict(blog) if is_mapping else serialize_blog(blog)
    payload["content"] = ""
    payload["excerpt"] = excerpt
    return payload
