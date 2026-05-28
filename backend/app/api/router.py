"""
Analytics and plots endpoint
"""

from typing import Any, Dict

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from backend.app.core.logging import logger
from backend.app.api.analytics import analytics_service


class PredictionRequest(BaseModel):
    inputs: Dict[str, Any]


router = APIRouter()


@router.get("/kpis")
async def get_kpis():
    try:
        return analytics_service.get_kpis()
    except Exception as e:
        logger.error(f"Error retrieving KPIs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving KPI metrics",
        )


@router.get("/price-analysis")
async def get_price_analysis(neighbourhood: str = "all"):
    try:
        return analytics_service.get_price_analysis(neighbourhood)
    except Exception as e:
        logger.error(f"Error retrieving price analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving price analysis",
        )


@router.get("/geo-distribution")
def get_geo_distribution():
    try:
        return analytics_service.get_geo_distribution()
    except Exception as e:
        logger.error(f"Error retrieving geo distribution: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving geo distribution",
        )


@router.get("/geo-distribution/grouped")
def get_geo_distribution_grouped():
    try:
        return analytics_service.get_geo_distribution_grouped()
    except Exception as e:
        logger.error(f"Error retrieving grouped geo distribution: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving grouped geo distribution",
        )


@router.get("/property-type-distribution")
def get_property_type_distribution(neighbourhood: str = "all", room_type: str = "all"):
    try:
        return analytics_service.get_property_type_distribution(
            neighbourhood, room_type
        )
    except Exception as e:
        logger.error(f"Error retrieving property type distribution: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving property type distribution",
        )


@router.get("/host-insights")
def get_host_insights(neighbourhood: str = "all", room_type: str = "all"):
    try:
        return analytics_service.get_host_insights(neighbourhood, room_type)
    except Exception as e:
        logger.error(f"Error retrieving host insights: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving host insights",
        )


@router.get("/prediction-options")
def get_prediction_options():
    try:
        return analytics_service.get_prediction_options()
    except Exception as e:
        logger.error(f"Error retrieving prediction options: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving prediction options",
        )


@router.post("/predict")
async def predict_price(request: PredictionRequest):
    try:
        return analytics_service.predict_price(request.inputs)
    except FileNotFoundError as e:
        logger.warning(f"Model artifact missing: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model artifact not found. Please train the model first.",
        )
    except Exception as e:
        logger.error(f"Error during price prediction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error computing price prediction",
        )
