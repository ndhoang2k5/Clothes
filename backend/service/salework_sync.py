"""
Sync Salework product list into local Product + ProductVariant.
Match by product_variants.sku = Salework code.
"""
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..entities import models
from .product_category_utils import ensure_product_category
from .salework_client import fetch_product_list, get_stock_total
import re
import datetime
from threading import Lock


def _slugify(name: str, code: str) -> str:
    s = (name or code or "sp").strip()[:200]
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[-\s]+", "-", s).strip("-").lower()
    return s or f"sp-{code}"


COLOR_WORDS = (
    "trắng sữa",
    "xanh mint",
    "xanhmint",
    "xanh than",
    "nâu bò",
    "cam đất",
    "be sữa",
    "be đậm",
    "ghi nhạt",
    "ghi đậm",
    "hồng",
    "xanh",
    "nâu",
    "vàng",
    "trắng",
    "đen",
    "xám",
    "ghi",
    "be",
    "kem",
    "tím",
    "cam",
    "đỏ",
)


def _clean_variant_size(size: str | None) -> str | None:
    value = re.sub(r"\s+", "", str(size or "").strip(" ()"))
    return value or None


def _normalize_color_label(color: str | None) -> str | None:
    value = re.sub(r"\s+", " ", str(color or "").strip())
    if not value:
        return None
    value = re.sub(r"^(?:màu|mau)\s+", "", value, flags=re.IGNORECASE).strip()
    value = re.sub(r"\s*[-–]\s*", " - ", value)
    return value or None


def _extract_color_from_prefix(prefix: str) -> str | None:
    value = re.sub(r"\s+", " ", str(prefix or "").strip(" -_")).strip()
    if not value:
        return None
    value = re.sub(r"^(?:màu|mau)\s+", "", value, flags=re.IGNORECASE).strip()
    # Combo colors from Salework: "Xanh - Trắng", "Hồng - Trắng" → keep full label
    if re.search(r"[-–]", value):
        return _normalize_color_label(value)
    lowered = value.lower()
    for color in COLOR_WORDS:
        if lowered == color or lowered.endswith(f" {color}") or lowered.endswith(color.replace(" ", "")):
            return color.capitalize()
    # If Salework already sends only "hồng sz 6-9", the whole prefix is the color.
    # For longer names like "Bộ dài tay xanh", avoid returning the full product description.
    parts = value.split()
    if len(parts) <= 3:
        return value
    return None


def _extract_color_size_from_name(name: str) -> tuple[str | None, str | None]:
    """
    Heuristic from Salework variant naming.

    Accepted examples:
    - "Trắng sz 6-9" -> ("Trắng", "6-9")
    - "Màu Hồng Size 18-24M" -> ("Hồng", "18-24M")
    - "Hồng - Trắng sz 0-3m" -> ("Hồng - Trắng", "0-3m")
    - "Bộ dài tay xanh 6-9m" -> ("Xanh", "6-9m")
    - "Xanh18-24m" -> ("Xanh", "18-24m")
    """
    raw = re.sub(r"\s+", " ", (name or "").strip())
    if not raw:
        return None, None

    explicit = re.match(
        r"^(?P<color>.+?)\s+(?:sz|size)\s*(?P<size>.+)$",
        raw,
        flags=re.IGNORECASE,
    )
    if explicit:
        color_raw = (explicit.group("color") or "").strip()
        size = _clean_variant_size(explicit.group("size"))
        if re.search(r"[-–]", color_raw):
            color = _normalize_color_label(color_raw)
        else:
            color = _extract_color_from_prefix(color_raw) or color_raw
        return (color or None, size)

    trailing_size = re.match(
        r"^(?P<prefix>.+?)(?:\s*)"
        r"(?P<size>\(?\d+\s*(?:m|y)?(?:\s*-\s*\d+\s*(?:m|y)?)?\)?)$",
        raw,
        flags=re.IGNORECASE,
    )
    if trailing_size:
        prefix = (trailing_size.group("prefix") or "").strip()
        color = _extract_color_from_prefix(prefix)
        size = _clean_variant_size(trailing_size.group("size"))
        return (color or None, size)

    return None, None


def _find_variant_by_size_color(
    db: Session,
    product_id: int,
    size: str | None,
    color: str | None,
    exclude_variant_id: int | None = None,
):
    q = db.query(models.ProductVariant).filter(models.ProductVariant.product_id == product_id)
    if size is None:
        q = q.filter(models.ProductVariant.size.is_(None))
    else:
        q = q.filter(models.ProductVariant.size == size)
    if color is None:
        q = q.filter(models.ProductVariant.color.is_(None))
    else:
        q = q.filter(models.ProductVariant.color == color)
    if exclude_variant_id is not None:
        q = q.filter(models.ProductVariant.id != exclude_variant_id)
    return q.first()


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


