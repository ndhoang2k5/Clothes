
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from ...service.user.product_service import UserProductService
from ...service.admin.admin_service import AdminService
from ...service.voucher_service import VoucherService
from ...service.shipping_service import ShippingService
from ...service.order_service import OrderService
from ...service.serializers import _dt
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
def get_blogs(category: str | None = None, limit: int = 3, db: Session = Depends(get_db)):
    """Blog / tips cho user – chỉ bài đã publish."""
    key = f"user:blogs:category={category or ''}:published_only=true"
    items = _PUBLIC_TTL_CACHE.get_or_set(
        key,
        lambda: AdminService.list_blogs(db, category=category, published_only=True),
        ttl_seconds=20.0,
    )
    if limit and limit > 0:
        return items[: limit]
    return items


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
    return {
        "ok": result["ok"],
        "discountAmount": result.get("discount_amount"),
        "reason": result.get("reason"),
    }


@router.get("/vouchers/auto")
def get_auto_voucher(
    cart_total: float = 0,
    db: Session = Depends(get_db),
):
    """
    Gợi ý voucher tự động tốt nhất theo tổng tiền hàng (cart_total, VND).
    Trả về: { ok: bool, code: string | null, discountAmount: number }.
    """
    v, discount = VoucherService.pick_best_auto_voucher(db, cart_total)
    return {
        "ok": True,
        "code": (v.code if v else None),
        "discountAmount": float(discount or 0),
    }


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
    body: dict = Body(
        ...,
        description='{ "customer": { name, phone, email?, address }, "items": [ { productId, variantId?, quantity } ], "voucherCode?", "note?" }',
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
