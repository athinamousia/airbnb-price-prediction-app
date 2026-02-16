"""
Prediction service - handles model inference
"""

from app.models.model_loader import model_loader
from app.services.preprocessing import preprocessing_service
from app.schemas.request import PredictionRequest
from app.schemas.response import PredictionResponse
from app.core.logging import logger
from app.core.cache import cache
import hashlib
import json


class PredictionService:
    """Service for making predictions"""

    def __init__(self):
        # Load model on initialization
        try:
            model_loader.load_model()
        except Exception as e:
            logger.error(f"Failed to load model: {e}")

    def predict(self, request: PredictionRequest) -> PredictionResponse:
        """
        Make price prediction

        Args:
            request: Prediction request

        Returns:
            Prediction response with price
        """
        try:
            # Check cache
            cache_key = self._generate_cache_key(request)
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.info(f"Cache hit for request {cache_key[:8]}")
                return PredictionResponse(**cached_result)

            # Preprocess data
            processed_data = preprocessing_service.preprocess(request)
            logger.info(f"Preprocessed data shape: {processed_data.shape}")

            # Get model
            model = model_loader.load_model()

            # Make prediction
            price_prediction = model.predict(processed_data)[0]
            price = float(price_prediction)

            # Get number of reviews from processed data
            number_of_reviews = (
                int(processed_data["number_of_reviews"].iloc[0])
                if "number_of_reviews" in processed_data.columns
                else 0
            )

            # Create response
            response = PredictionResponse(
                price=round(price, 2),
                host_id=request.host_id,
                neighbourhood_cleansed=request.neighbourhood_cleansed,
                room_type=request.room_type,
                number_of_reviews=number_of_reviews,
            )

            # Cache result
            cache.set(cache_key, response.dict())

            logger.info(f"Predicted price: ${price:.2f}")
            return response

        except Exception as e:
            logger.error(f"Error making prediction: {e}")
            raise

    def _generate_cache_key(self, request: PredictionRequest) -> str:
        """Generate cache key from request"""
        # Create deterministic key from request
        key_data = request.dict()
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_string.encode()).hexdigest()


# Global prediction service instance
prediction_service = PredictionService()
