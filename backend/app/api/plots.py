"""
Analytics and plots endpoint
"""

from fastapi import APIRouter, HTTPException, status
from app.schemas.response import StatsResponse
from app.services.analytics import analytics_service
from app.core.logging import logger

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_stats():
    """
    Get comprehensive dashboard statistics

    Returns all metrics needed for the dashboard:
    - KPIs (total listings, avg price, occupancy, ratings)
    - Price distribution
    - Property and room type distributions
    - Neighbourhood statistics
    - Review metrics
    - Availability data
    """
    try:
        stats = analytics_service.get_dashboard_stats()
        return stats

    except Exception as e:
        logger.error(f"Error retrieving dashboard stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving dashboard statistics",
        )


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    """
    Get statistical data and analytics

    Returns aggregated statistics about listings, prices, neighbourhoods, etc.
    """
    try:
        stats = analytics_service.get_stats()
        return StatsResponse(data=stats)

    except Exception as e:
        logger.error(f"Error retrieving stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving statistics",
        )


@router.get("/stats/neighbourhood/{neighbourhood}")
async def get_neighbourhood_stats(neighbourhood: str):
    """
    Get statistics for a specific neighbourhood

    - **neighbourhood**: Name of the neighbourhood
    """
    try:
        stats = analytics_service.get_neighbourhood_stats(neighbourhood)

        if not stats:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No statistics found for neighbourhood: {neighbourhood}",
            )

        return {"neighbourhood": neighbourhood, "stats": stats}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving neighbourhood stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving neighbourhood statistics",
        )


@router.get("/stats/price-distribution")
async def get_price_distribution():
    """
    Get price distribution data for visualization
    """
    try:
        distribution = analytics_service.get_price_distribution()
        return {"price_distribution": distribution}

    except Exception as e:
        logger.error(f"Error retrieving price distribution: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving price distribution",
        )
