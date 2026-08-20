
import uvicorn
import os
import asyncio
import logging
import mimetypes
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .api.user.router import router as user_router
from .api.admin.router import router as admin_router
from .middleware.rate_limit import SimpleRateLimitMiddleware
from .database_config import SessionLocal
from .service.salework_sync import run_salework_sync, configure_auto_sync

# Starlette StaticFiles relies on mimetypes; some images otherwise become text/plain.
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("image/jpeg", ".jpg")
mimetypes.add_type("image/jpeg", ".jpeg")
mimetypes.add_type("image/png", ".png")
mimetypes.add_type("image/gif", ".gif")

app = FastAPI(title="Unbee Multi-Tier API")
_logger = logging.getLogger("unbee.salework")

def _parse_cors_origins(raw: str | None) -> list[str]:
    if raw is None:
        return ["*"]
    s = (raw or "").strip()
    if not s:
        return ["*"]
    if s == "*":
        return ["*"]
    return [o.strip().rstrip("/") for o in s.split(",") if o.strip()]


cors_origins = _parse_cors_origins(os.getenv("CORS_ALLOWED_ORIGINS"))
cors_allow_credentials = False if cors_origins == ["*"] else True

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Anti-overload: rate limit bursts on list/search endpoints (best-effort).
# High enough not to affect normal UI usage, but blocks abusive loops.
app.add_middleware(
    SimpleRateLimitMiddleware,
    rules=[
        # Login: tight burst + slow refill (anti brute-force; per IP).
        ("/api/admin/auth/login", 8, 1 / 60.0),
        ("/api/admin/orders", 30, 3.0),      # ~30 burst, ~3 req/s refill
        ("/api/admin/products", 30, 3.0),
        ("/api/admin/customers", 30, 3.0),
        ("/api/admin/vouchers", 30, 3.0),
        ("/api/user/products", 60, 6.0),    # user browsing
        ("/api/user/thumbs", 200, 40.0),    # card image thumbs
        ("/api/user/vouchers/auto", 60, 6.0),
        ("/api/user/vouchers/homepage-promo-cards", 120, 10.0),
        ("/api/user/shipping/calculate", 60, 6.0),
    ],
)

app.include_router(user_router, prefix="/api/user", tags=["User"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])

# Serve uploaded images + persistent thumb cache
_backend_dir = Path(__file__).resolve().parent
_static_dir = _backend_dir / "static"
(_static_dir / "uploads").mkdir(parents=True, exist_ok=True)
(_static_dir / "cache" / "thumbs").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")


def _parse_bool(raw: str | None, default: bool = False) -> bool:
    if raw is None:
        return default
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


_AUTO_SYNC_ENABLED = _parse_bool(os.getenv("SALEWORK_AUTO_SYNC_ENABLED", "true"), default=True)
_AUTO_SYNC_INTERVAL_SECONDS = max(30, int(os.getenv("SALEWORK_AUTO_SYNC_INTERVAL_SECONDS", "60")))
_AUTO_SYNC_START_DELAY_SECONDS = max(1, int(os.getenv("SALEWORK_AUTO_SYNC_START_DELAY_SECONDS", "5")))
_AUTO_SYNC_TASK: asyncio.Task | None = None
_THUMB_WARM_TASK: asyncio.Task | None = None


async def _warm_homepage_thumbs_once():
    """Pre-generate card thumbs so homepage does not cold-resize huge uploads."""
    await asyncio.sleep(3)
    def _work() -> int:
        from .entities import models
        from .service.image_thumb import warm_product_thumbs

        db = SessionLocal()
        try:
            products = (
                db.query(models.Product)
                .filter(models.Product.is_active.is_(True))
                .order_by(models.Product.updated_at.desc())
                .limit(48)
                .all()
            )
            urls: list[str] = []
            for p in products:
                imgs = sorted(
                    getattr(p, "images", []) or [],
                    key=lambda x: (not getattr(x, "is_primary", False), getattr(x, "sort_order", 0), x.id),
                )
                for img in imgs[:2]:
                    u = getattr(img, "image_url", None)
                    if u:
                        urls.append(str(u))
            return warm_product_thumbs(urls, widths=(480, 640))
        finally:
            db.close()

    try:
        n = await asyncio.to_thread(_work)
        logging.getLogger("unbee.thumbs").info("Warmed %s homepage thumbs", n)
    except Exception as e:
        logging.getLogger("unbee.thumbs").warning("Thumb warm failed: %s", e)


async def _salework_auto_sync_loop():
    await asyncio.sleep(_AUTO_SYNC_START_DELAY_SECONDS)
    while True:
        db = SessionLocal()
        try:
            result = run_salework_sync(db, trigger="auto")
            if not result.get("success") and result.get("errors"):
                _logger.warning("Salework auto sync failed: %s", result["errors"][0])
        except Exception as e:
            _logger.exception("Salework auto sync crashed: %s", e)
        finally:
            db.close()
        await asyncio.sleep(_AUTO_SYNC_INTERVAL_SECONDS)


@app.on_event("startup")
async def _startup_auto_sync():
    global _AUTO_SYNC_TASK, _THUMB_WARM_TASK
    configure_auto_sync(_AUTO_SYNC_ENABLED, _AUTO_SYNC_INTERVAL_SECONDS if _AUTO_SYNC_ENABLED else None)
    if _AUTO_SYNC_ENABLED:
        _AUTO_SYNC_TASK = asyncio.create_task(_salework_auto_sync_loop())
    _THUMB_WARM_TASK = asyncio.create_task(_warm_homepage_thumbs_once())


@app.on_event("shutdown")
async def _shutdown_auto_sync():
    global _AUTO_SYNC_TASK, _THUMB_WARM_TASK
    for task_name in ("_AUTO_SYNC_TASK", "_THUMB_WARM_TASK"):
        task = globals().get(task_name)
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            globals()[task_name] = None

if __name__ == "__main__":
    # Host 0.0.0.0 is required for Docker containers
    uvicorn.run(app, host="0.0.0.0", port=8000)
