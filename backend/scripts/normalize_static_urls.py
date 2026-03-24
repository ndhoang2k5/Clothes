"""
Normalize absolute static URLs in DB to relative /static/... paths.

Why:
- Old data may contain hardcoded hosts, e.g. http://192.168.1.131:8888/static/uploads/...
- When host/network changes, browser gets ERR_CONNECTION_TIMED_OUT on those URLs.
- Relative /static/... is portable; frontend can map to current backend origin safely.

Usage:
  python backend/scripts/normalize_static_urls.py
  python backend/scripts/normalize_static_urls.py --dry-run
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
import sys

from sqlalchemy import text

# Allow running as standalone script inside container/workspace.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database_config import SessionLocal


@dataclass(frozen=True)
class TargetColumn:
    table: str
    column: str


TARGETS: tuple[TargetColumn, ...] = (
    TargetColumn("banners", "image_url"),
    TargetColumn("product_images", "image_url"),
    TargetColumn("product_variant_images", "image_url"),
    TargetColumn("blogs", "thumbnail"),
    TargetColumn("vouchers", "image_url"),
    TargetColumn("collections", "cover_image"),
    TargetColumn("categories", "image_url"),
)

# Keep path/query/hash; drop only scheme + host[:port]
HOST_PREFIX_REGEX = r"^https?://[^/]+(/static(?:/[^?#]*)?(?:\\?[^#]*)?(?:#.*)?)$"


def _count_rows_to_normalize(table: str, column: str) -> int:
    sql = text(
        f"""
        SELECT COUNT(*)
        FROM {table}
        WHERE {column} ~* '^https?://[^/]+/static'
        """
    )
    with SessionLocal() as db:
        return int(db.execute(sql).scalar() or 0)


def _normalize_column(table: str, column: str) -> int:
    sql = text(
        f"""
        UPDATE {table}
        SET {column} = regexp_replace(
            {column},
            :host_prefix_regex,
            '\\1',
            'i'
        )
        WHERE {column} ~* '^https?://[^/]+/static'
        """
    )
    with SessionLocal() as db:
        res = db.execute(sql, {"host_prefix_regex": HOST_PREFIX_REGEX})
        db.commit()
        return int(res.rowcount or 0)


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize DB static URLs to relative /static paths.")
    parser.add_argument("--dry-run", action="store_true", help="Only show matched row counts, do not update.")
    args = parser.parse_args()

    total = 0
    for target in TARGETS:
        if args.dry_run:
            count = _count_rows_to_normalize(target.table, target.column)
            total += count
            print(f"[DRY-RUN] {target.table}.{target.column}: {count} row(s) to normalize")
            continue

        updated = _normalize_column(target.table, target.column)
        total += updated
        print(f"[UPDATED] {target.table}.{target.column}: {updated} row(s)")

    if args.dry_run:
        print(f"\n[DRY-RUN] Total rows to normalize: {total}")
    else:
        print(f"\nDone. Total updated rows: {total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

