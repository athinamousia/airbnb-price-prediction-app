"""
Prediction endpoint
"""

from fastapi import APIRouter, HTTPException, status
from app.schemas.request import PredictionRequest
from app.schemas.response import PredictionResponse, ErrorResponse
from app.services.prediction import prediction_service
from app.core.logging import logger

router = APIRouter()


@router.post("/predict", response_model=PredictionResponse)
async def predict_price(request: PredictionRequest):
    """
    Predict Airbnb listing price

    Takes listing features and returns predicted price along with listing info

    - **host_id**: ID of the host
    - **latitude**: Latitude coordinate
    - **longitude**: Longitude coordinate
    - **neighbourhood_cleansed**: Neighbourhood name
    - **room_type**: Type of room (Entire home/apt, Private room, Shared room)
    - **minimum_nights**: Minimum nights required
    - **accommodates**: Number of people accommodated
    - **amenities**: List of available amenities
    """
    try:
        logger.info(f"Prediction request for host_id: {request.host_id}")
        result = prediction_service.predict(request)
        return result

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except FileNotFoundError as e:
        logger.error(f"Model not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not available",
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during prediction",
        )


@router.get("/predict/test")
async def test_prediction():
    """
    Test endpoint with sample data
    """
    test_request = PredictionRequest(
        host_id=12345,
        latitude=37.9838,
        longitude=23.7275,
        neighbourhood_cleansed="Κολωνάκι",
        room_type="Entire home/apt",
        minimum_nights=2,
        accommodates=4,
        amenities=["Wifi", "Kitchen", "Air conditioning"],
        property_type="Apartment",
        bathrooms=1.5,
        bedrooms=2,
        beds=2,
    )

    return await predict_price(test_request)
