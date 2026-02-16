"""Services module initialization"""

from app.services.prediction import prediction_service
from app.services.preprocessing import preprocessing_service
from app.services.analytics import analytics_service

__all__ = ["prediction_service", "preprocessing_service", "analytics_service"]
