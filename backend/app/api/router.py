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
