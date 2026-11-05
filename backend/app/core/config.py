from typing import List
from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    PROJECT_NAME: str = "Airbnb Price Prediction API"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api/v1"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    MODEL_PATH: str = str(PROJECT_ROOT / "output" / "models" / "price_model.joblib")
    SCALER_PATH: str = str(PROJECT_ROOT / "output" / "models" / "scaler.joblib")
    FEATURE_SCHEMA_PATH: str = str(
        PROJECT_ROOT / "output" / "models" / "feature_schema.json"
    )
    HOST_INFO_PATH: str = str(PROJECT_ROOT / "output" / "processed" / "host_info.csv")
    NEIGHBOURHOOD_GROUPS_PATH: str = str(
        PROJECT_ROOT / "output" / "processed" / "neighbourhood_groupings.json"
    )
    STATS_PATH: str = str(PROJECT_ROOT / "output" / "processed" / "stats.json")
    ENABLE_CACHE: bool = True
    CACHE_TTL: int = 3600
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
