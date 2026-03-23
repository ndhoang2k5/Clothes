
from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from ...service.user.product_service import UserProductService
from ...service.admin.admin_service import AdminService
from ...service.voucher_service import VoucherService
from ...service.shipping_service import ShippingService
from ...service.order_service import OrderService
from ...service.serializers import _dt, serialize_blog
from ...service.order_notification_service import OrderNotificationService
from ...service.auth_service import (
    create_access_token,
    get_current_customer,
    get_current_customer_optional,
    hash_password,
    verify_password,
)
from ...service.serializers import serialize_customer, serialize_order
from ...database_config import get_db
from ...entities import models
from ...utils.ttl_cache import TTLCache

router = APIRouter()

_PUBLIC_TTL_CACHE = TTLCache(default_ttl_seconds=10.0, max_items=2048)


def _ensure_clearance_category(db: Session):
    """Tạo danh mục 'Ưu đãi cuối mùa' (uu-dai-cuoi-mua) nếu chưa có."""
    cat = db.query(models.Category).filter(models.Category.slug == "uu-dai-cuoi-mua").first()
    if cat:
        return cat
    db.execute(
        text(
            "INSERT INTO categories (name, slug, icon, sort_order) "
            "VALUES ('Ưu đãi cuối mùa', 'uu-dai-cuoi-mua', '🏷️', 7) "
            "ON CONFLICT (slug) DO NOTHING"
        )
    )
    db.commit()
    return db.query(models.Category).filter(models.Category.slug == "uu-dai-cuoi-mua").first()


@router.get("/debug-clearance")
def debug_clearance(db: Session = Depends(get_db)):
    """Kiểm tra danh mục uu-dai-cuoi-mua và số sản phẩm có category_id trùng. Tự tạo danh mục nếu chưa có."""
    cat = _ensure_clearance_category(db)
    if not cat:
        return {"ok": False, "reason": "category_not_found", "hint": "Chạy database/init.sql để tạo danh mục."}
    count = db.query(models.Product).filter(
        models.Product.category_id == cat.id,
        models.Product.is_active == True,  # noqa: E712
    ).count()
    ids = [
        p.id for p in db.query(models.Product.id).filter(
            models.Product.category_id == cat.id,
            models.Product.is_active == True,  # noqa: E712
        ).limit(20).all()
    ]
    return {
        "ok": True,
        "category_id": cat.id,
        "category_slug": cat.slug,
        "product_count": count,
        "product_ids": ids,
    }


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    return _PUBLIC_TTL_CACHE.get_or_set(
        "user:categories:active_only=true",
        lambda: AdminService.list_categories(db, active_only=True),
        ttl_seconds=30.0,
    )

@router.get("/products")
def get_products(
    category: str | None = None,
    q: str | None = None,
    page: int = 1,
    per_page: int = 24,
    sizes: str | None = None,
    colors: str | None = None,
    materials: str | None = None,
    price_min: int | None = None,
    price_max: int | None = None,
    sort: str | None = None,
    db: Session = Depends(get_db),
):
    """
    Danh sách sản phẩm active cho user.

    Hỗ trợ filter theo:
    - category: slug danh mục
    - sizes: chuỗi "S,M,L"
    - colors: chuỗi "trang,den"
    - materials: chuỗi "cotton,lanh"
    - price_min, price_max: khoảng giá (int, VND)
    - sort: newest | price-asc | price-desc | bestseller
    """
    if category and str(category).strip() == "uu-dai-cuoi-mua":
        _ensure_clearance_category(db)
    return UserProductService.get_active_products(
        db,
        category_slug=category,
        page=page,
        per_page=per_page,
        sizes=sizes,
        colors=colors,
        materials=materials,
        price_min=price_min,
        price_max=price_max,
        sort=sort,
        q=q,
    )

