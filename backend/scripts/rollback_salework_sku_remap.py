"""
Rollback one SKU remap run created by remap_salework_sku_from_workbook.py.

This restores backed-up rows from:
- sku_remap_backup_variants
- sku_remap_backup_variant_images
- sku_remap_backup_combo_items

Usage:
  python backend/scripts/rollback_salework_sku_remap.py --run-id <run_id>
"""

from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path

from sqlalchemy import text

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database_config import SessionLocal
from entities import models


def _coerce_datetime(value):
    if value is None or isinstance(value, dt.datetime):
        return value
    try:
        return dt.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


def _restore_variant(db, snapshot: dict) -> None:
    variant_id = int(snapshot["id"])
    row = db.query(models.ProductVariant).filter(models.ProductVariant.id == variant_id).first()
    payload = dict(snapshot)
    payload["created_at"] = _coerce_datetime(payload.get("created_at"))
    payload["updated_at"] = _coerce_datetime(payload.get("updated_at"))
    if row is None:
        row = models.ProductVariant(**payload)
        db.add(row)
        return
    for key, val in payload.items():
        if hasattr(row, key):
            setattr(row, key, val)


def _restore_variant_image(db, snapshot: dict) -> None:
    image_id = int(snapshot["id"])
    row = db.query(models.ProductVariantImage).filter(models.ProductVariantImage.id == image_id).first()
    payload = dict(snapshot)
    payload["created_at"] = _coerce_datetime(payload.get("created_at"))
    if row is None:
        row = models.ProductVariantImage(**payload)
        db.add(row)
        return
    for key, val in payload.items():
        if hasattr(row, key):
            setattr(row, key, val)


def _restore_combo_item(db, snapshot: dict) -> None:
    combo_product_id = int(snapshot["combo_product_id"])
    component_variant_id = int(snapshot["component_variant_id"])
    row = (
        db.query(models.ComboItem)
        .filter(models.ComboItem.combo_product_id == combo_product_id)
        .filter(models.ComboItem.component_variant_id == component_variant_id)
        .first()
    )
    payload = dict(snapshot)
    if row is None:
        db.add(models.ComboItem(**payload))
        return
    row.quantity = int(payload.get("quantity") or row.quantity or 1)


def rollback_run(run_id: str) -> int:
    with SessionLocal() as db:
        run_row = db.execute(
            text("SELECT run_id, created_at, mode FROM sku_remap_backup_runs WHERE run_id = :run_id"),
            {"run_id": run_id},
        ).first()
        if not run_row:
            raise RuntimeError(f"Run not found: {run_id}")

        variant_rows = db.execute(
            text(
                """
                SELECT snapshot
                FROM sku_remap_backup_variants
                WHERE run_id = :run_id
                ORDER BY variant_id ASC
                """
            ),
            {"run_id": run_id},
        ).fetchall()
        for row in variant_rows:
            _restore_variant(db, dict(row[0] or {}))
        db.flush()

        image_rows = db.execute(
            text(
                """
                SELECT snapshot
                FROM sku_remap_backup_variant_images
                WHERE run_id = :run_id
                ORDER BY image_id ASC
                """
            ),
            {"run_id": run_id},
        ).fetchall()
        for row in image_rows:
            _restore_variant_image(db, dict(row[0] or {}))
        db.flush()

        combo_rows = db.execute(
            text(
                """
                SELECT snapshot
                FROM sku_remap_backup_combo_items
                WHERE run_id = :run_id
                ORDER BY combo_product_id ASC, component_variant_id ASC
                """
            ),
            {"run_id": run_id},
        ).fetchall()
        for row in combo_rows:
            _restore_combo_item(db, dict(row[0] or {}))

        db.commit()

    print(f"[ROLLBACK] restored run_id={run_id}")
    print(f"[ROLLBACK] variants={len(variant_rows)} images={len(image_rows)} combo_items={len(combo_rows)}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Rollback one Salework SKU remap run.")
    parser.add_argument("--run-id", required=True, help="run_id from remap script output")
    args = parser.parse_args()
    return rollback_run(args.run_id)


if __name__ == "__main__":
    raise SystemExit(main())

