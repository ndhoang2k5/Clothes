import time
from dataclasses import dataclass
from typing import Callable, Iterable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


@dataclass
class _Bucket:
    tokens: float
    updated_at: float


class SimpleRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Lightweight in-memory rate limit (per-IP, per-route-group) using token bucket.

    - No external dependencies.
    - Best-effort protection: prevents accidental overload / abusive bursts.
    - Does NOT change API shape; only returns 429 when exceeded.
    """

    def __init__(
        self,
        app,
        *,
        rules: Iterable[tuple[str, int, float]],
        # rules: (prefix, capacity, refill_per_second)
        cleanup_interval_seconds: float = 60.0,
        stale_after_seconds: float = 10 * 60.0,
    ):
        super().__init__(app)
        self._rules = list(rules)
        self._buckets: dict[str, _Bucket] = {}
        self._last_cleanup = time.monotonic()
        self._cleanup_interval = float(cleanup_interval_seconds)
        self._stale_after = float(stale_after_seconds)

    def _client_ip(self, request: Request) -> str:
        # In Docker/behind proxy, X-Forwarded-For may exist; take first IP.
        xff = request.headers.get("x-forwarded-for")
        if xff:
            ip = xff.split(",")[0].strip()
            if ip:
                return ip
        client = request.client
        return (client.host if client else "unknown") or "unknown"

    def _match_rule(self, path: str) -> tuple[int, float, str] | None:
        for prefix, capacity, refill in self._rules:
            if path.startswith(prefix):
                return int(capacity), float(refill), prefix
        return None

    def _cleanup_if_needed(self, now: float):
        if now - self._last_cleanup < self._cleanup_interval:
            return
        cutoff = now - self._stale_after
        self._buckets = {k: v for k, v in self._buckets.items() if v.updated_at >= cutoff}
        self._last_cleanup = now

    async def dispatch(self, request: Request, call_next: Callable[[Request], Response]) -> Response:
        # Only limit API calls (not static files)
        path = request.url.path or ""
        rule = self._match_rule(path)
        if not rule:
            return await call_next(request)

        capacity, refill_per_second, group = rule
        now = time.monotonic()
        self._cleanup_if_needed(now)

        ip = self._client_ip(request)
        key = f"{group}::{ip}"
        b = self._buckets.get(key)
        if b is None:
            b = _Bucket(tokens=float(capacity), updated_at=now)
            self._buckets[key] = b

        # Refill
        elapsed = max(0.0, now - b.updated_at)
        b.tokens = min(float(capacity), b.tokens + elapsed * refill_per_second)
        b.updated_at = now

        # Consume 1 token
        if b.tokens < 1.0:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Quá nhiều yêu cầu, vui lòng thử lại sau.",
                    "hint": "rate_limited",
                },
            )

        b.tokens -= 1.0
        return await call_next(request)

