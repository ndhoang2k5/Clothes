"""
Product percent-off promotions (admin-managed campaigns).
Applies percent to base_price, overrides product.discount_price when active.
"""
from __future__ import annotations

import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session, selectinload

from ..entities import models


def ensure_promotion_tables(db: Session) -> None:
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS product_promotions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                percent_off INTEGER NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                CONSTRAINT product_promotions_percent_check
                    CHECK (percent_off >= 1 AND percent_off <= 99)
            )
            """
        )
    )
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS product_promotion_items (
                promotion_id INTEGER NOT NULL
                    REFERENCES product_promotions(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL
                    REFERENCES products(id) ON DELETE CASCADE,
                PRIMARY KEY (promotion_id, product_id)
            )
            """
        )
    )
    db.execute(
        text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_product_promotion_items_product
            ON product_promotion_items (product_id)
            """
        )
    )
    db.commit()


def promo_sale_price(base_price: Any, percent_off: int) -> float:
    base = float(base_price or 0)
    pct = max(1, min(99, int(percent_off)))
    return float(int(round(base * (100 - pct) / 100.0)))


def apply_promo_to_payload(payload: dict, percent_off: int | None) -> dict:
    if not percent_off:
        payload["sale_percent"] = None
        return payload
    pct = int(percent_off)
    payload["discount_price"] = promo_sale_price(payload.get("base_price"), pct)
    payload["sale_percent"] = pct
    payload["is_sale"] = True
    return payload


class PromotionService:
    @staticmethod
    def active_percent_by_product_id(db: Session) -> dict[int, int]:
        ensure_promotion_tables(db)
        rows = (
            db.query(models.ProductPromotionItem.product_id, models.ProductPromotion.percent_off)
            .join(
                models.ProductPromotion,
                models.ProductPromotion.id == models.ProductPromotionItem.promotion_id,
            )
            .filter(models.ProductPromotion.is_active.is_(True))
            .all()
        )
        return {int(pid): int(pct) for pid, pct in rows}

    @staticmethod
    def active_product_ids(db: Session) -> list[int]:
        return list(PromotionService.active_percent_by_product_id(db).keys())

    @staticmethod
    def _sync_discount_prices(db: Session, affected_product_ids: list[int] | None = None) -> None:
        """
        Ghi đè discount_price / is_sale theo khuyến mãi % đang bật.
        Sản phẩm vừa bị gỡ khỏi KM (không còn trong promo active) → xóa discount_price.
        """
        rows = (
            db.query(models.ProductPromotionItem.product_id, models.ProductPromotion.percent_off)
            .join(
                models.ProductPromotion,
                models.ProductPromotion.id == models.ProductPromotionItem.promotion_id,
            )
            .filter(models.ProductPromotion.is_active.is_(True))
            .all()
        )
        promo_map = {int(pid): int(pct) for pid, pct in rows}
        ids = list({int(x) for x in (affected_product_ids or []) if int(x) > 0})
        ids = list({*ids, *promo_map.keys()})
        if not ids:
            return

        products = db.query(models.Product).filter(models.Product.id.in_(ids)).all()
        for p in products:
            pct = promo_map.get(int(p.id))
            if pct:
                p.discount_price = promo_sale_price(p.base_price, pct)
                p.is_sale = True
            else:
                p.discount_price = None
                p.is_sale = False

    @staticmethod
    def _serialize(promo: models.ProductPromotion) -> dict:
        items = getattr(promo, "items", None) or []
        products = []
        for it in items:
            p = getattr(it, "product", None)
            if not p:
                continue
            imgs = sorted(getattr(p, "images", []) or [], key=lambda x: (getattr(x, "sort_order", 0), x.id))
            primary = next((i for i in imgs if getattr(i, "is_primary", False)), None) or (imgs[0] if imgs else None)
            products.append(
                {
                    "id": p.id,
                    "name": p.name,
                    "slug": getattr(p, "slug", None),
                    "base_price": float(p.base_price or 0),
                    "sale_price": promo_sale_price(p.base_price, promo.percent_off),
                    "primary_image_url": getattr(primary, "image_url", None) if primary else None,
                    "is_active": bool(getattr(p, "is_active", True)),
                }
            )
        return {
            "id": promo.id,
            "name": promo.name,
            "percent_off": int(promo.percent_off),
            "is_active": bool(promo.is_active),
            "product_ids": [int(it.product_id) for it in items],
            "products": products,
            "product_count": len(products),
            "created_at": promo.created_at.isoformat() if promo.created_at else None,
            "updated_at": promo.updated_at.isoformat() if promo.updated_at else None,
        }

    @staticmethod
    def list_promotions(db: Session) -> list[dict]:
        ensure_promotion_tables(db)
        rows = (
            db.query(models.ProductPromotion)
            .options(
                selectinload(models.ProductPromotion.items).selectinload(models.ProductPromotionItem.product).selectinload(
                    models.Product.images
                )
            )
            .order_by(models.ProductPromotion.percent_off.desc(), models.ProductPromotion.id.desc())
            .all()
        )
        return [PromotionService._serialize(r) for r in rows]

    @staticmethod
    def get_promotion(db: Session, promotion_id: int) -> dict | None:
        ensure_promotion_tables(db)
        row = (
            db.query(models.ProductPromotion)
            .options(
                selectinload(models.ProductPromotion.items).selectinload(models.ProductPromotionItem.product).selectinload(
                    models.Product.images
                )
            )
            .filter(models.ProductPromotion.id == int(promotion_id))
            .first()
        )
        return PromotionService._serialize(row) if row else None

    @staticmethod
    def _normalize_product_ids(raw: Any) -> list[int]:
        ids: list[int] = []
        seen = set()
        for x in raw or []:
            try:
                pid = int(x)
            except (TypeError, ValueError):
                continue
            if pid <= 0 or pid in seen:
                continue
            seen.add(pid)
            ids.append(pid)
        return ids

    @staticmethod
    def _set_items(db: Session, promo: models.ProductPromotion, product_ids: list[int]) -> list[int]:
        """Replace promo items. Returns product ids removed from this promo."""
        old_ids = [
            int(r.product_id)
            for r in db.query(models.ProductPromotionItem)
            .filter(models.ProductPromotionItem.promotion_id == promo.id)
            .all()
        ]
        if product_ids:
            db.query(models.ProductPromotionItem).filter(
                models.ProductPromotionItem.product_id.in_(product_ids)
            ).delete(synchronize_session=False)
        db.query(models.ProductPromotionItem).filter(
            models.ProductPromotionItem.promotion_id == promo.id
        ).delete(synchronize_session=False)
        for pid in product_ids:
            exists = db.query(models.Product.id).filter(models.Product.id == pid).first()
            if not exists:
                continue
            db.add(models.ProductPromotionItem(promotion_id=promo.id, product_id=pid))
        return [pid for pid in old_ids if pid not in set(product_ids)]

    @staticmethod
    def create_promotion(db: Session, data: dict) -> dict:
        ensure_promotion_tables(db)
        try:
            percent = int(data.get("percent_off"))
        except (TypeError, ValueError) as e:
            raise ValueError("percent_off phải là số nguyên 1–99") from e
        if percent < 1 or percent > 99:
            raise ValueError("percent_off phải từ 1 đến 99")

        name = (data.get("name") or "").strip() or f"Giảm {percent}%"
        product_ids = PromotionService._normalize_product_ids(data.get("product_ids"))
        now = datetime.datetime.utcnow()
        promo = models.ProductPromotion(
            name=name,
            percent_off=percent,
            is_active=bool(data.get("is_active", True)),
            created_at=now,
            updated_at=now,
        )
        db.add(promo)
        db.flush()
        PromotionService._set_items(db, promo, product_ids)
        PromotionService._sync_discount_prices(db, product_ids)
        db.commit()
        return PromotionService.get_promotion(db, promo.id) or {}

    @staticmethod
    def update_promotion(db: Session, promotion_id: int, data: dict) -> dict | None:
        ensure_promotion_tables(db)
        promo = db.query(models.ProductPromotion).filter(models.ProductPromotion.id == int(promotion_id)).first()
        if not promo:
            return None

        affected: list[int] = [
            int(r.product_id)
            for r in db.query(models.ProductPromotionItem)
            .filter(models.ProductPromotionItem.promotion_id == promo.id)
            .all()
        ]

        if "name" in data and data.get("name") is not None:
            name = str(data.get("name") or "").strip()
            if name:
                promo.name = name
        if "percent_off" in data and data.get("percent_off") is not None:
            try:
                percent = int(data.get("percent_off"))
            except (TypeError, ValueError) as e:
                raise ValueError("percent_off phải là số nguyên 1–99") from e
            if percent < 1 or percent > 99:
                raise ValueError("percent_off phải từ 1 đến 99")
            promo.percent_off = percent
        if "is_active" in data and data.get("is_active") is not None:
            promo.is_active = bool(data.get("is_active"))
        if "product_ids" in data:
            removed = PromotionService._set_items(
                db, promo, PromotionService._normalize_product_ids(data.get("product_ids"))
            )
            affected.extend(removed)
            affected.extend(PromotionService._normalize_product_ids(data.get("product_ids")))

        promo.updated_at = datetime.datetime.utcnow()
        current_ids = [
            int(r.product_id)
            for r in db.query(models.ProductPromotionItem)
            .filter(models.ProductPromotionItem.promotion_id == promo.id)
            .all()
        ]
        PromotionService._sync_discount_prices(db, [*affected, *current_ids])
        db.commit()
        return PromotionService.get_promotion(db, promo.id)

    @staticmethod
    def delete_promotion(db: Session, promotion_id: int) -> bool:
        ensure_promotion_tables(db)
        promo = db.query(models.ProductPromotion).filter(models.ProductPromotion.id == int(promotion_id)).first()
        if not promo:
            return False
        affected = [
            int(r.product_id)
            for r in db.query(models.ProductPromotionItem)
            .filter(models.ProductPromotionItem.promotion_id == promo.id)
            .all()
        ]
        db.delete(promo)
        db.flush()
        PromotionService._sync_discount_prices(db, affected)
        db.commit()
        return True
