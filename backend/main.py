
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .api.user.router import router as user_router
from .api.admin.router import router as admin_router

app = FastAPI(title="Unbee Multi-Tier API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