@router.get("/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = UserProductService.get_active_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    from ...service.serializers import serialize_product
    return serialize_product(product)


@router.get("/products/{product_id}/combo-items")
def get_product_combo_items(product_id: int, db: Session = Depends(get_db)):
    items = AdminService.list_combo_items(db, product_id)
    if items is None:
        raise HTTPException(status_code=404, detail="Product not found or not combo")
    return items


@router.get("/banners")
def get_banners(slot: str | None = None, db: Session = Depends(get_db)):
    # User-facing banners: only active banners
    key = f"user:banners:slot={slot or ''}:active_only=true"
    return _PUBLIC_TTL_CACHE.get_or_set(
        key,
        lambda: AdminService.list_banners(db, slot=slot, active_only=True),
        ttl_seconds=15.0,
    )


@router.get("/collections")
def get_collections(db: Session = Depends(get_db)):
    """Danh sách bộ sưu tập hiển thị cho user (chỉ active)."""
    return _PUBLIC_TTL_CACHE.get_or_set(
        "user:collections:include_inactive=false",
        lambda: AdminService.list_collections(db, include_inactive=False),
        ttl_seconds=20.0,
    )


@router.get("/blogs")
def get_blogs(
    category: str | None = None,
    limit: int = 3,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    """Blog / tips cho user – chỉ bài đã publish."""
    key = f"user:blogs:category={category or ''}:q={q or ''}:published_only=true"
    items = _PUBLIC_TTL_CACHE.get_or_set(
        key,
        lambda: AdminService.list_blogs(db, category=category, published_only=True, q=q),
        ttl_seconds=20.0,
    )
    if limit and limit > 0:
        return items[: limit]
    return items


@router.get("/blogs/{blog_id}")
def get_blog_detail(blog_id: int, db: Session = Depends(get_db)):
    """
    Lấy chi tiết 1 bài blog đã publish cho user.
    """
    blog = AdminService.get_blog(db, blog_id)
    status = (getattr(blog, "status", None) or "").strip().lower() if blog else ""
    is_visible = bool(blog) and (status == "published" or bool(getattr(blog, "is_published", False)))
    if not is_visible:
        raise HTTPException(status_code=404, detail="Blog not found")
    return serialize_blog(blog)


@router.get("/vouchers/available")
def get_available_vouchers(
    cart_total: float = 0,
    db: Session = Depends(get_db),
):
    """Trả danh sách voucher active, còn hạn, chưa hết lượt dùng cho user xem gợi ý."""
    import datetime as _dt
    now = _dt.datetime.utcnow()
    query = (
        db.query(models.Voucher)
        .filter(
            models.Voucher.is_active == True,  # noqa: E712
        )
        .filter((models.Voucher.valid_from.is_(None)) | (models.Voucher.valid_from <= now))
        .filter((models.Voucher.valid_to.is_(None)) | (models.Voucher.valid_to >= now))
        .order_by(models.Voucher.min_order_total.asc(), models.Voucher.id.desc())
    )
    vouchers = query.all()
    result = []
    for v in vouchers:
        if v.usage_limit is not None and (v.used_count or 0) >= v.usage_limit:
            continue
        min_total = float(v.min_order_total or 0)
        eligible = cart_total >= min_total
        item: dict = {
            "code": v.code,
            "type": v.type,
            "value": float(v.value or 0),
            "min_order_total": min_total,
            "eligible": eligible,
        }
        if v.type == "product":
            item["display_name"] = getattr(v, "display_name", None)
            item["image_url"] = getattr(v, "image_url", None)
        else:
            max_disc = float(v.max_discount) if v.max_discount else None
            item["max_discount"] = max_disc
        result.append(item)
    return result


@router.post("/vouchers/validate")
def validate_voucher(
    body: dict = Body(..., description="{ code: string, cart_total: number }"),
    db: Session = Depends(get_db),
):
    """
    Kiểm tra mã giảm giá. Body: { "code": "MÃ", "cart_total": số_tiền }.
    Trả về: { "ok": bool, "discountAmount": number | null, "reason": string | null }.
    """
    code = (body.get("code") or "").strip()
    cart_total = body.get("cart_total")
    if not code:
        return {"ok": False, "discountAmount": None, "reason": "Vui lòng nhập mã"}
    result = VoucherService.validate_voucher(db, code, cart_total)
    resp: dict = {
        "ok": result["ok"],
        "discountAmount": result.get("discount_amount"),
        "reason": result.get("reason"),
    }
    if result.get("voucher_type"):
        resp["voucherType"] = result["voucher_type"]
    if result.get("gift_product_name"):
        resp["giftProductName"] = result["gift_product_name"]
    if result.get("gift_product_image"):
        resp["giftProductImage"] = result["gift_product_image"]
    return resp


@router.get("/vouchers/auto")
def get_auto_voucher(
    cart_total: float = 0,
    db: Session = Depends(get_db),
):
    """
    Gợi ý voucher tự động: trả cả discount voucher + gift voucher (nếu có).
    """
    best_disc, disc_amount, best_gift, _ = VoucherService.pick_auto_vouchers(db, cart_total)
    resp: dict = {"ok": True}

    if best_disc:
        resp["code"] = best_disc.code
        resp["discountAmount"] = float(disc_amount or 0)
        resp["voucherType"] = getattr(best_disc, "type", "fixed")
    else:
        resp["code"] = None
        resp["discountAmount"] = 0

    if best_gift:
        resp["giftCode"] = best_gift.code
        resp["giftProductName"] = getattr(best_gift, "display_name", None) or "Quà tặng"
        resp["giftProductImage"] = getattr(best_gift, "image_url", None)

    return resp


@router.get("/shipping/calculate")
def calculate_shipping_fee(
    cart_total: float = 0,
    db: Session = Depends(get_db),
):
    """
    Tính phí ship theo tổng tiền giỏ hàng (cart_total, VND).
    Trả về: { baseFee, discountFromShipping, finalFee, ruleId }.
    """
    result = ShippingService.calculate_fee(db, cart_total)
    return result


@router.post("/orders")
def create_order(
    background_tasks: BackgroundTasks,
    body: dict = Body(
        ...,
        description='{ "customer": { name, phone, email?, address }, "items": [ { productId, variantId?, quantity } ], "voucherCode?", "giftVoucherCode?", "note?" }',
    ),
    db: Session = Depends(get_db),
    current_customer=Depends(get_current_customer_optional),
):
    """
    Tạo đơn hàng. Body theo pipeline A.5.
    Trả về: { orderId, orderCode, status, totalAmount, createdAt }.
    """
    try:
        order = OrderService.create_order(db, body, customer_id=(current_customer.id if current_customer else None))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    # Gửi email thông báo cho quản lý ở background để không làm chậm request đặt hàng.
    try:
        payload = {
            "order_code": order.order_code,
            "customer_name": order.customer_name,
            "phone": order.phone,
            "email": order.email,
            "address": order.address,
            "note": order.note,
            "status": order.status,
            "subtotal": float(order.subtotal or 0),
            "discount_total": float(order.discount_total or 0),
            "shipping_fee": float(order.shipping_fee or 0),
            "total_amount": float(order.total_amount or 0),
            "created_at": _dt(getattr(order, "created_at", None)),
            "items": [
                {
                    "product_name": it.product_name,
                    "variant_label": it.variant_label,
                    "quantity": it.quantity,
                    "line_total": float(it.line_total or 0),
                }
                for it in (getattr(order, "items", []) or [])
            ],
        }
        background_tasks.add_task(OrderNotificationService.send_new_order_email, payload)
    except Exception:
        # Không làm fail luồng đặt đơn nếu task email lỗi.
        pass
    return {
        "orderId": order.id,
        "orderCode": order.order_code,
        "status": order.status,
        "totalAmount": float(order.total_amount or 0),
        "createdAt": _dt(getattr(order, "created_at", None)),
    }


@router.post("/register")
def register(body: dict = Body(...), db: Session = Depends(get_db)):
    """
    Body: { name, email, phone, password }
    """
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    phone = (body.get("phone") or "").strip()
    password = body.get("password") or ""
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email và mật khẩu là bắt buộc")
    if db.query(models.Customer).filter(models.Customer.email == email).first():
        raise HTTPException(status_code=400, detail="Email đã tồn tại")

    customer = models.Customer(
        name=name or None,
        email=email,
        phone=phone or None,
        password_hash=hash_password(str(password)),
        default_address=None,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    token = create_access_token(customer.id)
    return {"token": token, "customer": serialize_customer(customer)}


@router.post("/login")
def login(body: dict = Body(...), db: Session = Depends(get_db)):
    """
    Body: { emailOrPhone, password }
    """
    email_or_phone = (body.get("emailOrPhone") or "").strip()
    password = body.get("password") or ""
    if not email_or_phone or not password:
        raise HTTPException(status_code=400, detail="Thiếu thông tin đăng nhập")

    q = db.query(models.Customer)
    if "@" in email_or_phone:
        customer = q.filter(models.Customer.email == email_or_phone.lower()).first()
    else:
        customer = q.filter(models.Customer.phone == email_or_phone).first()
    if not customer or not getattr(customer, "password_hash", None):
        raise HTTPException(status_code=401, detail="Sai tài khoản hoặc mật khẩu")
    if not verify_password(str(password), str(customer.password_hash)):
        raise HTTPException(status_code=401, detail="Sai tài khoản hoặc mật khẩu")

    token = create_access_token(customer.id)
    return {"token": token, "customer": serialize_customer(customer)}


@router.get("/me")
def me(
    db: Session = Depends(get_db),
    customer=Depends(get_current_customer),
):
    orders = (
        db.query(models.Order)
        .filter(models.Order.customer_id == customer.id)
        .order_by(models.Order.created_at.desc())
        .limit(10)
        .all()
    )
    return {
        "customer": serialize_customer(customer),
        "last_orders": [serialize_order(o) for o in orders],
    }
