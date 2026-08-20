#!/usr/bin/env python3
"""
Recompress heavy files under backend/static/uploads (in place).
Also rewrites DB image URLs when opaque PNG is converted to JPG.

Usage (inside backend container):
  python -m backend.scripts.optimize_uploads
  python -m backend.scripts.optimize_uploads --min-bytes 800000 --limit 200
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Allow `python backend/scripts/optimize_uploads.py` from repo root / container.
_BACKEND_ROOT = Path(__file__).resolve().parents[1]
_REPO_ROOT = _BACKEND_ROOT.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend.service.image_optimize import DEFAULT_MAX_EDGE, optimize_file_in_place  # noqa: E402


def _uploads_dir() -> Path:
    return _BACKEND_ROOT / "static" / "uploads"


def _rewrite_db_urls(old_url_suffix: str, new_url_suffix: str) -> int:
    """Replace path fragments in known image URL columns."""
    from backend.database_config import SessionLocal
    from backend.entities import models
    from sqlalchemy import update

    old = f"/static/uploads/{old_url_suffix}"
    new = f"/static/uploads/{new_url_suffix}"
    # Also handle bare uploads/ and absolute URLs containing the path.
    patterns = [
        (old, new),
        (f"uploads/{old_url_suffix}", f"uploads/{new_url_suffix}"),
        (old_url_suffix, new_url_suffix),
    ]

    db = SessionLocal()
    changed = 0
    try:
        columns = [
            (models.ProductImage, models.ProductImage.image_url),
            (models.ProductVariantImage, models.ProductVariantImage.image_url),
            (models.Banner, models.Banner.image_url),
            (models.Banner, models.Banner.mobile_image_url),
            (models.Collection, models.Collection.cover_image),
            (models.Blog, models.Blog.thumbnail),
            (models.Voucher, models.Voucher.image_url),
            (models.Voucher, models.Voucher.gift_image_url),
        ]
        for model, col in columns:
            for old_s, new_s in patterns:
                rows = db.query(model).filter(col.isnot(None), col.contains(old_s)).all()
                for row in rows:
                    val = getattr(row, col.key)
                    if not val or old_s not in val:
                        continue
                    setattr(row, col.key, val.replace(old_s, new_s))
                    changed += 1
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
    return changed


def main() -> int:
    parser = argparse.ArgumentParser(description="Optimize heavy upload images in place")
    parser.add_argument("--min-bytes", type=int, default=450_000, help="Only touch files larger than this")
    parser.add_argument("--max-edge", type=int, default=DEFAULT_MAX_EDGE)
    parser.add_argument("--limit", type=int, default=0, help="Max files to process (0 = all)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    uploads = _uploads_dir()
    if not uploads.is_dir():
        print(f"uploads dir missing: {uploads}")
        return 1

    files = sorted(
        [p for p in uploads.iterdir() if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}],
        key=lambda p: p.stat().st_size,
        reverse=True,
    )
    files = [p for p in files if p.stat().st_size >= args.min_bytes]
    if args.limit > 0:
        files = files[: args.limit]

    total_before = 0
    total_after = 0
    optimized = 0
    skipped = 0
    db_rewrites = 0

    print(f"candidates={len(files)} min_bytes={args.min_bytes} max_edge={args.max_edge}")
    for path in files:
        before = path.stat().st_size
        total_before += before
        if args.dry_run:
            print(f"DRY {before/1024/1024:.1f}MB {path.name}")
            skipped += 1
            continue

        result = optimize_file_in_place(path, max_edge=args.max_edge, min_bytes=args.min_bytes)
        if result.get("skipped"):
            skipped += 1
            total_after += before
            continue

        optimized += 1
        after = int(result.get("after") or before)
        total_after += after
        saved = int(result.get("saved") or 0)
        print(
            f"OK {before/1024/1024:.2f}MB → {after/1024/1024:.2f}MB "
            f"(-{saved/1024/1024:.2f}MB) {result.get('reason')} {Path(result['path']).name}"
        )

        old_path = result.get("old_path")
        if old_path and Path(old_path).name != Path(result["path"]).name:
            try:
                n = _rewrite_db_urls(Path(old_path).name, Path(result["path"]).name)
                db_rewrites += n
                if n:
                    print(f"  DB urls updated: {n}")
            except Exception as e:
                print(f"  DB rewrite failed: {e}")

    print(
        f"done optimized={optimized} skipped={skipped} "
        f"before={total_before/1024/1024:.1f}MB after={total_after/1024/1024:.1f}MB "
        f"saved={(total_before-total_after)/1024/1024:.1f}MB db_rewrites={db_rewrites}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
