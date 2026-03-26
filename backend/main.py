
import uvicorn
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .api.user.router import router as user_router
from .api.admin.router import router as admin_router
from .middleware.rate_limit import SimpleRateLimitMiddleware

app = FastAPI(title="Unbee Multi-Tier API")

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

if __name__ == "__main__":
    # Host 0.0.0.0 is required for Docker containers
    uvicorn.run(app, host="0.0.0.0", port=8000)
