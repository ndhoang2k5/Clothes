
from sqlalchemy import text, or_
from sqlalchemy.orm import Session
from ...entities import models
from ..serializers import (
    serialize_banner,
    serialize_order,
    serialize_product,
    serialize_category,
    serialize_collection,
    serialize_product_picker_item,
    serialize_blog,
    serialize_customer,
    serialize_voucher,
    serialize_shipping_rule,
)
from ..customer_service import CustomerService
from ..voucher_service import VoucherService
from ..shipping_service import ShippingService
from ..order_service import OrderService
from ..serializers import _normalize_banner_image_url
from sqlalchemy.orm import selectinload

class AdminService:
    @staticmethod
    def _enrich_serialized_order_for_admin(db: Session, data: dict):
        """
        Bổ sung thông tin hiển thị cho màn chi tiết đơn:
        - image_url cho từng item (ưu tiên ảnh variant, fallback ảnh product)
        - thông tin quà tặng khi áp voucher loại product
        """
        items = list(data.get("items") or [])

        variant_ids = []
        product_ids = []
        if items:
            for it in items:
                vid = it.get("variant_id")
                pid = it.get("product_id")
                if vid is not None:
                    try:
                        variant_ids.append(int(vid))
                    except Exception:
                        pass
                if pid is not None:
                    try:
                        product_ids.append(int(pid))
                    except Exception:
                        pass

        variant_map: dict[int, str] = {}
        product_map: dict[int, str] = {}

        if variant_ids:
            rows = (
                db.query(models.ProductVariantImage)
                .filter(models.ProductVariantImage.variant_id.in_(list(set(variant_ids))))
                .order_by(
                    models.ProductVariantImage.variant_id.asc(),
                    models.ProductVariantImage.is_primary.desc(),
                    models.ProductVariantImage.sort_order.asc(),
                    models.ProductVariantImage.id.asc(),
                )
                .all()
            )
            for r in rows:
                if r.variant_id not in variant_map and getattr(r, "image_url", None):
                    variant_map[r.variant_id] = r.image_url

        if product_ids:
            rows = (
                db.query(models.ProductImage)
                .filter(models.ProductImage.product_id.in_(list(set(product_ids))))
                .order_by(
                    models.ProductImage.product_id.asc(),
                    models.ProductImage.is_primary.desc(),
                    models.ProductImage.sort_order.asc(),
                    models.ProductImage.id.asc(),
                )
                .all()
            )
            for r in rows:
                if r.product_id not in product_map and getattr(r, "image_url", None):
                    product_map[r.product_id] = r.image_url

        out = dict(data)
        if items:
            enriched_items = []
            for it in items:
                vid = it.get("variant_id")
                pid = it.get("product_id")
                image_url = None
                try:
                    if vid is not None:
                        image_url = variant_map.get(int(vid))
                except Exception:
                    pass
                if not image_url:
                    try:
                        if pid is not None:
                            image_url = product_map.get(int(pid))
                    except Exception:
                        pass
                enriched = dict(it)
                enriched["image_url"] = image_url
                enriched_items.append(enriched)
            out["items"] = enriched_items

        gift_code = (out.get("applied_gift_voucher_code") or "").strip()
        if gift_code:
            gift_voucher = (
                db.query(models.Voucher)
                .filter(models.Voucher.code == gift_code)
                .first()
            )
            if gift_voucher and getattr(gift_voucher, "type", None) == "product":
                out["applied_gift_product_name"] = (
                    getattr(gift_voucher, "display_name", None) or gift_voucher.code
                )
                out["applied_gift_product_image"] = getattr(gift_voucher, "image_url", None)

        return out

    @staticmethod
    def get_all_orders(db: Session):
        orders = db.query(models.Order).order_by(models.Order.created_at.desc()).all()
        return [serialize_order(o) for o in orders]

    @staticmethod
    def list_orders(
        db: Session,
        page: int = 1,
        per_page: int = 50,
        status: str | None = None,
        q: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
    ):
        result = OrderService.get_all_orders(db, page=page, per_page=per_page, status=status, q=q, date_from=date_from, date_to=date_to)
        return {
            "items": [serialize_order(o) for o in result["items"]],
            "total": result["total"],
            "page": result["page"],
            "per_page": result["per_page"],
        }

    @staticmethod
    def get_order(db: Session, order_id: int):
        order = OrderService.get_by_id(db, order_id)
        if not order:
            return None
        return AdminService._enrich_serialized_order_for_admin(db, serialize_order(order))

    @staticmethod
    def update_order_status(db: Session, order_id: int, status: str):
        order = OrderService.update_status(db, order_id, status)
        if not order:
            return None
        return AdminService._enrich_serialized_order_for_admin(db, serialize_order(order))

    # --- Customers (Phase A.2) ---
    @staticmethod
    def list_customers(db: Session, q: str | None = None, page: int = 1, per_page: int = 30):
        result = CustomerService.list(db, q=q, page=page, per_page=per_page)
        return {
            "items": [serialize_customer(c) for c in result["items"]],
            "total": result["total"],
            "page": result["page"],
            "per_page": result["per_page"],
        }

    @staticmethod
    def get_customer(db: Session, customer_id: int):
        customer = CustomerService.get_by_id(db, customer_id)
        return serialize_customer(customer) if customer else None

    @staticmethod
    def create_customer(db: Session, data: dict):
        customer = CustomerService.create(db, data)
        return serialize_customer(customer) if customer else None

    @staticmethod
    def update_customer(db: Session, customer_id: int, data: dict):
        customer = CustomerService.update(db, customer_id, data)
        return serialize_customer(customer) if customer else None

    # --- Vouchers (Phase A.3) ---
    @staticmethod
    def list_vouchers(db: Session, q: str | None = None, is_active: bool | None = None, page: int = 1, per_page: int = 30):
        result = VoucherService.list(db, q=q, is_active=is_active, page=page, per_page=per_page)
        return {
            "items": [serialize_voucher(v) for v in result["items"]],
            "total": result["total"],
            "page": result["page"],
            "per_page": result["per_page"],
        }

    @staticmethod
    def get_voucher(db: Session, voucher_id: int):
        voucher = VoucherService.get_by_id(db, voucher_id)
        return serialize_voucher(voucher) if voucher else None

    @staticmethod
    def create_voucher(db: Session, data: dict):
        voucher = VoucherService.create(db, data)
        return serialize_voucher(voucher) if voucher else None

    @staticmethod
    def update_voucher(db: Session, voucher_id: int, data: dict):
        voucher = VoucherService.update(db, voucher_id, data)
        return serialize_voucher(voucher) if voucher else None

    # --- Shipping rules (Phase A.4) ---
    @staticmethod
    def list_shipping_rules(db: Session, active_only: bool | None = None):
        rules = ShippingService.list(db, active_only=active_only)
        return [serialize_shipping_rule(r) for r in rules]

    @staticmethod
    def get_shipping_rule(db: Session, rule_id: int):
        rule = ShippingService.get_by_id(db, rule_id)
        return serialize_shipping_rule(rule) if rule else None

    @staticmethod
    def create_shipping_rule(db: Session, data: dict):
        rule = ShippingService.create(db, data)
        return serialize_shipping_rule(rule) if rule else None

    @staticmethod
    def update_shipping_rule(db: Session, rule_id: int, data: dict):
        rule = ShippingService.update(db, rule_id, data)
        return serialize_shipping_rule(rule) if rule else None

    @staticmethod
    def delete_shipping_rule(db: Session, rule_id: int) -> bool:
        return ShippingService.delete(db, rule_id)

    @staticmethod
    def create_product(db: Session, data: dict):
        images = data.pop("images", None)  # optional list of {image_url,...} or strings
        variants = data.pop("variants", None)  # optional list of variant dicts

        product = models.Product(**data)
        db.add(product)
        db.commit()
        db.refresh(product)

        if images:
            for idx, img in enumerate(images):
                if isinstance(img, str):
                    img_data = {"image_url": img, "sort_order": idx, "is_primary": idx == 0}
                else:
                    img_data = {
                        "image_url": img.get("image_url") or img.get("url"),
                        "alt_text": img.get("alt_text"),
                        "sort_order": img.get("sort_order", idx),
                        "is_primary": img.get("is_primary", idx == 0),
                    }
                if img_data["image_url"]:
                    db.add(models.ProductImage(product_id=product.id, **img_data))

        if variants:
            for v in variants:
                if not isinstance(v, dict):
                    continue
                db.add(models.ProductVariant(product_id=product.id, **v))

        if images or variants:
            db.commit()
            product = AdminService.get_product(db, product.id)
        return serialize_product(product)

    @staticmethod
    def list_products(
        db: Session,
        include_inactive: bool = True,
        q: str | None = None,
        category_slug: str | None = None,
        page: int = 1,
        per_page: int = 30,
    ):
        query = db.query(models.Product).options(
            selectinload(models.Product.images),
            selectinload(models.Product.variants).selectinload(models.ProductVariant.images),
            selectinload(models.Product.category),
            selectinload(models.Product.combo_components).selectinload(models.ComboItem.component_variant),
        )
        if not include_inactive:
            query = query.filter(models.Product.is_active == True)  # noqa: E712
        if category_slug and str(category_slug).strip():
            cat = (
                db.query(models.Category)
                .filter(models.Category.slug == str(category_slug).strip())
                .first()
            )
            if cat:
                query = query.filter(models.Product.category_id == cat.id)
            else:
                query = query.filter(models.Product.id == -1)
        if q and str(q).strip():
            term = f"%{str(q).strip()}%"
            query = (
                query.outerjoin(models.ProductVariant, models.ProductVariant.product_id == models.Product.id)
                .filter(
                    (models.Product.name.ilike(term))
                    | (models.Product.slug.ilike(term))
                    | (models.ProductVariant.sku.ilike(term))
                )
                .distinct()
            )
        total = query.order_by(None).count()
        query = query.order_by(models.Product.updated_at.desc(), models.Product.id.desc())
        if per_page and per_page > 0:
            page = max(1, page)
            offset = (page - 1) * per_page
            items = query.limit(per_page).offset(offset).all()
            return {
                "items": [serialize_product(p) for p in items],
                "total": total,
                "page": page,
                "per_page": per_page,
            }
        return {
            "items": [serialize_product(p) for p in query.all()],
            "total": total,
            "page": 1,
            "per_page": 0,
        }

    @staticmethod
    def list_products_picker(
        db: Session,
        q: str | None = None,
        category_slug: str | None = None,
        page: int = 1,
        per_page: int = 30,
        include_inactive: bool = True,
    ):
        query = db.query(models.Product).options(
            selectinload(models.Product.images),
            selectinload(models.Product.variants),
        )
        if not include_inactive:
            query = query.filter(models.Product.is_active == True)  # noqa: E712
        if category_slug and str(category_slug).strip():
            cat = (
                db.query(models.Category)
                .filter(models.Category.slug == str(category_slug).strip())
                .first()
            )
            if cat:
                query = query.filter(models.Product.category_id == cat.id)
            else:
                query = query.filter(models.Product.id == -1)
        if q and str(q).strip():
            term = f"%{str(q).strip()}%"
            query = (
                query.outerjoin(models.ProductVariant, models.ProductVariant.product_id == models.Product.id)
                .filter(
                    (models.Product.name.ilike(term))
                    | (models.Product.slug.ilike(term))
                    | (models.ProductVariant.sku.ilike(term))
                )
                .distinct()
            )
        total = query.order_by(None).count()
        query = query.order_by(models.Product.updated_at.desc(), models.Product.id.desc())
        page = max(1, int(page or 1))
        per_page = max(1, min(200, int(per_page or 30)))
        offset = (page - 1) * per_page
        items = query.limit(per_page).offset(offset).all()
        return {
            "items": [serialize_product_picker_item(p) for p in items],
            "total": total,
            "page": page,
            "per_page": per_page,
        }

    # --- Collections ---
    @staticmethod
    def list_collections(db: Session, include_inactive: bool = True):
        query = db.query(models.Collection).options(selectinload(models.Collection.items))
        if not include_inactive:
            query = query.filter(models.Collection.is_active == True)  # noqa: E712
        query = query.order_by(models.Collection.sort_order.asc(), models.Collection.updated_at.desc(), models.Collection.id.desc())
        return [serialize_collection(c) for c in query.all()]

    @staticmethod
    def get_collection(db: Session, collection_id: int):
        return (
            db.query(models.Collection)
            .options(selectinload(models.Collection.items))
            .filter(models.Collection.id == collection_id)
            .first()
        )

    @staticmethod
    def _slugify_collection(name: str) -> str:
        import re

        base = re.sub(r"[^\w\s-]", "", (name or "bst")[:120])
        base = re.sub(r"[-\s]+", "-", base).strip("-").lower() or "bst"
        return base

    @staticmethod
    def create_collection(db: Session, data: dict):
        name = (data.get("name") or "").strip()
        if not name:
            return None
        slug = (data.get("slug") or "").strip()
        if not slug:
            slug = AdminService._slugify_collection(name)
        # ensure unique slug
        base = slug
        n = 0
        while db.query(models.Collection).filter(models.Collection.slug == slug).first():
            n += 1
            slug = f"{base}-{n}"

        col = models.Collection(
            name=name,
            slug=slug,
            description=data.get("description"),
            cover_image=data.get("cover_image"),
            is_active=bool(data.get("is_active", True)),
            sort_order=int(data.get("sort_order") or 0),
        )
        db.add(col)
        db.flush()

        product_ids = data.get("product_ids") or data.get("products") or []
        try:
            product_ids = [int(x) for x in product_ids]
        except Exception:
            product_ids = []
        for idx, pid in enumerate(product_ids):
            db.add(models.CollectionProduct(collection_id=col.id, product_id=pid, sort_order=idx))

        db.commit()
        db.refresh(col)
        col = AdminService.get_collection(db, col.id)
        return serialize_collection(col) if col else None

    @staticmethod
    def update_collection(db: Session, collection_id: int, data: dict):
        col = db.query(models.Collection).filter(models.Collection.id == collection_id).first()
        if not col:
            return None
        for k in ["name", "description", "cover_image", "is_active", "sort_order", "slug"]:
            if k in data and hasattr(col, k):
                setattr(col, k, data.get(k))
        col.updated_at = __import__("datetime").datetime.utcnow()

        if "product_ids" in data or "products" in data:
            product_ids = data.get("product_ids") or data.get("products") or []
            try:
                product_ids = [int(x) for x in product_ids]
            except Exception:
                product_ids = []
            # Replace items
            db.query(models.CollectionProduct).filter(models.CollectionProduct.collection_id == collection_id).delete()
            for idx, pid in enumerate(product_ids):
                db.add(models.CollectionProduct(collection_id=collection_id, product_id=pid, sort_order=idx))

        db.commit()
        col = AdminService.get_collection(db, collection_id)
        return serialize_collection(col) if col else None

    @staticmethod
    def delete_collection(db: Session, collection_id: int) -> bool:
        col = db.query(models.Collection).filter(models.Collection.id == collection_id).first()
        if not col:
            return False
        db.delete(col)
        db.commit()
        return True

    @staticmethod
    def get_product(db: Session, product_id: int):
        return (
            db.query(models.Product)
            .options(
                selectinload(models.Product.images),
                selectinload(models.Product.variants).selectinload(models.ProductVariant.images),
                selectinload(models.Product.category),
                selectinload(models.Product.combo_components).selectinload(models.ComboItem.component_variant),
            )
            .filter(models.Product.id == product_id)
            .first()
        )

    @staticmethod
    def update_product(db: Session, product_id: int, data: dict):
        product = db.query(models.Product).filter(models.Product.id == product_id).first()
        if not product:
            return None
        data = dict(data)
        # Luôn resolve category từ slug (ưu tiên); tự tạo danh mục "uu-dai-cuoi-mua" nếu chưa có
        if "category" in data:
            raw = data.pop("category")
            slug = str(raw).strip() if raw and isinstance(raw, str) else None
            if slug:
                slug = str(slug).strip()
                cat = db.query(models.Category).filter(models.Category.slug == slug).first()
                if not cat and slug == "uu-dai-cuoi-mua":
                    db.execute(
                        text(
                            "INSERT INTO categories (name, slug, icon, sort_order) "
                            "VALUES ('Ưu đãi cuối mùa', 'uu-dai-cuoi-mua', '🏷️', 7) "
                            "ON CONFLICT (slug) DO NOTHING"
                        )
                    )
                    db.commit()
                    cat = db.query(models.Category).filter(models.Category.slug == "uu-dai-cuoi-mua").first()
                if cat:
                    data["category_id"] = cat.id
        if "category_id" in data and data["category_id"] is not None:
            try:
                data["category_id"] = int(data["category_id"])
            except (TypeError, ValueError):
                data.pop("category_id", None)
        for k, v in data.items():
            if hasattr(product, k):
                setattr(product, k, v)
        product.updated_at = __import__("datetime").datetime.utcnow()
        # Ghi trực tiếp xuống DB khi đổi category để chắc chắn
        if "category_id" in data:
            cid = data["category_id"]
            db.execute(text("UPDATE products SET category_id = :cid, updated_at = NOW() WHERE id = :pid"), {"cid": cid, "pid": product_id})
            db.expire(product, ["category"])
        db.commit()
        db.refresh(product)
        product = AdminService.get_product(db, product_id)
        return serialize_product(product) if product else None

    @staticmethod
    def delete_product(db: Session, product_id: int) -> bool:
        product = db.query(models.Product).filter(models.Product.id == product_id).first()
        if not product:
            return False
        db.delete(product)
        db.commit()
        return True

    @staticmethod
    def merge_products(db: Session, data: dict):
        """
        Gộp nhiều sản phẩm thành 1. Body:
        - product_ids: list[int]
        - name: str
        - category_id: int
        - description: str | None
        - variant_assignments: list[{ variant_id: int, size?: str, color?: str }]
        """
        product_ids = data.get("product_ids") or []
        name = (data.get("name") or "").strip()
        category_id = data.get("category_id")
        description = data.get("description")
        variant_assignments = {int(x["variant_id"]): x for x in (data.get("variant_assignments") or []) if x.get("variant_id") is not None}

        if not name or not product_ids:
            return None
        product_ids = list(set(int(x) for x in product_ids))

        # Load products and collect all variants
        products = (
            db.query(models.Product)
            .options(selectinload(models.Product.variants), selectinload(models.Product.images))
            .filter(models.Product.id.in_(product_ids))
            .all()
        )
        if len(products) != len(product_ids):
            return None

        all_variants = []
        for p in products:
            for v in p.variants:
                all_variants.append(v)
        if not all_variants:
            return None

        # Unique slug
        import re
        slug_base = re.sub(r"[^\w\s-]", "", (name or "sp")[:200])
        slug_base = re.sub(r"[-\s]+", "-", slug_base).strip("-").lower() or "sp"
        slug = slug_base
        n = 0
        while db.query(models.Product).filter(models.Product.slug == slug).first():
            n += 1
            slug = f"{slug_base}-{n}"

        # Base price from first variant
        first_v = all_variants[0]
        base_price = float(first_v.price_override or 0) or (first_v.product and float(first_v.product.base_price) or 0)

        new_product = models.Product(
            category_id=category_id,
            name=name,
            slug=slug,
            description=description or None,
            base_price=base_price,
            discount_price=None,
            currency="VND",
            kind="single",
            is_active=True,
            is_hot=False,
            is_new=True,
            is_sale=False,
        )
        db.add(new_product)
        db.flush()

        # Move variants to new product and set size/color
        for v in all_variants:
            # IMPORTANT: use relationship assignment to avoid delete-orphan
            # when deleting old products in the same session.
            v.product = new_product
            assign = variant_assignments.get(v.id)
            if assign:
                if "size" in assign:
                    v.size = assign["size"]
                if "color" in assign:
                    v.color = assign["color"]

        # Copy images from all source products so the merged product has full gallery,
        # but tránh trùng ảnh theo URL.
        seen_urls = set()
        unique_images = []
        for p in products:
            for img in p.images or []:
                url = (img.image_url or "").strip()
                if not url:
                    continue
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                unique_images.append(img)

        if unique_images:
            for idx, img in enumerate(unique_images):
                db.add(
                    models.ProductImage(
                        product_id=new_product.id,
                        image_url=img.image_url,
                        alt_text=getattr(img, "alt_text", None),
                        sort_order=idx,
                        is_primary=(idx == 0),
                    )
                )

        # Delete old products (variants already moved)
        for p in products:
            db.delete(p)
        db.commit()
        db.refresh(new_product)
        return AdminService.get_product(db, new_product.id)

    # --- Combo items helpers ---
    @staticmethod
    def _recalculate_combo_price(db: Session, combo_product_id: int):
        combo = (
            db.query(models.Product)
            .options(selectinload(models.Product.combo_components).selectinload(models.ComboItem.component_variant))
            .filter(models.Product.id == combo_product_id)
            .first()
        )
        if not combo:
            return
        if combo.kind != "combo":
            return
        total = 0
        for ci in combo.combo_components:
            v = ci.component_variant
            if not v or not v.product:
                continue
            unit_price = v.price_override if getattr(v, "price_override", None) is not None else v.product.base_price
            total += float(unit_price) * int(ci.quantity or 1)
        combo.base_price = total
        db.commit()

    @staticmethod
    def list_combo_items(db: Session, combo_product_id: int):
        combo = (
            db.query(models.Product)
            .options(selectinload(models.Product.combo_components).selectinload(models.ComboItem.component_variant))
            .filter(models.Product.id == combo_product_id)
            .first()
        )
        if not combo:
            return None
        from ..serializers import serialize_variant

        items = []
        for ci in combo.combo_components:
            v = ci.component_variant
            items.append(
                {
                    "combo_product_id": ci.combo_product_id,
                    "component_variant_id": ci.component_variant_id,
                    "quantity": ci.quantity,
                    "variant": serialize_variant(v) if v else None,
                    "product": {
                        "id": v.product.id,
                        "name": v.product.name,
                    }
                    if v and v.product
                    else None,
                }
            )
        return items

    @staticmethod
    def add_combo_item(db: Session, combo_product_id: int, component_variant_id: int, quantity: int = 1):
        combo = db.query(models.Product).filter(models.Product.id == combo_product_id).first()
        if not combo:
            return None
        if combo.kind != "combo":
            return None
        variant = db.query(models.ProductVariant).filter(models.ProductVariant.id == component_variant_id).first()
        if not variant:
            return None
        existing = (
            db.query(models.ComboItem)
            .filter(
                models.ComboItem.combo_product_id == combo_product_id,
                models.ComboItem.component_variant_id == component_variant_id,
            )
            .first()
        )
        if existing:
            existing.quantity = quantity
        else:
            db.add(
                models.ComboItem(
                    combo_product_id=combo_product_id,
                    component_variant_id=component_variant_id,
                    quantity=quantity,
                )
            )
        db.commit()
        AdminService._recalculate_combo_price(db, combo_product_id)
        return AdminService.list_combo_items(db, combo_product_id)

    @staticmethod
    def update_combo_item(db: Session, combo_product_id: int, component_variant_id: int, quantity: int):
        item = (
            db.query(models.ComboItem)
            .filter(
                models.ComboItem.combo_product_id == combo_product_id,
                models.ComboItem.component_variant_id == component_variant_id,
            )
            .first()
        )
        if not item:
            return None
        item.quantity = quantity
        db.commit()
        AdminService._recalculate_combo_price(db, combo_product_id)
        return AdminService.list_combo_items(db, combo_product_id)

    @staticmethod
    def delete_combo_item(db: Session, combo_product_id: int, component_variant_id: int) -> bool:
        item = (
            db.query(models.ComboItem)
            .filter(
                models.ComboItem.combo_product_id == combo_product_id,
                models.ComboItem.component_variant_id == component_variant_id,
            )
            .first()
        )
        if not item:
            return False
        db.delete(item)
        db.commit()
        AdminService._recalculate_combo_price(db, combo_product_id)
        return True

    @staticmethod
    def create_variant(db: Session, product_id: int, data: dict):
        product = db.query(models.Product).filter(models.Product.id == product_id).first()
        if not product:
            return None
        variant = models.ProductVariant(product_id=product_id, **data)
        db.add(variant)
        db.commit()
        db.refresh(variant)
        return variant

    @staticmethod
    def update_variant(db: Session, variant_id: int, data: dict):
        variant = db.query(models.ProductVariant).filter(models.ProductVariant.id == variant_id).first()
        if not variant:
            return None
        for k, v in data.items():
            if hasattr(variant, k):
                setattr(variant, k, v)
        variant.updated_at = __import__("datetime").datetime.utcnow()
        db.commit()
        db.refresh(variant)
        return variant

    @staticmethod
    def delete_variant(db: Session, variant_id: int) -> bool:
        variant = db.query(models.ProductVariant).filter(models.ProductVariant.id == variant_id).first()
        if not variant:
            return False
        db.delete(variant)
        db.commit()
        return True

    @staticmethod
    def add_product_image(db: Session, product_id: int, data: dict):
        product = db.query(models.Product).filter(models.Product.id == product_id).first()
        if not product:
            return None
        img = models.ProductImage(product_id=product_id, **data)
        db.add(img)
        db.commit()
        db.refresh(img)
        return img

    @staticmethod
    def delete_product_image(db: Session, image_id: int) -> bool:
        img = db.query(models.ProductImage).filter(models.ProductImage.id == image_id).first()
        if not img:
            return False
        db.delete(img)
        db.commit()
        return True

    @staticmethod
    def set_product_image_primary(db: Session, image_id: int) -> bool:
        """
        Set exactly one product image as `is_primary=True` for the image's product.
        """
        img = db.query(models.ProductImage).filter(models.ProductImage.id == image_id).first()
        if not img:
            return False

        product_id = img.product_id
        # Unset other images first
        db.query(models.ProductImage).filter(models.ProductImage.product_id == product_id).update(
            {"is_primary": False}
        )
        img.is_primary = True
        db.commit()
        return True

    @staticmethod
    def add_variant_image(db: Session, variant_id: int, data: dict):
        variant = db.query(models.ProductVariant).filter(models.ProductVariant.id == variant_id).first()
        if not variant:
            return None
        img = models.ProductVariantImage(variant_id=variant_id, **data)
        db.add(img)
        db.commit()
        db.refresh(img)
        return img

    @staticmethod
    def delete_variant_image(db: Session, image_id: int) -> bool:
        img = db.query(models.ProductVariantImage).filter(models.ProductVariantImage.id == image_id).first()
        if not img:
            return False
        db.delete(img)
        db.commit()
        return True

    @staticmethod
    def list_banners(db: Session, slot: str | None = None, active_only: bool = True):
        query = db.query(models.Banner)
        if slot:
            query = query.filter(models.Banner.slot == slot)
        if active_only:
            query = query.filter(models.Banner.is_active == True)  # noqa: E712
        query = query.order_by(models.Banner.slot.asc(), models.Banner.sort_order.asc(), models.Banner.id.asc())
        return [serialize_banner(b) for b in query.all()]

    @staticmethod
    def list_categories(db: Session, active_only: bool = True):
        query = db.query(models.Category)
        if active_only:
            query = query.filter(models.Category.is_active == True)  # noqa: E712
        query = query.order_by(models.Category.sort_order.asc(), models.Category.id.asc())
        return [serialize_category(c) for c in query.all()]

    @staticmethod
    def create_banner(db: Session, data: dict):
        payload = dict(data)
        if "image_url" in payload and payload["image_url"]:
            payload["image_url"] = _normalize_banner_image_url(payload["image_url"])
        banner = models.Banner(**payload)
        db.add(banner)
        db.commit()
        db.refresh(banner)
        return serialize_banner(banner)

    @staticmethod
    def update_banner(db: Session, banner_id: int, data: dict):
        banner = db.query(models.Banner).filter(models.Banner.id == banner_id).first()
        if not banner:
            return None
        for k, v in data.items():
            if hasattr(banner, k):
                if k == "image_url" and v:
                    v = _normalize_banner_image_url(v)
                setattr(banner, k, v)
        banner.updated_at = __import__("datetime").datetime.utcnow()
        db.commit()
        db.refresh(banner)
        return serialize_banner(banner)

    @staticmethod
    def delete_banner(db: Session, banner_id: int) -> bool:
        banner = db.query(models.Banner).filter(models.Banner.id == banner_id).first()
        if not banner:
            return False
        db.delete(banner)
        db.commit()
        return True

    # --- Blogs / Intro / Tips ---
    @staticmethod
    def list_blogs(
        db: Session,
        category: str | None = None,
        published_only: bool = False,
        q: str | None = None,
    ):
        query = db.query(models.Blog)
        if category:
            query = query.filter(models.Blog.category == category)
        if published_only:
            query = query.filter(models.Blog.is_published == True)  # noqa: E712
        q_term = (q or "").strip()
        if q_term:
            like_term = f"%{q_term}%"
            query = query.filter(
                or_(
                    models.Blog.title.ilike(like_term),
                    models.Blog.slug.ilike(like_term),
                    models.Blog.content.ilike(like_term),
                )
            )
        query = query.order_by(models.Blog.published_at.desc().nullslast(), models.Blog.created_at.desc())
        return [serialize_blog(b) for b in query.all()]

    @staticmethod
    def get_blog(db: Session, blog_id: int):
        return db.query(models.Blog).filter(models.Blog.id == blog_id).first()

    @staticmethod
    def _slugify_blog(title: str) -> str:
        import re

        base = re.sub(r"[^\w\s-]", "", (title or "bai-viet")[:200])
        base = re.sub(r"[-\s]+", "-", base).strip("-").lower() or "bai-viet"
        return base

    @staticmethod
    def create_blog(db: Session, data: dict):
        title = (data.get("title") or "").strip()
        if not title:
            return None
        slug = (data.get("slug") or "").strip() or AdminService._slugify_blog(title)
        # ensure unique slug
        base = slug
        n = 0
        while db.query(models.Blog).filter(models.Blog.slug == slug).first():
            n += 1
            slug = f"{base}-{n}"

        category = (data.get("category") or "").strip() or None
        blog = models.Blog(
            title=title,
            slug=slug,
            content=data.get("content") or "",
            thumbnail=data.get("thumbnail"),
            author=data.get("author"),
            category=category,
            is_published=bool(data.get("is_published", False)),
        )
        if blog.is_published and not getattr(blog, "published_at", None):
            blog.published_at = __import__("datetime").datetime.utcnow()
        db.add(blog)
        db.commit()
        db.refresh(blog)
        return serialize_blog(blog)

    @staticmethod
    def update_blog(db: Session, blog_id: int, data: dict):
        blog = db.query(models.Blog).filter(models.Blog.id == blog_id).first()
        if not blog:
            return None
        if "title" in data and data["title"]:
            blog.title = data["title"]
        if "slug" in data and data["slug"]:
            blog.slug = data["slug"]
        if "content" in data:
            blog.content = data["content"] or ""
        if "thumbnail" in data:
            blog.thumbnail = data["thumbnail"]
        if "author" in data:
            blog.author = data["author"]
        if "category" in data:
            blog.category = data["category"]
        if "is_published" in data:
            is_pub = bool(data["is_published"])
            if is_pub and not blog.is_published and not blog.published_at:
                blog.published_at = __import__("datetime").datetime.utcnow()
            blog.is_published = is_pub
        blog.updated_at = __import__("datetime").datetime.utcnow()
        db.commit()
        db.refresh(blog)
        return serialize_blog(blog)

    @staticmethod
    def delete_blog(db: Session, blog_id: int) -> bool:
        blog = db.query(models.Blog).filter(models.Blog.id == blog_id).first()
        if not blog:
            return False
        db.delete(blog)
        db.commit()
        return True
