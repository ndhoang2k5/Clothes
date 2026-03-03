
from sqlalchemy.orm import Session
from ...entities import models
from ..serializers import serialize_banner, serialize_order, serialize_product, serialize_category
from sqlalchemy.orm import selectinload

class AdminService:
    @staticmethod
    def get_all_orders(db: Session):
        orders = db.query(models.Order).order_by(models.Order.created_at.desc()).all()
        return [serialize_order(o) for o in orders]

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
            product = (
                db.query(models.Product)
                .options(
                    selectinload(models.Product.images),
                    selectinload(models.Product.variants).selectinload(models.ProductVariant.images),
                    selectinload(models.Product.category),
                )
                .filter(models.Product.id == product.id)
                .first()
            )
        return serialize_product(product)

    @staticmethod
    def list_products(db: Session, include_inactive: bool = True):
        query = db.query(models.Product).options(
            selectinload(models.Product.images),
            selectinload(models.Product.variants).selectinload(models.ProductVariant.images),
            selectinload(models.Product.category),
        )
        if not include_inactive:
            query = query.filter(models.Product.is_active == True)  # noqa: E712
        query = query.order_by(models.Product.updated_at.desc(), models.Product.id.desc())
        return [serialize_product(p) for p in query.all()]

    @staticmethod
    def get_product(db: Session, product_id: int):
        return (
            db.query(models.Product)
            .options(
                selectinload(models.Product.images),
                selectinload(models.Product.variants).selectinload(models.ProductVariant.images),
                selectinload(models.Product.category),
            )
            .filter(models.Product.id == product_id)
            .first()
        )

    @staticmethod
    def update_product(db: Session, product_id: int, data: dict):
        product = db.query(models.Product).filter(models.Product.id == product_id).first()
        if not product:
            return None
        for k, v in data.items():
            if hasattr(product, k):
                setattr(product, k, v)
        product.updated_at = __import__("datetime").datetime.utcnow()
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
        banner = models.Banner(**data)
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
