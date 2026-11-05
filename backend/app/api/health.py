from fastapi import APIRouter
from backend.app.core.config import settings
from backend.modeling.model_loader import model_loader

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": settings.VERSION,
        "model_loaded": model_loader.is_loaded(),
    }
