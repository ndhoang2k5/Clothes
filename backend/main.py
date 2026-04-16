
import uvicorn
import os
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .api.user.router import router as user_router
from .api.admin.router import router as admin_router
from .middleware.rate_limit import SimpleRateLimitMiddleware
from .database_config import SessionLocal
from .service.salework_sync import run_salework_sync, configure_auto_sync

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
        ("/api/user/vouchers/auto", 60, 6.0),
        ("/api/user/shipping/calculate", 60, 6.0),
    ],
)

app.include_router(user_router, prefix="/api/user", tags=["User"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])

# Serve uploaded images
_backend_dir = Path(__file__).resolve().parent
_static_dir = _backend_dir / "static"
(_static_dir / "uploads").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")


def _parse_bool(raw: str | None, default: bool = False) -> bool:
    if raw is None:
        return default
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


_AUTO_SYNC_ENABLED = _parse_bool(os.getenv("SALEWORK_AUTO_SYNC_ENABLED", "true"), default=True)
_AUTO_SYNC_INTERVAL_SECONDS = max(30, int(os.getenv("SALEWORK_AUTO_SYNC_INTERVAL_SECONDS", "60")))
_AUTO_SYNC_START_DELAY_SECONDS = max(1, int(os.getenv("SALEWORK_AUTO_SYNC_START_DELAY_SECONDS", "5")))
_AUTO_SYNC_TASK: asyncio.Task | None = None


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
    global _AUTO_SYNC_TASK
    configure_auto_sync(_AUTO_SYNC_ENABLED, _AUTO_SYNC_INTERVAL_SECONDS if _AUTO_SYNC_ENABLED else None)
    if _AUTO_SYNC_ENABLED:
        _AUTO_SYNC_TASK = asyncio.create_task(_salework_auto_sync_loop())


@app.on_event("shutdown")
async def _shutdown_auto_sync():
    global _AUTO_SYNC_TASK
    if _AUTO_SYNC_TASK:
        _AUTO_SYNC_TASK.cancel()
        try:
            await _AUTO_SYNC_TASK
        except asyncio.CancelledError:
            pass
        _AUTO_SYNC_TASK = None

if __name__ == "__main__":
    # Host 0.0.0.0 is required for Docker containers
    uvicorn.run(app, host="0.0.0.0", port=8000)
