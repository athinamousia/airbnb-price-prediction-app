"""
Model performance overview: model comparison and SHAP feature importance.
"""

import json
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[3]
MODELS_DIR = PROJECT_ROOT / "output" / "models"
SHAP_DIR = PROJECT_ROOT / "output" / "shap"

TOP_FEATURES = 15


def _read_json(path: Path) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_shap() -> Dict[str, Any]:
    importance_path = SHAP_DIR / "shap_feature_importance.csv"
    summary_path = SHAP_DIR / "shap_summary.json"
    if not importance_path.exists() or not summary_path.exists():
        return {"available": False, "features": []}

    summary = _read_json(summary_path)
    importance = pd.read_csv(importance_path).head(TOP_FEATURES)
    features: List[Dict[str, Any]] = importance.to_dict(orient="records")
    return {
        "available": True,
        "n_rows": summary.get("n_rows"),
        "base_value_log_price": summary.get("base_value_log_price"),
        "features": features,
    }


def get_model_performance() -> Dict[str, Any]:
    evaluation_path = MODELS_DIR / "models_evaluation.json"
    if not evaluation_path.exists():
        raise FileNotFoundError(f"Model evaluation not found at {evaluation_path}")

    evaluation = _read_json(evaluation_path)
    best_model = evaluation["best_model"]

    models = [
        {
            "name": name,
            "is_best": name == best_model,
            "validation": evaluation["validation"][name],
            "test": evaluation["test"][name],
        }
        for name in evaluation["test"]
    ]

    return {
        "best_model": best_model,
        "final_model_trained_on": evaluation.get("final_model_trained_on"),
        "models": models,
        "shap": _load_shap(),
    }
