from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func, or_
from ...entities import models
from ..serializers import serialize_product_list_item
from ..product_category_utils import apply_category_slug_filter
from ..promotion_service import PromotionService

PROMO_LIST_SLUG = "giam-gia"


class UserProductService:
    @staticmethod
    def get_active_product_facets(db: Session, category_slug: str | None = None):
        """Facet gọn cho bộ lọc; không serialize/tải toàn bộ catalog về client."""
        query = (
            db.query(
                models.ProductVariant.size,
                models.ProductVariant.color,
                models.ProductVariant.material,
            )
            .join(models.Product, models.Product.id == models.ProductVariant.product_id)
            .filter(
                models.Product.is_active.is_(True),
                models.ProductVariant.is_active.is_(True),
            )
        )

        slug = (category_slug or "").strip()
        if slug == PROMO_LIST_SLUG:
            promo_ids = PromotionService.active_product_ids(db)
            if not promo_ids:
                return {"sizes": [], "colors": [], "materials": []}
            query = query.filter(models.Product.id.in_(promo_ids))
        else:
            query = apply_category_slug_filter(query, db, category_slug)

        rows = query.distinct().all()

        def _values(index: int) -> list[str]:
            values = {
                str(row[index]).strip()
                for row in rows
                if row[index] is not None and str(row[index]).strip()
            }
            return sorted(values, key=lambda value: value.casefold())

        return {
            "sizes": _values(0),
            "colors": _values(1),
            "materials": _values(2),
        }

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
        - category=giam-gia: chỉ sản phẩm thuộc chương trình khuyến mãi % đang bật
        """
        promo_map = PromotionService.active_percent_by_product_id(db)

        query = (
            db.query(models.Product)
            .options(
                selectinload(models.Product.images),
                selectinload(models.Product.variants),
                selectinload(models.Product.category),
                selectinload(models.Product.product_categories).selectinload(models.ProductCategory.category),
            )
            .filter(models.Product.is_active == True)  # noqa: E712
        )

        slug = (category_slug or "").strip()
        if slug == PROMO_LIST_SLUG:
            promo_ids = list(promo_map.keys())
            if not promo_ids:
                return {"items": [], "total": 0, "page": max(1, page), "per_page": per_page}
            query = query.filter(models.Product.id.in_(promo_ids))
        else:
            query = apply_category_slug_filter(query, db, category_slug)

        size_list = [s.strip() for s in (sizes or "").split(",") if s.strip()] if sizes else []
        color_list = [c.strip() for c in (colors or "").split(",") if c.strip()] if colors else []
        material_list = (
            [m.strip() for m in (materials or "").split(",") if m.strip()] if materials else []
        )

        if size_list or color_list or material_list:
            vq = db.query(models.ProductVariant.id).filter(models.ProductVariant.product_id == models.Product.id)
            if size_list:
                vq = vq.filter(models.ProductVariant.size.in_(size_list))
            if color_list:
                vq = vq.filter(models.ProductVariant.color.in_(color_list))
            if material_list:
                vq = vq.filter(models.ProductVariant.material.in_(material_list))
            query = query.filter(vq.exists())

        q_term = (q or "").strip()
        if q_term:
            like_term = f"%{q_term}%"
            sku_exists = (
                db.query(models.ProductVariant.id)
                .filter(models.ProductVariant.product_id == models.Product.id)
                .filter(models.ProductVariant.sku.ilike(like_term))
                .exists()
            )
            query = query.filter(
                or_(
                    models.Product.name.ilike(like_term),
                    models.Product.slug.ilike(like_term),
                    sku_exists,
                )
            )

        actual_price_expr = func.coalesce(models.Product.discount_price, models.Product.base_price)

        if price_min is not None:
            query = query.filter(actual_price_expr >= int(price_min))
        if price_max is not None and price_max > 0:
            query = query.filter(actual_price_expr <= int(price_max))

        sort_key = (sort or "").strip().lower()
        if sort_key == "price-asc":
            query = query.order_by(actual_price_expr.asc(), models.Product.id.desc())
        elif sort_key == "price-desc":
            query = query.order_by(actual_price_expr.desc(), models.Product.id.desc())
        elif sort_key == "bestseller":
            if hasattr(models.Product, "is_hot"):
                query = query.order_by(models.Product.is_hot.desc(), models.Product.updated_at.desc())
            else:
                query = query.order_by(models.Product.updated_at.desc(), models.Product.id.desc())
        else:
            query = query.order_by(models.Product.updated_at.desc(), models.Product.id.desc())
        total = query.order_by(None).count()
        if per_page and per_page > 0:
            page = max(1, page)
            offset = (page - 1) * per_page
            items = query.limit(per_page).offset(offset).all()
            return {
                "items": [
                    serialize_product_list_item(
                        p,
                        omit_missing_upload_files=True,
                        promo_percent=promo_map.get(int(p.id)),
                    )
                    for p in items
                ],
                "total": total,
                "page": page,
                "per_page": per_page,
            }
        return {
            "items": [
                serialize_product_list_item(
                    p,
                    omit_missing_upload_files=True,
                    promo_percent=promo_map.get(int(p.id)),
                )
                for p in query.all()
            ],
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
                selectinload(models.Product.product_categories).selectinload(models.ProductCategory.category),
            )
            .filter(models.Product.id == product_id)
            .filter(models.Product.is_active == True)  # noqa: E712
            .first()
        )
