"""
Remap local Salework variant SKU from old codes to new codes using workbook mapping.

Goals:
- Keep existing product/link/display stable by keeping the OLD variant row as the canonical row.
- Rename old SKU -> new SKU in-place.
- If both old/new SKUs already exist, merge into old row then remove duplicate new row.
- Backup all touched rows to temporary backup tables with 7-day expiry for rollback.

Default mode is dry-run. Use --apply to execute updates.

Example:
  python backend/scripts/remap_salework_sku_from_workbook.py --dry-run
  python backend/scripts/remap_salework_sku_from_workbook.py --apply
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import uuid
import zipfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import func, text

# Allow standalone execution inside container/workspace.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database_config import SessionLocal
from entities import models
from service.salework_client import fetch_product_list, get_stock_total

NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


@dataclass(frozen=True)
class MappingRow:
    row_no: int
    old_sku: str
    new_sku: str


@dataclass
class RunStats:
    workbook_rows: int = 0
    changed_rows: int = 0
    changed_rows_in_salework: int = 0
    skipped_no_salework_new: int = 0
    skipped_no_local_variant: int = 0
    remapped_in_place: int = 0
    merged_duplicates: int = 0
    removed_duplicate_rows: int = 0
    moved_variant_images: int = 0
    removed_duplicate_variant_images: int = 0
    moved_combo_items: int = 0
    removed_duplicate_combo_items: int = 0


def _col_letters(cell_ref: str) -> str:
    m = re.match(r"([A-Z]+)", cell_ref or "")
    return m.group(1) if m else ""


def _xlsx_cell_value(cell_node: ET.Element, shared_strings: list[str]) -> str:
    t = cell_node.attrib.get("t")
    if t == "inlineStr":
        txt = cell_node.find("a:is/a:t", NS)
        return (txt.text or "").strip() if txt is not None and txt.text else ""
    v = cell_node.find("a:v", NS)
    if v is None or v.text is None:
        return ""
    raw = v.text
    if t == "s":
        try:
            return str(shared_strings[int(raw)]).strip()
        except Exception:
            return ""
    return str(raw).strip()


def _load_sku_mapping_from_workbook(workbook_path: Path) -> list[MappingRow]:
    if not workbook_path.exists():
        raise FileNotFoundError(f"Workbook not found: {workbook_path}")

    with zipfile.ZipFile(workbook_path) as zf:
        if "xl/sharedStrings.xml" not in zf.namelist():
            raise RuntimeError("Workbook has no sharedStrings.xml; unsupported format.")

        shared_strings: list[str] = []
        ss_root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
        for si in ss_root.findall("a:si", NS):
            parts: list[str] = []
            t = si.find("a:t", NS)
            if t is not None and t.text:
                parts.append(t.text)
            for r in si.findall("a:r", NS):
                rt = r.find("a:t", NS)
                if rt is not None and rt.text:
                    parts.append(rt.text)
            shared_strings.append("".join(parts))

        # Current workbook uses the first sheet "Chốt" and columns:
        # D = Sku cũ, I = Mã mới
        ws_root = ET.fromstring(zf.read("xl/worksheets/sheet1.xml"))

    rows: list[MappingRow] = []
    for row in ws_root.findall("a:sheetData/a:row", NS):
        row_no = int(row.attrib.get("r", "0") or 0)
        # Header lines in current workbook are row 1-2.
        if row_no < 3:
            continue
        by_col: dict[str, str] = {}
        for c in row.findall("a:c", NS):
            ref = c.attrib.get("r", "")
            by_col[_col_letters(ref)] = _xlsx_cell_value(c, shared_strings)

        old_sku = (by_col.get("D", "") or "").strip().upper()
        new_sku = (by_col.get("I", "") or "").strip().upper()
        if not old_sku:
            continue
        if not new_sku:
            continue
        rows.append(MappingRow(row_no=row_no, old_sku=old_sku, new_sku=new_sku))
    return rows


def _ensure_backup_tables(db) -> None:
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS sku_remap_backup_runs (
                run_id TEXT PRIMARY KEY,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                expires_at TIMESTAMPTZ NOT NULL,
                workbook_path TEXT NOT NULL,
                mode TEXT NOT NULL,
                summary_json JSONB
            )
            """
        )
    )
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS sku_remap_backup_variants (
                run_id TEXT NOT NULL REFERENCES sku_remap_backup_runs(run_id) ON DELETE CASCADE,
                variant_id INT NOT NULL,
                note TEXT,
                backed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                expires_at TIMESTAMPTZ NOT NULL,
                snapshot JSONB NOT NULL,
                PRIMARY KEY (run_id, variant_id)
            )
            """
        )
    )
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS sku_remap_backup_variant_images (
                run_id TEXT NOT NULL REFERENCES sku_remap_backup_runs(run_id) ON DELETE CASCADE,
                image_id INT NOT NULL,
                note TEXT,
                backed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                expires_at TIMESTAMPTZ NOT NULL,
                snapshot JSONB NOT NULL,
                PRIMARY KEY (run_id, image_id)
            )
            """
        )
    )
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS sku_remap_backup_combo_items (
                run_id TEXT NOT NULL REFERENCES sku_remap_backup_runs(run_id) ON DELETE CASCADE,
                combo_product_id INT NOT NULL,
                component_variant_id INT NOT NULL,
                note TEXT,
                backed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                expires_at TIMESTAMPTZ NOT NULL,
                snapshot JSONB NOT NULL,
                PRIMARY KEY (run_id, combo_product_id, component_variant_id)
            )
            """
        )
    )
    db.flush()


def _backup_variant(db, run_id: str, expires_at: dt.datetime, variant_id: int, note: str) -> None:
    db.execute(
        text(
            """
            INSERT INTO sku_remap_backup_variants (run_id, variant_id, note, expires_at, snapshot)
            SELECT :run_id, v.id, :note, :expires_at, to_jsonb(v.*)
            FROM product_variants v
            WHERE v.id = :variant_id
            ON CONFLICT (run_id, variant_id) DO NOTHING
            """
        ),
        {
            "run_id": run_id,
            "variant_id": variant_id,
            "note": note,
            "expires_at": expires_at,
        },
    )


def _backup_variant_images(db, run_id: str, expires_at: dt.datetime, variant_id: int, note: str) -> None:
    db.execute(
        text(
            """
            INSERT INTO sku_remap_backup_variant_images (run_id, image_id, note, expires_at, snapshot)
            SELECT :run_id, i.id, :note, :expires_at, to_jsonb(i.*)
            FROM product_variant_images i
            WHERE i.variant_id = :variant_id
            ON CONFLICT (run_id, image_id) DO NOTHING
            """
        ),
        {
            "run_id": run_id,
            "variant_id": variant_id,
            "note": note,
            "expires_at": expires_at,
        },
    )


def _backup_combo_items(db, run_id: str, expires_at: dt.datetime, variant_id: int, note: str) -> None:
    db.execute(
        text(
            """
            INSERT INTO sku_remap_backup_combo_items
                (run_id, combo_product_id, component_variant_id, note, expires_at, snapshot)
            SELECT :run_id, c.combo_product_id, c.component_variant_id, :note, :expires_at, to_jsonb(c.*)
            FROM combo_items c
            WHERE c.component_variant_id = :variant_id
            ON CONFLICT (run_id, combo_product_id, component_variant_id) DO NOTHING
            """
        ),
        {
            "run_id": run_id,
            "variant_id": variant_id,
            "note": note,
            "expires_at": expires_at,
        },
    )


def _salework_row_payload(products_dict: dict, code: str) -> tuple[str | None, int | None, float | None]:
    row = products_dict.get(code)
    if not isinstance(row, dict):
        return None, None, None
    ext = str(row.get("_id") or "").strip() or None
    stock_raw = get_stock_total(row)
    stock = max(0, int(stock_raw if stock_raw is not None else 0))
    price = row.get("retailPrice")
    try:
        p = float(price)
    except (TypeError, ValueError):
        p = None
    return ext, stock, p


def _apply_salework_payload(variant: models.ProductVariant, ext: str | None, stock: int | None, price: float | None) -> None:
    if ext:
        variant.external_sku_id = ext
    if stock is not None:
        variant.stock = int(stock)
    if price is not None:
        variant.price_override = price if price > 0 else None


def _find_salework_variant_by_sku(db, sku: str) -> models.ProductVariant | None:
    normalized = (sku or "").strip().upper()
    if not normalized:
        return None
    return (
        db.query(models.ProductVariant)
        .join(models.Product, models.Product.id == models.ProductVariant.product_id)
        .filter(models.Product.external_source == "salework")
        .filter(func.upper(models.ProductVariant.sku) == normalized)
        .first()
    )


def _merge_variant_fields(keep: models.ProductVariant, drop: models.ProductVariant) -> None:
    # Keep existing product/link/display row, fill gaps from duplicate row.
    if (not keep.size) and drop.size:
        keep.size = drop.size
    if (not keep.color) and drop.color:
        keep.color = drop.color
    if (not keep.material) and drop.material:
        keep.material = drop.material
    if (keep.price_override is None) and (drop.price_override is not None):
        keep.price_override = drop.price_override
    keep.is_active = bool(keep.is_active or drop.is_active)


def _move_variant_images(db, keep_variant_id: int, drop_variant_id: int, stats: RunStats) -> None:
    keep_images = (
        db.query(models.ProductVariantImage)
        .filter(models.ProductVariantImage.variant_id == keep_variant_id)
        .all()
    )
    keep_urls = {str(img.image_url).strip() for img in keep_images if img.image_url}

    drop_images = (
        db.query(models.ProductVariantImage)
        .filter(models.ProductVariantImage.variant_id == drop_variant_id)
        .all()
    )
    for img in drop_images:
        url = str(img.image_url or "").strip()
        if url and url in keep_urls:
            db.delete(img)
            stats.removed_duplicate_variant_images += 1
            continue
        img.variant_id = keep_variant_id
        keep_urls.add(url)
        stats.moved_variant_images += 1


def _move_combo_items(db, keep_variant_id: int, drop_variant_id: int, stats: RunStats) -> None:
    drop_rows = (
        db.query(models.ComboItem)
        .filter(models.ComboItem.component_variant_id == drop_variant_id)
        .all()
    )
    for row in drop_rows:
        exists = (
            db.query(models.ComboItem)
            .filter(models.ComboItem.combo_product_id == row.combo_product_id)
            .filter(models.ComboItem.component_variant_id == keep_variant_id)
            .first()
        )
        if exists:
            db.delete(row)
            stats.removed_duplicate_combo_items += 1
            continue
        row.component_variant_id = keep_variant_id
        stats.moved_combo_items += 1


def run_remap(workbook_path: Path, apply: bool) -> int:
    ok, data, err = fetch_product_list()
    if not ok:
        raise RuntimeError(f"Cannot fetch Salework product list: {err or 'unknown error'}")
    products_raw = (data or {}).get("products") or {}
    salework_codes = {str(k).strip().upper() for k in products_raw.keys() if str(k).strip()}

    mapping_rows = _load_sku_mapping_from_workbook(workbook_path)
    changed = [m for m in mapping_rows if m.old_sku and m.new_sku and m.old_sku != m.new_sku]

    stats = RunStats(
        workbook_rows=len(mapping_rows),
        changed_rows=len(changed),
    )

    run_id = str(uuid.uuid4())
    expires_at = dt.datetime.utcnow() + dt.timedelta(days=7)

    with SessionLocal() as db:
        _ensure_backup_tables(db)
        db.execute(
            text(
                """
                INSERT INTO sku_remap_backup_runs (run_id, expires_at, workbook_path, mode, summary_json)
                VALUES (:run_id, :expires_at, :workbook_path, :mode, CAST(:summary_json AS jsonb))
                """
            ),
            {
                "run_id": run_id,
                "expires_at": expires_at,
                "workbook_path": str(workbook_path),
                "mode": "apply" if apply else "dry-run",
                "summary_json": json.dumps({"workbook_rows": len(mapping_rows), "changed_rows": len(changed)}),
            },
        )
        db.commit()

    if not apply:
        # Dry-run impact only.
        with SessionLocal() as db:
            for m in changed:
                if m.new_sku not in salework_codes:
                    stats.skipped_no_salework_new += 1
                    continue
                stats.changed_rows_in_salework += 1
                old_v = _find_salework_variant_by_sku(db, m.old_sku)
                new_v = _find_salework_variant_by_sku(db, m.new_sku)
                if not old_v and not new_v:
                    stats.skipped_no_local_variant += 1
                elif old_v and new_v:
                    stats.merged_duplicates += 1
                elif old_v and not new_v:
                    stats.remapped_in_place += 1
        print(f"[DRY-RUN] run_id={run_id}")
        print(f"[DRY-RUN] backup expires_at(UTC)={expires_at.isoformat()}Z")
        print(f"[DRY-RUN] workbook_rows={stats.workbook_rows} changed_rows={stats.changed_rows}")
        print(f"[DRY-RUN] changed_rows_in_salework={stats.changed_rows_in_salework}")
        print(f"[DRY-RUN] remap_in_place={stats.remapped_in_place}")
        print(f"[DRY-RUN] merge_duplicate_old_new={stats.merged_duplicates}")
        print(f"[DRY-RUN] skipped_no_salework_new={stats.skipped_no_salework_new}")
        print(f"[DRY-RUN] skipped_no_local_variant={stats.skipped_no_local_variant}")
        return 0

    # Apply mode.
    with SessionLocal() as db:
        try:
            for m in changed:
                if m.new_sku not in salework_codes:
                    stats.skipped_no_salework_new += 1
                    continue
                stats.changed_rows_in_salework += 1

                old_v = _find_salework_variant_by_sku(db, m.old_sku)
                new_v = _find_salework_variant_by_sku(db, m.new_sku)

                if not old_v and not new_v:
                    stats.skipped_no_local_variant += 1
                    continue
                if not old_v and new_v:
                    # Already migrated in local DB; keep as is.
                    continue

                ext, stock, price = _salework_row_payload(products_raw, m.new_sku)

                if old_v and not new_v:
                    _backup_variant(db, run_id, expires_at, old_v.id, f"rename {m.old_sku}->{m.new_sku}")
                    _backup_variant_images(db, run_id, expires_at, old_v.id, f"rename {m.old_sku}->{m.new_sku}")
                    _backup_combo_items(db, run_id, expires_at, old_v.id, f"rename {m.old_sku}->{m.new_sku}")
                    old_v.sku = m.new_sku
                    _apply_salework_payload(old_v, ext, stock, price)
                    stats.remapped_in_place += 1
                    continue

                # old_v and new_v both exist => merge duplicate.
                assert old_v is not None and new_v is not None
                _backup_variant(db, run_id, expires_at, old_v.id, f"merge keep-old {m.old_sku}->{m.new_sku}")
                _backup_variant_images(db, run_id, expires_at, old_v.id, f"merge keep-old {m.old_sku}->{m.new_sku}")
                _backup_combo_items(db, run_id, expires_at, old_v.id, f"merge keep-old {m.old_sku}->{m.new_sku}")
                _backup_variant(db, run_id, expires_at, new_v.id, f"merge drop-new {m.old_sku}->{m.new_sku}")
                _backup_variant_images(db, run_id, expires_at, new_v.id, f"merge drop-new {m.old_sku}->{m.new_sku}")
                _backup_combo_items(db, run_id, expires_at, new_v.id, f"merge drop-new {m.old_sku}->{m.new_sku}")

                _merge_variant_fields(old_v, new_v)
                _apply_salework_payload(old_v, ext, stock, price)
                _move_variant_images(db, keep_variant_id=old_v.id, drop_variant_id=new_v.id, stats=stats)
                _move_combo_items(db, keep_variant_id=old_v.id, drop_variant_id=new_v.id, stats=stats)

                # Avoid unique constraint conflict on sku while deleting duplicate row.
                old_v.sku = f"TMP{old_v.id}SKU"
                db.flush()
                db.delete(new_v)
                db.flush()
                old_v.sku = m.new_sku
                stats.merged_duplicates += 1
                stats.removed_duplicate_rows += 1

            db.commit()
        except Exception:
            db.rollback()
            raise

    print(f"[APPLY] run_id={run_id}")
    print(f"[APPLY] backup expires_at(UTC)={expires_at.isoformat()}Z")
    print(f"[APPLY] workbook_rows={stats.workbook_rows} changed_rows={stats.changed_rows}")
    print(f"[APPLY] changed_rows_in_salework={stats.changed_rows_in_salework}")
    print(f"[APPLY] remap_in_place={stats.remapped_in_place}")
    print(f"[APPLY] merge_duplicate_old_new={stats.merged_duplicates}")
    print(f"[APPLY] removed_duplicate_rows={stats.removed_duplicate_rows}")
    print(f"[APPLY] moved_variant_images={stats.moved_variant_images}")
    print(f"[APPLY] removed_duplicate_variant_images={stats.removed_duplicate_variant_images}")
    print(f"[APPLY] moved_combo_items={stats.moved_combo_items}")
    print(f"[APPLY] removed_duplicate_combo_items={stats.removed_duplicate_combo_items}")
    print(f"[APPLY] skipped_no_salework_new={stats.skipped_no_salework_new}")
    print(f"[APPLY] skipped_no_local_variant={stats.skipped_no_local_variant}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Remap local Salework SKUs using workbook old/new mapping.")
    parser.add_argument(
        "--workbook",
        default="/opt/Clothes/Bảng mẫu mới theo hợp quy.xlsx",
        help="Absolute path to workbook (.xlsx).",
    )
    parser.add_argument("--apply", action="store_true", help="Apply updates. Default is dry-run.")
    parser.add_argument("--dry-run", action="store_true", help="Force dry-run mode.")
    args = parser.parse_args()

    apply = bool(args.apply) and (not args.dry_run)
    return run_remap(Path(args.workbook), apply=apply)


if __name__ == "__main__":
    raise SystemExit(main())

