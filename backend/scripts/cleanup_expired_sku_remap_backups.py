"""
Delete expired SKU remap backup data.

Backups are considered expired when `expires_at < now()`.
This removes rows in backup tables and run metadata.

Usage:
  python backend/scripts/cleanup_expired_sku_remap_backups.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import text

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database_config import SessionLocal


def cleanup() -> int:
    with SessionLocal() as db:
        expired_runs = db.execute(
            text(
                """
                SELECT run_id
                FROM sku_remap_backup_runs
                WHERE expires_at < NOW()
                """
            )
        ).fetchall()
        run_ids = [str(r[0]) for r in expired_runs]
        if not run_ids:
            print("[CLEANUP] no expired runs")
            return 0

        db.execute(
            text("DELETE FROM sku_remap_backup_runs WHERE run_id = ANY(:run_ids)"),
            {"run_ids": run_ids},
        )
        db.commit()
    print(f"[CLEANUP] removed expired runs: {len(run_ids)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(cleanup())

