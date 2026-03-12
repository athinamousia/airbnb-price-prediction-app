"""API module initialization"""

from app.api import health, analytics
from app.api import router

__all__ = ["health", "analytics", "router"]
