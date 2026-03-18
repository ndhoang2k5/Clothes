import time
from dataclasses import dataclass
from threading import RLock
from typing import Any, Callable


@dataclass
class _Entry:
    value: Any
    expires_at: float


class TTLCache:
    """
    Simple in-memory TTL cache (process-local).
    - Best for read-heavy endpoints with short TTL.
    - No external deps, best-effort (clears expired entries lazily).
    """

    def __init__(self, *, default_ttl_seconds: float = 10.0, max_items: int = 2048):
        self._ttl = float(default_ttl_seconds)
        self._max = int(max_items)
        self._lock = RLock()
        self._data: dict[str, _Entry] = {}

    def _now(self) -> float:
        return time.monotonic()

    def get(self, key: str):
        now = self._now()
        with self._lock:
            ent = self._data.get(key)
            if not ent:
                return None
            if ent.expires_at <= now:
                self._data.pop(key, None)
                return None
            return ent.value

    def set(self, key: str, value: Any, ttl_seconds: float | None = None):
        ttl = self._ttl if ttl_seconds is None else float(ttl_seconds)
        now = self._now()
        with self._lock:
            # basic bound control
            if len(self._data) >= self._max:
                # drop ~10% oldest-ish by expiry
                items = sorted(self._data.items(), key=lambda kv: kv[1].expires_at)
                for k, _ in items[: max(1, self._max // 10)]:
                    self._data.pop(k, None)
            self._data[key] = _Entry(value=value, expires_at=now + max(0.0, ttl))

    def get_or_set(self, key: str, fn: Callable[[], Any], ttl_seconds: float | None = None):
        cached = self.get(key)
        if cached is not None:
            return cached
        value = fn()
        self.set(key, value, ttl_seconds=ttl_seconds)
        return value

