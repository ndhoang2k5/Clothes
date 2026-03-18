
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import case, func, or_
from ...entities import models
from ..serializers import serialize_product, serialize_product_list_item

class UserProductService:
    @staticmethod
    def get_active_products(
        db: Session,
        category_slug: str | None = None,
        page: int = 1,
        per_page: int = 24,
        sizes: str | None = None,
        colors: str | None = None,
        materials: str | None = None,
        price_min: int | None = None,
        price_max: int | None = None,
        sort: str | None = None,
        q: str | None = None,
    ):
        """
        Trả về danh sách sản phẩm đang active, hỗ trợ filter server-side.

        - sizes: chuỗi "S,M,L"
        - colors: chuỗi "trang,den"
        - materials: chuỗi "cotton,lanh"
        - price_min, price_max: filter theo khoảng giá (discount_price ưu tiên)
        - sort: newest | price-asc | price-desc | bestseller
        - q: tìm kiếm theo tên / slug sản phẩm và SKU biến thể
        """
        query = (
            db.query(models.Product)
            .options(
                selectinload(models.Product.images),
                selectinload(models.Product.variants),
                selectinload(models.Product.category),
            )
            .filter(models.Product.is_active == True)  # noqa: E712
        )
        if category_slug and str(category_slug).strip():
            cat = (
                db.query(models.Category)
                .filter(models.Category.slug == str(category_slug).strip())
                .first()
            )
            if cat:
                query = query.filter(models.Product.category_id == cat.id)
            else:
                # slug không tồn tại -> trả về rỗng
                query = query.filter(models.Product.id == -1)

        # Parse filter lists
        size_list = [s.strip() for s in (sizes or "").split(",") if s.strip()] if sizes else []
        color_list = [c.strip() for c in (colors or "").split(",") if c.strip()] if colors else []
        material_list = (
            [m.strip() for m in (materials or "").split(",") if m.strip()] if materials else []
        )

        # Join variants nếu cần filter theo size/màu
        if size_list or color_list:
            query = query.join(models.Product.variants)
            if size_list:
                query = query.filter(models.ProductVariant.size.in_(size_list))
            if color_list:
                query = query.filter(models.ProductVariant.color.in_(color_list))
            query = query.distinct()

        if material_list:
            # `material` is defined on ProductVariant, so we need variants in the query.
            if not (size_list or color_list):
                query = query.join(models.Product.variants)
            query = query.filter(models.ProductVariant.material.in_(material_list)).distinct()

        # Text search (name/slug + variant SKU)
        q_term = (q or "").strip()
        if q_term:
            like_term = f"%{q_term}%"
            query = (
                query.outerjoin(models.ProductVariant, models.ProductVariant.product_id == models.Product.id)
                .filter(
                    or_(
                        models.Product.name.ilike(like_term),
                        models.Product.slug.ilike(like_term),
                        models.ProductVariant.sku.ilike(like_term),
                    )
                )
                .distinct()
            )

        # Giá thực tế (ưu tiên discount_price nếu có, ngược lại dùng base_price)
        # Dùng CASE/func.coalesce thay vì ifnull
        actual_price_expr = func.coalesce(models.Product.discount_price, models.Product.base_price)

        if price_min is not None:
            query = query.filter(actual_price_expr >= int(price_min))
        if price_max is not None and price_max > 0:
            query = query.filter(actual_price_expr <= int(price_max))

        # Sorting
        sort_key = (sort or "").strip().lower()
        if sort_key == "price-asc":
            query = query.order_by(actual_price_expr.asc(), models.Product.id.desc())
        elif sort_key == "price-desc":
            query = query.order_by(actual_price_expr.desc(), models.Product.id.desc())
        elif sort_key == "bestseller":
            # Nếu có is_hot thì ưu tiên, sau đó mới theo updated_at
            if hasattr(models.Product, "is_hot"):
                query = query.order_by(models.Product.is_hot.desc(), models.Product.updated_at.desc())
            else:
                query = query.order_by(models.Product.updated_at.desc(), models.Product.id.desc())
        else:
            # newest (mặc định)
            query = query.order_by(models.Product.updated_at.desc(), models.Product.id.desc())
        total = query.order_by(None).count()
        if per_page and per_page > 0:
            page = max(1, page)
            offset = (page - 1) * per_page
            items = query.limit(per_page).offset(offset).all()
            return {
                "items": [serialize_product_list_item(p) for p in items],
                "total": total,
                "page": page,
                "per_page": per_page,
            }
        return {
            "items": [serialize_product_list_item(p) for p in query.all()],
            "total": total,
            "page": 1,
            "per_page": 0,
        }

    @staticmethod
    def get_active_product(db: Session, product_id: int):
        return (
            db.query(models.Product)
            .options(
                selectinload(models.Product.images),
                selectinload(models.Product.variants).selectinload(models.ProductVariant.images),
                selectinload(models.Product.category),
            )
            .filter(models.Product.id == product_id)
            .filter(models.Product.is_active == True)  # noqa: E712
            .first()
        )
