"""
Pydantic models for API responses
"""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class PredictionResponse(BaseModel):
    """Response model for price prediction"""

    price: float = Field(..., description="Predicted price in USD")
    host_id: int = Field(..., description="Host ID")
    neighbourhood_cleansed: str = Field(..., description="Neighbourhood")
    room_type: str = Field(..., description="Room type")
    number_of_reviews: Optional[int] = Field(None, description="Number of reviews")

    class Config:
        schema_extra = {
            "example": {
                "price": 125.50,
                "host_id": 12345,
                "neighbourhood_cleansed": "Manhattan",
                "room_type": "Entire home/apt",
                "number_of_reviews": 42,
            }
        }


class HealthResponse(BaseModel):
    """Response model for health check"""

    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    model_loaded: bool = Field(..., description="Whether model is loaded")


class ErrorResponse(BaseModel):
    """Response model for errors"""

    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")

    class Config:
        schema_extra = {
            "example": {
                "error": "Validation Error",
                "detail": "Invalid host_id provided",
            }
        }


class StatsResponse(BaseModel):
    """Response model for statistics"""

    data: Dict[str, Any] = Field(..., description="Statistics data")

    class Config:
        schema_extra = {
            "example": {
                "data": {
                    "total_listings": 10000,
                    "avg_price": 150.00,
                    "neighbourhoods": 50,
                }
            }
        }