def _friendly_sync_error(exc: Exception | str, sku: str | None = None) -> str:
    """Chuyển lỗi kỹ thuật (SQL/IntegrityError) thành thông báo ngắn cho admin UI."""
    raw = str(getattr(exc, "orig", None) or exc or "").strip()
    lower = raw.lower()
    prefix = f"Mã {sku}: " if sku else ""

    if "uq_product_variants_size_color" in lower or (
        "uniqueviolation" in lower and "size" in lower and "color" in lower
    ):
        return f"{prefix}trùng size/màu với biến thể khác trên cùng sản phẩm."
    if "uq_product_variants_sku" in lower or (
        "uniqueviolation" in lower and "sku" in lower
    ):
        return f"{prefix}SKU đã tồn tại trong hệ thống."
    if "uniqueviolation" in lower or "duplicate key" in lower:
        return f"{prefix}dữ liệu bị trùng, không thể lưu."
    if "foreign key" in lower:
        return f"{prefix}thiếu dữ liệu liên kết (danh mục/sản phẩm)."
    if "connection" in lower or "timeout" in lower or "timed out" in lower:
        return "Không kết nối được Salework hoặc database. Vui lòng thử lại."
    if "salework" in lower and ("token" in lower or "client-id" in lower or "401" in lower or "403" in lower):
        return "Không xác thực được Salework. Kiểm tra cấu hình token."
    if any(token in lower for token in ("sqlalchemy", "psycopg2", "[sql:", "detail:", "traceback")):
        return f"{prefix}không lưu được do dữ liệu không hợp lệ." if sku else "Đồng bộ gặp lỗi dữ liệu. Vui lòng thử lại."

    # Cắt thông báo quá dài / có SQL
    cleaned = re.sub(r"\s+", " ", raw)
    if len(cleaned) > 160:
        cleaned = cleaned[:160].rstrip() + "…"
    return f"{prefix}{cleaned}" if sku and not cleaned.startswith(f"Mã {sku}") else cleaned


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

    # Sản phẩm mới kéo từ Salework luôn Off — admin bật tay khi muốn bán.
    default_new_active = False
    result["first_sync_mode"] = False
    result["default_new_active"] = False

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
        size_val = parsed_size or code_size
        color_val = parsed_color
        if variant:
            variant.stock = stock
            variant.price_override = price if price > 0 else None
            # Refresh size/color from Salework when parseable; skip if would collide with another SKU
            next_color = color_val if color_val else getattr(variant, "color", None)
            next_size = size_val if size_val else getattr(variant, "size", None)
            conflict = _find_variant_by_size_color(
                db,
                variant.product_id,
                next_size,
                next_color,
                exclude_variant_id=variant.id,
            )
            if not conflict:
                if color_val:
                    variant.color = color_val
                if size_val:
                    variant.size = size_val
                elif not getattr(variant, "size", None) and code_size:
                    variant.size = code_size
            if external_id:
                variant.external_sku_id = external_id
            try:
                db.commit()
            except IntegrityError as e:
                db.rollback()
                result["errors"].append(_friendly_sync_error(e, code))
                continue
            result["updated_variants"] += 1
            result["synced"] += 1
            continue

        # Decide which Product to attach this variant to.
        # - If code matches grouping rule: attach to one product per base_key
        # - Else: treat as single product per sku
        product: models.Product | None = None
        external_product_id = base_key or code
        created_new_product = False

        if base_key:
            product = (
                db.query(models.Product)
                .filter(models.Product.external_source == "salework")
                .filter(models.Product.external_product_id == external_product_id)
                .first()
            )

        if not product:
            # Create new Product — luôn Off khi mới kéo về
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
                is_active=False,
                is_hot=False,
                is_new=True,
                is_sale=False,
                external_source="salework",
                external_product_id=external_product_id,
            )
            db.add(product)
            db.flush()
            created_new_product = True
            if default_category_id:
                ensure_product_category(db, product.id, default_category_id)

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

        # Nếu đã có biến thể cùng size+color (SKU khác) → cập nhật tồn/giá, không insert trùng
        existing_sc = _find_variant_by_size_color(db, product.id, size_val, color_val)
        if existing_sc:
            existing_sc.stock = stock
            existing_sc.price_override = price if price > 0 else None
            if external_id and not existing_sc.external_sku_id:
                existing_sc.external_sku_id = external_id
            # Nếu SKU cũ trống thì gắn SKU mới; nếu đã có SKU khác thì giữ nguyên để tránh đè nhầm
            if not existing_sc.sku:
                existing_sc.sku = code
            try:
                db.commit()
            except IntegrityError as e:
                db.rollback()
                result["errors"].append(_friendly_sync_error(e, code))
                continue
            result["updated_variants"] += 1
            result["synced"] += 1
            continue

        variant = models.ProductVariant(
            product_id=product.id,
            sku=code,
            external_sku_id=external_id or None,
            size=size_val,
            color=color_val,
            stock=stock,
            price_override=price if price > 0 else None,
            # Biến thể mới active; sản phẩm mới vẫn Off nên không hiện shop
            is_active=True,
        )
        db.add(variant)
        try:
            db.commit()
        except IntegrityError as e:
            db.rollback()
            result["errors"].append(_friendly_sync_error(e, code))
            continue
        if created_new_product:
            result["created_products"] += 1
        result["synced"] += 1

    # Giới hạn số lỗi đưa lên UI, tránh spam
    if len(result["errors"]) > 8:
        extra = len(result["errors"]) - 8
        result["errors"] = result["errors"][:8] + [f"… và {extra} lỗi khác."]
    result["success"] = len(result["errors"]) == 0 or result["synced"] > 0
    return result


