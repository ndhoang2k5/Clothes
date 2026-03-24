"""
Sync Salework product list into local Product + ProductVariant.
Match by product_variants.sku = Salework code.
"""
from sqlalchemy.orm import Session
from ..entities import models
from .salework_client import fetch_product_list, get_stock_total
import re


def _slugify(name: str, code: str) -> str:
    s = (name or code or "sp").strip()[:200]
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[-\s]+", "-", s).strip("-").lower()
    return s or f"sp-{code}"


def _extract_color_size_from_name(name: str) -> tuple[str | None, str | None]:
    """
    Heuristic from current Salework naming:
    Example: 'Trắng sz 6-9' -> color='Trắng', size='6-9'
    Accepts: 'sz' or 'size' (case-insensitive), flexible spacing.
    """
    raw = (name or "").strip()
    if not raw:
        return None, None
    m = re.match(r"^(?P<color>.+?)\s+(?:sz|size)\s*(?P<size>.+)$", raw, flags=re.IGNORECASE)
    if not m:
        return None, None
    color = (m.group("color") or "").strip()
    size = (m.group("size") or "").strip()
    return (color or None, size or None)

def _is_groupable_code(code: str) -> bool:
    """
    Groupable code patterns from your naming rules:
    - 2 letters + 4 digits (6 chars): AA1201 (01 is size)
    - Some Salework codes appear as 2 letters + 5 digits (7 chars): QA33212
      We still treat last 2 digits as size code and first 4 chars as base key.
    Anything longer than 7 chars (or not matching) is treated as single.
    """
    return bool(re.match(r"^[A-Za-z]{2}\d{4,5}$", code or ""))


def _base_product_key(code: str) -> str | None:
    """
    Base key (product code) rules:
    - If code is 6 chars (AA1201): base = first 4 (AA12), size = last 2 (01)
    - If code is 7 chars (QA33212): base = first 5 (QA332), size = last 2 (12)
    """
    if not _is_groupable_code(code):
        return None
    c = (code or "").strip()
    if len(c) == 7:
        return c[:5].upper()
    return c[:4].upper()


def _size_code(code: str) -> str | None:
    """Size code = last 2 digits for groupable codes."""
    if not _is_groupable_code(code):
        return None
    return code[-2:]


def _base_name_from_color_size(name: str) -> str | None:
    """
    If name matches '<color> sz <size>' then return None (unknown base name),
    otherwise return cleaned name.
    We keep name from Salework as product name; admin can edit later.
    """
    raw = (name or "").strip()
    if not raw:
        return None
    # If it is just a color+size naming, prefer grouping key and let admin rename later.
    if re.match(r"^.+?\s+(?:sz|size)\s*.+$", raw, flags=re.IGNORECASE):
        return None
    return raw


