
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

if __name__ == "__main__":
    # Host 0.0.0.0 is required for Docker containers
    uvicorn.run(app, host="0.0.0.0", port=8000)
