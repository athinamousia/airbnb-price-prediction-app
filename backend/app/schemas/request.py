"""
Pydantic models for API requests
"""

from typing import List, Optional
from pydantic import BaseModel, Field, validator


class PredictionRequest(BaseModel):
    """Request model for price prediction"""

    host_id: int = Field(..., description="Host ID")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude")
    neighbourhood_cleansed: str = Field(..., description="Neighbourhood name")
    room_type: str = Field(..., description="Room type")
    minimum_nights: int = Field(..., ge=1, description="Minimum nights")
    accommodates: int = Field(..., ge=1, description="Number of people accommodated")
    amenities: Optional[List[str]] = Field(default=[], description="List of amenities")
    property_type: Optional[str] = Field(
        default="Apartment", description="Property type"
    )
    bathrooms: Optional[float] = Field(
        default=1.0, ge=0, description="Number of bathrooms"
    )
    bedrooms: Optional[int] = Field(default=1, ge=0, description="Number of bedrooms")
    beds: Optional[int] = Field(default=1, ge=0, description="Number of beds")

    @validator("amenities", pre=True)
    def parse_amenities(cls, v):
        """Parse amenities if string"""
        if isinstance(v, str):
            # Remove brackets and quotes, split by comma
            v = v.strip("[]").replace('"', "").replace("'", "")
            return [x.strip() for x in v.split(",") if x.strip()]
        return v or []

    class Config:
        schema_extra = {
            "example": {
                "host_id": 12345,
                "latitude": 40.7128,
                "longitude": -74.0060,
                "neighbourhood_cleansed": "Manhattan",
                "room_type": "Entire home/apt",
                "minimum_nights": 2,
                "accommodates": 4,
                "amenities": ["Wifi", "Kitchen", "Air conditioning"],
                "property_type": "Apartment",
                "bathrooms": 1.5,
                "bedrooms": 2,
                "beds": 2,
            }
        }
