"""
AuthService – Phase C.1.
JWT (Bearer) + hash mật khẩu (bcrypt).
"""
import os
import datetime
from typing import Optional

from jose import jwt, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ..database_config import get_db
from ..entities import models


bearer_scheme = HTTPBearer(auto_error=False)

# JWT admin: payload có `typ == "admin"` để không dùng chung token khách (`sub` + không có `typ`).
ADMIN_JWT_TYP = "admin"


def hash_password(password: str) -> str:
    import bcrypt
    pw = (password or "").encode("utf-8")
    if len(pw) > 72:
        pw = pw[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw, salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    import bcrypt
    try:
        pw = (password or "").encode("utf-8")
        if len(pw) > 72:
            pw = pw[:72]
        ph = (password_hash or "").encode("utf-8")
        return bool(bcrypt.checkpw(pw, ph))
    except Exception:
        return False


def _get_jwt_secret() -> str:
    # IMPORTANT: override in production
    return os.getenv("JWT_SECRET", "dev-secret-change-me")


def _get_jwt_exp_minutes() -> int:
    try:
        return int(os.getenv("JWT_EXPIRES_MINUTES", "43200"))  # 30 days default
    except Exception:
        return 43200


def _get_jwt_admin_secret() -> str:
    """Ký/verify token admin. Nếu không set `JWT_ADMIN_SECRET` thì dùng chung `JWT_SECRET`."""
    explicit = (os.getenv("JWT_ADMIN_SECRET") or "").strip()
    return explicit if explicit else _get_jwt_secret()


def _get_jwt_admin_exp_minutes() -> int:
    try:
        return int(os.getenv("JWT_ADMIN_EXPIRES_MINUTES", "10080"))  # 7 days default
    except Exception:
        return 10080


def create_access_token(customer_id: int) -> str:
    now = datetime.datetime.utcnow()
    exp = now + datetime.timedelta(minutes=_get_jwt_exp_minutes())
    payload = {"sub": str(customer_id), "iat": int(now.timestamp()), "exp": int(exp.timestamp())}
    return jwt.encode(payload, _get_jwt_secret(), algorithm="HS256")


def create_admin_access_token(admin_user_id: int) -> str:
    now = datetime.datetime.utcnow()
    exp = now + datetime.timedelta(minutes=_get_jwt_admin_exp_minutes())
    payload = {
        "sub": str(admin_user_id),
        "typ": ADMIN_JWT_TYP,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, _get_jwt_admin_secret(), algorithm="HS256")


def _unauthorized(detail: str = "Unauthorized"):
    raise HTTPException(status_code=401, detail=detail)


def get_current_customer_optional(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    if not creds or not creds.credentials:
        return None
    token = creds.credentials
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=["HS256"])
        if payload.get("typ") == ADMIN_JWT_TYP:
            return None
        sub = payload.get("sub")
        if not sub:
            return None
        cid = int(sub)
    except (JWTError, ValueError):
        return None
    return db.query(models.Customer).filter(models.Customer.id == cid).first()


def get_current_customer(
    customer=Depends(get_current_customer_optional),
):
    if not customer:
        _unauthorized("Vui lòng đăng nhập")
    return customer


def get_current_admin_optional(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    if not creds or not creds.credentials:
        return None
    try:
        payload = jwt.decode(creds.credentials, _get_jwt_admin_secret(), algorithms=["HS256"])
    except JWTError:
        return None
    if payload.get("typ") != ADMIN_JWT_TYP:
        return None
    sub = payload.get("sub")
    if not sub:
        return None
    try:
        aid = int(sub)
    except ValueError:
        return None
    user = db.query(models.AdminUser).filter(models.AdminUser.id == aid).first()
    if not user or not user.is_active:
        return None
    return user


def get_current_admin(
    admin=Depends(get_current_admin_optional),
):
    if not admin:
        _unauthorized("Phiên đăng nhập admin không hợp lệ hoặc đã hết hạn")
    return admin