def sync_salework(db: Session):
    """
    Fetch Salework product list and upsert local data.
    Returns: dict with keys: success, synced, created_products, updated_variants, errors (list of str).
    """
    ok, data, err = fetch_product_list()
    result = {
        "success": ok,
        "synced": 0,
        "created_products": 0,
        "updated_variants": 0,
        "errors": [],
    }
    if not ok:
        result["errors"].append(err or "Unknown error")
        return result

    products_raw = (data.get("products") or {}) if isinstance(data, dict) else {}
    if not products_raw:
        result["synced"] = 0
        return result

    # First-time Salework sync rule:
    # - If there is no product imported from Salework yet, create incoming products as inactive
    #   so admin can manually enable desired items.
    # - For later syncs, keep default behavior (new products active).
    has_existing_salework_product = (
        db.query(models.Product.id)
        .filter(models.Product.external_source == "salework")
        .first()
        is not None
    )
    first_sync_mode = not has_existing_salework_product
    default_new_active = not first_sync_mode
    result["first_sync_mode"] = first_sync_mode

    # Default category for new products (first active category)
    default_category = (
        db.query(models.Category)
        .filter(models.Category.is_active == True)  # noqa: E712
        .order_by(models.Category.sort_order.asc(), models.Category.id.asc())
        .first()
    )
    default_category_id = default_category.id if default_category else None

    for code, item in products_raw.items():
        if not isinstance(item, dict):
            continue
        code = str(code).strip()
        if not code:
            continue

        stock = get_stock_total(item)
        # DB constraint: stock >= 0 (Salework có thể trả âm)
        stock = max(0, int(stock) if stock is not None else 0)
        price = item.get("retailPrice")
        if price is None:
            price = 0
        try:
            price = float(price)
        except (TypeError, ValueError):
            price = 0
        name = (item.get("name") or code).strip() or code
        image_url = (item.get("image") or "").strip()
        external_id = (item.get("_id") or "").strip()
        parsed_color, parsed_size = _extract_color_size_from_name(name)
        base_key = _base_product_key(code)
        code_size = _size_code(code)
        base_name = _base_name_from_color_size(name)

        # Find existing variant by sku
        variant = db.query(models.ProductVariant).filter(models.ProductVariant.sku == code).first()
        if variant:
            variant.stock = stock
            variant.price_override = price if price > 0 else None
            # Auto-fill size/color if missing on local variant
            if (not getattr(variant, "color", None)) and parsed_color:
                variant.color = parsed_color
            if (not getattr(variant, "size", None)):
                if parsed_size:
                    variant.size = parsed_size
                elif code_size:
                    variant.size = code_size
            if external_id:
                variant.external_sku_id = external_id
            db.commit()
            result["updated_variants"] += 1
            result["synced"] += 1
            continue

        # Decide which Product to attach this variant to.
        # - If code matches grouping rule: attach to one product per base_key
        # - Else: treat as single product per sku
        product: models.Product | None = None
        external_product_id = base_key or code

        if base_key:
            product = (
                db.query(models.Product)
                .filter(models.Product.external_source == "salework")
                .filter(models.Product.external_product_id == external_product_id)
                .first()
            )

        if not product:
            # Create new Product
            product_name = base_name or (base_key or name)
            slug_base = _slugify(product_name, external_product_id)
            slug = slug_base
            n = 0
            while db.query(models.Product).filter(models.Product.slug == slug).first():
                n += 1
                slug = f"{slug_base}-{n}"

            product = models.Product(
                category_id=default_category_id,
                name=product_name,
                slug=slug,
                description=None,
                base_price=price,
                discount_price=None,
                currency="VND",
                kind="single",
                is_active=default_new_active,
                is_hot=False,
                is_new=True,
                is_sale=False,
                external_source="salework",
                external_product_id=external_product_id,
            )
            db.add(product)
            db.flush()

        # Ensure product has all unique images from Salework variants
        if image_url:
            existing_img = (
                db.query(models.ProductImage)
                .filter(
                    models.ProductImage.product_id == product.id,
                    models.ProductImage.image_url == image_url,
                )
                .first()
            )
            if not existing_img:
                current_count = (
                    db.query(models.ProductImage)
                    .filter(models.ProductImage.product_id == product.id)
                    .count()
                )
                db.add(
                    models.ProductImage(
                        product_id=product.id,
                        image_url=image_url,
                        sort_order=current_count,
                        is_primary=(current_count == 0),
                    )
                )

        variant = models.ProductVariant(
            product_id=product.id,
            sku=code,
            external_sku_id=external_id or None,
            size=parsed_size or code_size,
            color=parsed_color,
            stock=stock,
            price_override=price if price > 0 else None,
            is_active=default_new_active,
        )
        db.add(variant)
        db.commit()
        # Count created product only if it didn't exist (best-effort)
        if (base_key and external_product_id == base_key) or (not base_key and external_product_id == code):
            # product may have existed for base_key; we can't easily tell without extra query flag
            pass
        result["synced"] += 1

    result["success"] = True
    return result