_SYNC_STATE_LOCK = Lock()
_SYNC_STATE = {
    "running": False,
    "last_sync_at": None,
    "last_success_at": None,
    "last_error": None,
    "last_result": None,
    "auto_enabled": False,
    "interval_seconds": None,
}


def _utc_now_iso() -> str:
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def configure_auto_sync(enabled: bool, interval_seconds: int | None):
    with _SYNC_STATE_LOCK:
        _SYNC_STATE["auto_enabled"] = bool(enabled)
        _SYNC_STATE["interval_seconds"] = int(interval_seconds) if interval_seconds else None


def get_sync_status() -> dict:
    with _SYNC_STATE_LOCK:
        return dict(_SYNC_STATE)


def run_salework_sync(db: Session, trigger: str = "manual") -> dict:
    """
    Wrapper cho đồng bộ Salework:
    - Cập nhật trạng thái runtime (running/last_sync_at/last_error/last_result)
    - Tránh chạy chồng nhiều lượt sync cùng lúc
    """
    with _SYNC_STATE_LOCK:
        if _SYNC_STATE["running"]:
            return {
                "success": False,
                "synced": 0,
                "created_products": 0,
                "updated_variants": 0,
                "errors": ["Đồng bộ Salework đang chạy, vui lòng đợi."],
                "trigger": trigger,
            }
        _SYNC_STATE["running"] = True
        _SYNC_STATE["last_error"] = None

    try:
        result = sync_salework(db)
    except Exception as e:
        now = _utc_now_iso()
        friendly = _friendly_sync_error(e)
        with _SYNC_STATE_LOCK:
            _SYNC_STATE["running"] = False
            _SYNC_STATE["last_sync_at"] = now
            _SYNC_STATE["last_error"] = friendly
            _SYNC_STATE["last_result"] = {
                "success": False,
                "synced": 0,
                "created_products": 0,
                "updated_variants": 0,
                "errors": [friendly],
                "trigger": trigger,
            }
        return {
            "success": False,
            "synced": 0,
            "created_products": 0,
            "updated_variants": 0,
            "errors": [friendly],
            "trigger": trigger,
        }

    now = _utc_now_iso()
    errors = [_friendly_sync_error(x) for x in list((result or {}).get("errors") or [])]
    payload = {
        "success": bool(result and result.get("success")),
        "synced": int((result or {}).get("synced") or 0),
        "created_products": int((result or {}).get("created_products") or 0),
        "updated_variants": int((result or {}).get("updated_variants") or 0),
        "errors": errors,
        "trigger": trigger,
    }
    with _SYNC_STATE_LOCK:
        _SYNC_STATE["running"] = False
        _SYNC_STATE["last_sync_at"] = now
        _SYNC_STATE["last_result"] = payload
        if payload["errors"]:
            _SYNC_STATE["last_error"] = str(payload["errors"][0])
        else:
            _SYNC_STATE["last_error"] = None
            if payload["success"]:
                _SYNC_STATE["last_success_at"] = now
    return payload
