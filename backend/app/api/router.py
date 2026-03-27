"""
Analytics and plots endpoint
"""

from fastapi import APIRouter, HTTPException, status
from app.core.logging import logger
from app.api.analytics import analytics_service

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
