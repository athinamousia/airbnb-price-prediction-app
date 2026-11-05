"""
Model loader - loads and caches ML models
"""

import joblib
import json
from typing import Any, Dict
from pathlib import Path
from backend.app.core.config import settings
from backend.app.core.logging import logger


class ModelLoader:
    """Singleton model loader"""

    _instance = None
    _model = None
    _scaler = None
    _feature_schema = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
        return cls._instance

    def load_model(self) -> Any:
        """Load the trained model"""
        if self._model is None:
            try:
                model_path = Path(settings.MODEL_PATH)
                if model_path.exists():
                    self._model = joblib.load(model_path)
                    logger.info(f"Model loaded from {model_path}")
                else:
                    # Fallback to old location
                    old_path = Path("api/repo/pipeline.pkl")
                    if old_path.exists():
                        self._model = joblib.load(old_path)
                        logger.info(f"Model loaded from fallback path {old_path}")
                    else:
                        logger.error("Model file not found")
                        raise FileNotFoundError("Model file not found")
            except Exception as e:
                logger.error(f"Error loading model: {e}")
                raise
        return self._model

    def load_scaler(self) -> Any:
        """Load the feature scaler"""
        if self._scaler is None:
            try:
                scaler_path = Path(settings.SCALER_PATH)
                if scaler_path.exists():
                    self._scaler = joblib.load(scaler_path)
                    logger.info(f"Scaler loaded from {scaler_path}")
            except Exception as e:
                logger.warning(f"Could not load scaler: {e}")
                self._scaler = None
        return self._scaler

    def load_feature_schema(self) -> Dict:
        """Load feature schema"""
        if self._feature_schema is None:
            try:
                schema_path = Path(settings.FEATURE_SCHEMA_PATH)
                if schema_path.exists():
                    with open(schema_path, "r") as f:
                        self._feature_schema = json.load(f)
                    logger.info(f"Feature schema loaded from {schema_path}")
            except Exception as e:
                logger.warning(f"Could not load feature schema: {e}")
                self._feature_schema = {}
        return self._feature_schema

    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        return self._model is not None


# Global model loader instance
model_loader = ModelLoader()
