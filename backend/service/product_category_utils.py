from sqlalchemy import exists, or_
from sqlalchemy.orm import Query, Session

from ..entities import models


def apply_category_slug_filter(query: Query, db: Session, category_slug: str | None) -> Query:
    """Filter products that belong to a category (junction table + legacy category_id)."""
    if not category_slug or not str(category_slug).strip():
        return query
    slug = str(category_slug).strip()
    cat = db.query(models.Category).filter(models.Category.slug == slug).first()
    if not cat:
        return query.filter(models.Product.id == -1)
    in_junction = exists().where(
        models.ProductCategory.product_id == models.Product.id,
        models.ProductCategory.category_id == cat.id,
    )
    return query.filter(or_(models.Product.category_id == cat.id, in_junction))


def resolve_category_ids_from_slugs(db: Session, slugs: list[str]) -> list[int]:
    ids: list[int] = []
    seen: set[int] = set()
    for raw in slugs or []:
        slug = str(raw or "").strip()
        if not slug:
            continue
        cat = db.query(models.Category).filter(models.Category.slug == slug).first()
        if cat and cat.id not in seen:
            ids.append(int(cat.id))
            seen.add(int(cat.id))
    return ids


def sync_product_categories(db: Session, product_id: int, category_ids: list[int]) -> None:
    if not category_ids:
        return
    existing = (
        db.query(models.ProductCategory)
        .filter(models.ProductCategory.product_id == product_id)
        .all()
    )
    existing_ids = {int(pc.category_id) for pc in existing}
    target_ids = [int(x) for x in category_ids]
    target_set = set(target_ids)
    for pc in existing:
        if int(pc.category_id) not in target_set:
            db.delete(pc)
    for cid in target_ids:
        if cid not in existing_ids:
            db.add(models.ProductCategory(product_id=product_id, category_id=cid))


def ensure_product_category(db: Session, product_id: int, category_id: int | None) -> None:
    if not category_id:
        return
    exists_row = (
        db.query(models.ProductCategory)
        .filter(
            models.ProductCategory.product_id == product_id,
            models.ProductCategory.category_id == category_id,
        )
        .first()
    )
    if not exists_row:
        db.add(models.ProductCategory(product_id=product_id, category_id=category_id))
