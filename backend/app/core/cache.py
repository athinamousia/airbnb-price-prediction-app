from typing import Any, Optional
from datetime import datetime, timedelta
from app.core.config import settings


class SimpleCache:
    def __init__(self):
        self._cache = {}

    def get(self, key: str) -> Optional[Any]:
        if not settings.ENABLE_CACHE:
            return None
        item = self._cache.get(key)
        if item is None:
            return None
        if datetime.now() > item["expires"]:
            del self._cache[key]
            return None
        return item["value"]

    def set(self, key: str, value: Any, ttl: int = None):
        if not settings.ENABLE_CACHE:
            return
        if ttl is None:
            ttl = settings.CACHE_TTL
        self._cache[key] = {
            "value": value,
            "expires": datetime.now() + timedelta(seconds=ttl),
        }

    def clear(self):
        self._cache.clear()


cache = SimpleCache()
