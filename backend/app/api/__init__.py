"""API module initialization"""

from backend.app.api import health, analytics
from backend.app.api import router

__all__ = ["health", "analytics", "router"]
