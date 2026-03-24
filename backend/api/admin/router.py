
from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from ...service.admin.admin_service import AdminService
from ...service.salework_sync import sync_salework
from ...database_config import get_db
from pathlib import Path
import uuid

router = APIRouter()

@router.get("/orders")
def list_orders(
    page: int = 1,
    per_page: int = 50,
    status: str | None = None,
    q: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db),
):
    return AdminService.list_orders(db, page=page, per_page=per_page, status=status, q=q, date_from=date_from, date_to=date_to)

@router.get("/orders/kpis")
def get_order_kpis(db: Session = Depends(get_db)):
    return AdminService.get_order_kpis(db)

@router.get("/orders/{order_id}")
def get_order(order_id: int, db: Session = Depends(get_db)):
    out = AdminService.get_order(db, order_id)
    if out is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return out

@router.patch("/orders/{order_id}/status")
def update_order_status(order_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    """
    Body: { status: pending|confirmed|paid|shipped|completed|cancelled }
    """
    status = (data.get("status") or "").strip()
    try:
        out = AdminService.update_order_status(db, order_id, status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if out is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return out

@router.get("/customers")
def list_customers(
    q: str | None = None,
    page: int = 1,
    per_page: int = 30,
    db: Session = Depends(get_db),
):
    return AdminService.list_customers(db, q=q, page=page, per_page=per_page)

@router.get("/customers/{customer_id}")
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    out = AdminService.get_customer(db, customer_id)
    if out is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return out

@router.post("/customers")
def create_customer(data: dict = Body(...), db: Session = Depends(get_db)):
    return AdminService.create_customer(db, data)

@router.patch("/customers/{customer_id}")
def update_customer(customer_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    out = AdminService.update_customer(db, customer_id, data)
    if out is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return out

@router.get("/vouchers")
def list_vouchers(
    q: str | None = None,
    is_active: bool | None = None,
    page: int = 1,
    per_page: int = 30,
    db: Session = Depends(get_db),
):
    return AdminService.list_vouchers(db, q=q, is_active=is_active, page=page, per_page=per_page)

@router.get("/vouchers/{voucher_id}")
def get_voucher(voucher_id: int, db: Session = Depends(get_db)):
    out = AdminService.get_voucher(db, voucher_id)
    if out is None:
        raise HTTPException(status_code=404, detail="Voucher not found")
    return out

@router.post("/vouchers")
def create_voucher(data: dict = Body(...), db: Session = Depends(get_db)):
    return AdminService.create_voucher(db, data)

@router.patch("/vouchers/{voucher_id}")
def update_voucher(voucher_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    out = AdminService.update_voucher(db, voucher_id, data)
    if out is None:
        raise HTTPException(status_code=404, detail="Voucher not found")
    return out

@router.get("/shipping-rules")
def list_shipping_rules(active_only: bool | None = None, db: Session = Depends(get_db)):
    return AdminService.list_shipping_rules(db, active_only=active_only)

@router.get("/shipping-rules/{rule_id}")
def get_shipping_rule(rule_id: int, db: Session = Depends(get_db)):
    out = AdminService.get_shipping_rule(db, rule_id)
    if out is None:
        raise HTTPException(status_code=404, detail="Shipping rule not found")
    return out

@router.post("/shipping-rules")
def create_shipping_rule(data: dict = Body(...), db: Session = Depends(get_db)):
    return AdminService.create_shipping_rule(db, data)

@router.patch("/shipping-rules/{rule_id}")
def update_shipping_rule(rule_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    out = AdminService.update_shipping_rule(db, rule_id, data)
    if out is None:
        raise HTTPException(status_code=404, detail="Shipping rule not found")
    return out

@router.delete("/shipping-rules/{rule_id}")
def delete_shipping_rule(rule_id: int, db: Session = Depends(get_db)):
    if not AdminService.delete_shipping_rule(db, rule_id):
        raise HTTPException(status_code=404, detail="Shipping rule not found")
    return {"ok": True}

@router.get("/categories")
def list_categories(active_only: bool = True, db: Session = Depends(get_db)):
    return AdminService.list_categories(db, active_only=active_only)

@router.get("/products")
def list_products(
    include_inactive: bool = True,
    q: str | None = None,
    category: str | None = None,
    page: int = 1,
    per_page: int = 30,
    db: Session = Depends(get_db),
):
    """Paginated list. Omit page/per_page or set per_page=0 to get all (can be slow)."""
    return AdminService.list_products(
        db, include_inactive=include_inactive, q=q, category_slug=category, page=page, per_page=per_page
    )


@router.get("/products/picker")
def list_products_picker(
    q: str | None = None,
    category: str | None = None,
    page: int = 1,
    per_page: int = 30,
    include_inactive: bool = True,
    db: Session = Depends(get_db),
):
    """Lightweight products list for pickers (collections/combo)."""
    return AdminService.list_products_picker(db, q=q, category_slug=category, page=page, per_page=per_page, include_inactive=include_inactive)

@router.get("/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = AdminService.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    # reuse serializer by calling update_product with no changes is ugly; just serialize in service
    from ...service.serializers import serialize_product
    return serialize_product(product)

@router.post("/products")
def create_product(data: dict = Body(...), db: Session = Depends(get_db)):
    return AdminService.create_product(db, data)

@router.put("/products/{product_id}")
def update_product(product_id: int, data: dict = Body(default={}), db: Session = Depends(get_db)):
    data = data or {}
    updated = AdminService.update_product(db, product_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Product not found")
    return updated

@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    ok = AdminService.delete_product(db, product_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


@router.post("/products/merge")
def merge_products(data: dict, db: Session = Depends(get_db)):
    """Gộp nhiều sản phẩm thành 1. Body: product_ids[], name, category_id, description?, variant_assignments: [{ variant_id, size?, color? }]"""
    merged = AdminService.merge_products(db, data)
    if not merged:
        raise HTTPException(status_code=400, detail="Merge failed (invalid product_ids or variant_assignments)")
    from ...service.serializers import serialize_product
    return serialize_product(merged)


@router.post("/salework/sync")
def salework_sync(db: Session = Depends(get_db)):
    """Gọi API Salework, đồng bộ sản phẩm theo mã SKU (code)."""
    result = sync_salework(db)
    return result


@router.get("/salework/status")
def salework_status():
    """Trạng thái đồng bộ Salework (last_sync có thể mở rộng sau)."""
    return {"last_sync_at": None, "message": "Gọi POST /api/admin/salework/sync để đồng bộ."}


@router.post("/products/{product_id}/variants")
def add_variant(product_id: int, data: dict, db: Session = Depends(get_db)):
    v = AdminService.create_variant(db, product_id, data)
    if not v:
        raise HTTPException(status_code=404, detail="Product not found")
    from ...service.serializers import serialize_variant
    return serialize_variant(v)

@router.put("/variants/{variant_id}")
def update_variant(variant_id: int, data: dict, db: Session = Depends(get_db)):
    v = AdminService.update_variant(db, variant_id, data)
    if not v:
        raise HTTPException(status_code=404, detail="Variant not found")
    from ...service.serializers import serialize_variant
    return serialize_variant(v)

@router.delete("/variants/{variant_id}")
def delete_variant(variant_id: int, db: Session = Depends(get_db)):
    ok = AdminService.delete_variant(db, variant_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Variant not found")
    return {"ok": True}

@router.post("/products/{product_id}/images")
def add_product_image(product_id: int, data: dict, db: Session = Depends(get_db)):
    img = AdminService.add_product_image(db, product_id, data)
    if not img:
        raise HTTPException(status_code=404, detail="Product not found")
    return {
        "id": img.id,
        "product_id": img.product_id,
        "image_url": img.image_url,
        "alt_text": img.alt_text,
        "sort_order": img.sort_order,
        "is_primary": img.is_primary,
    }

@router.delete("/product-images/{image_id}")
def delete_product_image(image_id: int, db: Session = Depends(get_db)):
    ok = AdminService.delete_product_image(db, image_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"ok": True}


@router.post("/product-images/{image_id}/set-primary")
def set_product_image_primary(image_id: int, db: Session = Depends(get_db)):
    ok = AdminService.set_product_image_primary(db, image_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"ok": True}


@router.get("/products/{product_id}/combo-items")
def list_combo_items(product_id: int, db: Session = Depends(get_db)):
    items = AdminService.list_combo_items(db, product_id)
    if items is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return items


@router.post("/products/{product_id}/combo-items")
def add_combo_item(product_id: int, data: dict, db: Session = Depends(get_db)):
    variant_id = int(data.get("component_variant_id"))
    quantity = int(data.get("quantity") or 1)
    items = AdminService.add_combo_item(db, product_id, variant_id, quantity)
    if items is None:
        raise HTTPException(status_code=400, detail="Invalid combo or variant")
    return items


@router.put("/products/{product_id}/combo-items/{variant_id}")
def update_combo_item(product_id: int, variant_id: int, data: dict, db: Session = Depends(get_db)):
    quantity = int(data.get("quantity") or 1)
    items = AdminService.update_combo_item(db, product_id, variant_id, quantity)
    if items is None:
        raise HTTPException(status_code=404, detail="Combo item not found")
    return items


@router.delete("/products/{product_id}/combo-items/{variant_id}")
def delete_combo_item(product_id: int, variant_id: int, db: Session = Depends(get_db)):
    ok = AdminService.delete_combo_item(db, product_id, variant_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Combo item not found")
    return {"ok": True}

@router.post("/variants/{variant_id}/images")
def add_variant_image(variant_id: int, data: dict, db: Session = Depends(get_db)):
    img = AdminService.add_variant_image(db, variant_id, data)
    if not img:
        raise HTTPException(status_code=404, detail="Variant not found")
    return {
        "id": img.id,
        "variant_id": img.variant_id,
        "image_url": img.image_url,
        "alt_text": img.alt_text,
        "sort_order": img.sort_order,
        "is_primary": img.is_primary,
    }

@router.delete("/variant-images/{image_id}")
def delete_variant_image(image_id: int, db: Session = Depends(get_db)):
    ok = AdminService.delete_variant_image(db, image_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"ok": True}


@router.get("/collections")
def list_collections(include_inactive: bool = True, db: Session = Depends(get_db)):
    return AdminService.list_collections(db, include_inactive=include_inactive)


@router.get("/collections/{collection_id}")
def get_collection(collection_id: int, db: Session = Depends(get_db)):
    col = AdminService.get_collection(db, collection_id)
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    from ...service.serializers import serialize_collection
    return serialize_collection(col)


@router.post("/collections")
def create_collection(data: dict, db: Session = Depends(get_db)):
    created = AdminService.create_collection(db, data)
    if not created:
        raise HTTPException(status_code=400, detail="Invalid collection payload")
    return created


@router.put("/collections/{collection_id}")
def update_collection(collection_id: int, data: dict, db: Session = Depends(get_db)):
    updated = AdminService.update_collection(db, collection_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Collection not found")
    return updated


@router.delete("/collections/{collection_id}")
def delete_collection(collection_id: int, db: Session = Depends(get_db)):
    ok = AdminService.delete_collection(db, collection_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Collection not found")
    return {"ok": True}

@router.get("/banners")
def list_banners(slot: str | None = None, active_only: bool = True, db: Session = Depends(get_db)):
    return AdminService.list_banners(db, slot=slot, active_only=active_only)


@router.post("/banners")
def create_banner(data: dict = Body(...), db: Session = Depends(get_db)):
    return AdminService.create_banner(db, data)


@router.put("/banners/{banner_id}")
def update_banner(banner_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    updated = AdminService.update_banner(db, banner_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Banner not found")
    return updated


@router.delete("/banners/{banner_id}")
def delete_banner(banner_id: int, db: Session = Depends(get_db)):
    ok = AdminService.delete_banner(db, banner_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"ok": True}


@router.post("/upload-image")
def upload_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")

    backend_dir = Path(__file__).resolve().parents[2]  # backend/
    upload_dir = backend_dir / "static" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "").suffix.lower()
    if ext not in [".png", ".jpg", ".jpeg", ".webp", ".gif"]:
        ext = ".png"

    name = f"{uuid.uuid4().hex}{ext}"
    dst = upload_dir / name
    with dst.open("wb") as f:
        f.write(file.file.read())

    return {"url": f"/static/uploads/{name}"}


@router.get("/blogs")
def list_blogs(
    category: str | None = None,
    status: str | None = None,
    author: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    return AdminService.list_blogs(
        db,
        category=category,
        status=status,
        author=author,
        date_from=date_from,
        date_to=date_to,
        published_only=False,
        q=q,
    )


@router.get("/blogs/kpis")
def get_blog_kpis(
    category: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db),
):
    return AdminService.get_blog_kpis(db, category=category, date_from=date_from, date_to=date_to)


@router.get("/blogs/editor-config")
def get_blog_editor_config(db: Session = Depends(get_db)):
    return AdminService.get_blog_editor_config(db)


@router.put("/blogs/editor-config")
def update_blog_editor_config(data: dict = Body(default={}), db: Session = Depends(get_db)):
    data = data or {}
    return AdminService.set_blog_editor_config(db, data)


@router.post("/blogs")
def create_blog(data: dict, db: Session = Depends(get_db)):
    try:
        created = AdminService.create_blog(db, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not created:
        raise HTTPException(status_code=400, detail="Invalid blog payload")
    return created


@router.put("/blogs/{blog_id}")
def update_blog(blog_id: int, data: dict, db: Session = Depends(get_db)):
    try:
        updated = AdminService.update_blog(db, blog_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not updated:
        raise HTTPException(status_code=404, detail="Blog not found")
    return updated


@router.delete("/blogs/{blog_id}")
def delete_blog(blog_id: int, db: Session = Depends(get_db)):
    ok = AdminService.delete_blog(db, blog_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Blog not found")
    return {"ok": True}
