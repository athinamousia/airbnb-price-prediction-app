from fastapi import APIRouter
from app.core.config import settings
from app.models.model_loader import model_loader

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": settings.VERSION,
        "model_loaded": model_loader.is_loaded(),
    }
