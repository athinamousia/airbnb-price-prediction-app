"""
Analytics service - handles statistics and aggregations
"""

import json
from pathlib import Path
from typing import Dict, Any
from app.core.config import settings
from app.core.logging import logger
from app.core.cache import cache


class AnalyticsService:
    """Service for analytics and statistics"""

    def __init__(self):
        self.stats_data = None
        self._load_stats()

    def _load_stats(self):
        """Load statistics data"""
        try:
            stats_path = Path(settings.STATS_PATH)
            if not stats_path.exists():
                # Fallback to old location
                stats_path = Path("api/repo/stats.json")

            if stats_path.exists():
                with open(stats_path, "r", encoding="utf8") as f:
                    self.stats_data = json.load(f)
                logger.info(f"Loaded stats from {stats_path}")
            else:
                logger.warning("Stats file not found")
                self.stats_data = {}

        except Exception as e:
            logger.error(f"Error loading stats: {e}")
            self.stats_data = {}
