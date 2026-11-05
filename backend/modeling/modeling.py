"""
Model training utilities for the Airbnb price prediction pipeline.

This module:
- loads raw data
- applies preprocessing
- tunes multiple model families with Optuna
- evaluates individual and stacked candidates
- saves the best trained bundle for inference
"""

from __future__ import annotations

import json
import pickle
from copy import deepcopy
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import optuna
import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import (
    ExtraTreesRegressor,
    GradientBoostingRegressor,
    HistGradientBoostingRegressor,
    RandomForestRegressor,
    StackingRegressor,
)
from sklearn.linear_model import ElasticNet, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.utils.validation import check_is_fitted
from xgboost import XGBRegressor

from backend.modeling.preprocessing import DataPreprocessor, DataPreprocessorConfig


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ARTIFACT_DIR = PROJECT_ROOT / "output" / "models"
DEFAULT_DATA_PATHS = [
    PROJECT_ROOT / "data" / "cleaned_listings.csv",
    PROJECT_ROOT / "data" / "listings.csv",
]


def _to_numpy(y: pd.Series | np.ndarray) -> np.ndarray:
    if isinstance(y, pd.Series):
        return y.to_numpy(dtype=float)
    return np.asarray(y, dtype=float)


def _rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(mean_squared_error(y_true, y_pred, squared=False))


def _regression_metrics(
    y_true_log: np.ndarray, y_pred_log: np.ndarray
) -> Dict[str, float]:
    y_true_log = _to_numpy(y_true_log)
    y_pred_log = _to_numpy(y_pred_log)
    y_true = np.expm1(y_true_log)
    y_pred = np.expm1(y_pred_log)

    return {
        "rmse_log": _rmse(y_true_log, y_pred_log),
        "mae_log": float(mean_absolute_error(y_true_log, y_pred_log)),
        "r2_log": float(r2_score(y_true_log, y_pred_log)),
        "rmse_price": _rmse(y_true, y_pred),
        "mae_price": float(mean_absolute_error(y_true, y_pred)),
        "r2_price": float(r2_score(y_true, y_pred)),
    }


def _public_metrics(metrics: Dict[str, float]) -> Dict[str, float]:
    """Drop the log-scale metrics (used only internally for model selection)."""
    return {k: v for k, v in metrics.items() if not k.endswith("_log")}


def _make_stratify_bins(y: pd.Series | np.ndarray, n_bins: int = 10):
    y_num = pd.Series(_to_numpy(y))
    if y_num.nunique(dropna=True) < 2:
        return None

    effective_bins = min(n_bins, int(y_num.nunique(dropna=True)))
    if effective_bins < 2:
        return None

    try:
        bins = pd.qcut(
            y_num.rank(method="first"),
            q=effective_bins,
            labels=False,
            duplicates="drop",
        )
    except ValueError:
        return None

    if pd.Series(bins).nunique(dropna=True) < 2:
        return None
    return bins


def _resolve_data_path(data_path: Optional[str | Path]) -> Path:
    if data_path is not None:
        candidate = Path(data_path)
        if candidate.exists():
            return candidate
        raise FileNotFoundError(f"Data file not found: {candidate}")

    for candidate in DEFAULT_DATA_PATHS:
        if candidate.exists():
            return candidate

    raise FileNotFoundError(
        "Could not find a dataset. Checked cleaned_listings.csv and listings.csv."
    )


def load_raw_data(data_path: Optional[str | Path] = None) -> pd.DataFrame:
    path = _resolve_data_path(data_path)
    return pd.read_csv(path)


@dataclass
class TrainingConfig:
    data_path: Optional[str] = None
    target_col: str = "price"
    test_size: float = 0.2
    random_state: int = 42
    validation_size: float = 0.2
    n_trials: int = 20
    timeout_seconds: Optional[int] = None
    n_splits_stack: int = 5
    artifact_dir: str = str(ARTIFACT_DIR)
    model_name: str = "price_model"
    preprocessed_dir: Optional[str] = None


@dataclass
class TrainingResult:
    model_name: str
    validation_metrics: Dict[str, float]
    test_metrics: Dict[str, float]
    best_params: Dict[str, Any]


@dataclass
class PredictionBundle:
    preprocessor: DataPreprocessor
    model: Any
    model_name: str
    metrics: Dict[str, Any]
    target_col: str = "price"

    def predict_log(self, raw_df: pd.DataFrame) -> np.ndarray:
        check_is_fitted(self.preprocessor, attributes=["feature_names_"])
        features = self.preprocessor.transform(raw_df)
        return _to_numpy(self.model.predict(features))

    def predict(self, raw_df: pd.DataFrame) -> np.ndarray:
        return np.expm1(self.predict_log(raw_df))


def _suggest_ridge(trial: optuna.Trial) -> Ridge:
    return Ridge(
        alpha=trial.suggest_float("alpha", 1e-4, 200.0, log=True),
        random_state=None,
    )


def _suggest_elasticnet(trial: optuna.Trial) -> ElasticNet:
    return ElasticNet(
        alpha=trial.suggest_float("alpha", 1e-4, 2.0, log=True),
        l1_ratio=trial.suggest_float("l1_ratio", 0.05, 0.95),
        max_iter=10_000,
        random_state=None,
    )


def _suggest_random_forest(trial: optuna.Trial) -> RandomForestRegressor:
    return RandomForestRegressor(
        n_estimators=trial.suggest_int("n_estimators", 200, 900),
        max_depth=trial.suggest_int("max_depth", 4, 30),
        min_samples_split=trial.suggest_int("min_samples_split", 2, 20),
        min_samples_leaf=trial.suggest_int("min_samples_leaf", 1, 10),
        max_features=trial.suggest_categorical("max_features", ["sqrt", "log2", None]),
        bootstrap=trial.suggest_categorical("bootstrap", [True, False]),
        random_state=42,
        n_jobs=-1,
    )


def _suggest_extra_trees(trial: optuna.Trial) -> ExtraTreesRegressor:
    return ExtraTreesRegressor(
        n_estimators=trial.suggest_int("n_estimators", 300, 1200),
        max_depth=trial.suggest_int("max_depth", 4, 40),
        min_samples_split=trial.suggest_int("min_samples_split", 2, 20),
        min_samples_leaf=trial.suggest_int("min_samples_leaf", 1, 8),
        max_features=trial.suggest_categorical("max_features", ["sqrt", "log2", None]),
        bootstrap=trial.suggest_categorical("bootstrap", [True, False]),
        random_state=42,
        n_jobs=-1,
    )


def _suggest_gradient_boosting(trial: optuna.Trial) -> GradientBoostingRegressor:
    return GradientBoostingRegressor(
        n_estimators=trial.suggest_int("n_estimators", 100, 700),
        learning_rate=trial.suggest_float("learning_rate", 0.01, 0.2, log=True),
        max_depth=trial.suggest_int("max_depth", 2, 6),
        min_samples_split=trial.suggest_int("min_samples_split", 2, 20),
        min_samples_leaf=trial.suggest_int("min_samples_leaf", 1, 10),
        subsample=trial.suggest_float("subsample", 0.6, 1.0),
        random_state=42,
    )


def _suggest_hist_gb(trial: optuna.Trial) -> HistGradientBoostingRegressor:
    return HistGradientBoostingRegressor(
        learning_rate=trial.suggest_float("learning_rate", 0.01, 0.2, log=True),
        max_iter=trial.suggest_int("max_iter", 200, 1000),
        max_depth=trial.suggest_int("max_depth", 3, 12),
        min_samples_leaf=trial.suggest_int("min_samples_leaf", 10, 60),
        l2_regularization=trial.suggest_float(
            "l2_regularization", 1e-6, 10.0, log=True
        ),
        max_bins=trial.suggest_int("max_bins", 64, 255),
        early_stopping=True,
        validation_fraction=0.15,
        n_iter_no_change=30,
        random_state=42,
    )


def _suggest_xgb(trial: optuna.Trial) -> XGBRegressor:
    return XGBRegressor(
        n_estimators=trial.suggest_int("n_estimators", 500, 4000),
        learning_rate=trial.suggest_float("learning_rate", 0.01, 0.15, log=True),
        max_depth=trial.suggest_int("max_depth", 3, 10),
        min_child_weight=trial.suggest_float("min_child_weight", 1.0, 15.0, log=True),
        subsample=trial.suggest_float("subsample", 0.6, 1.0),
        colsample_bytree=trial.suggest_float("colsample_bytree", 0.6, 1.0),
        reg_alpha=trial.suggest_float("reg_alpha", 1e-8, 5.0, log=True),
        reg_lambda=trial.suggest_float("reg_lambda", 1e-6, 20.0, log=True),
        gamma=trial.suggest_float("gamma", 0.0, 8.0),
        tree_method="hist",
        objective="reg:squarederror",
        eval_metric="rmse",
        random_state=42,
        n_jobs=-1,
    )


MODEL_BUILDERS = {
    "ridge": _suggest_ridge,
    "elasticnet": _suggest_elasticnet,
    "random_forest": _suggest_random_forest,
    "extra_trees": _suggest_extra_trees,
    "gradient_boosting": _suggest_gradient_boosting,
    "hist_gradient_boosting": _suggest_hist_gb,
    "xgboost": _suggest_xgb,
}


MODEL_TYPES = [
    "ridge",
    "elasticnet",
    "random_forest",
    "extra_trees",
    "gradient_boosting",
    "hist_gradient_boosting",
    "xgboost",
]


def _fit_candidate(
    model_name: str,
    model: Any,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_valid: pd.DataFrame,
    y_valid: pd.Series,
) -> Tuple[Any, Dict[str, float]]:
    if model_name == "xgboost":
        fitted = deepcopy(model)
        fitted.fit(
            X_train,
            y_train,
            eval_set=[(X_valid, y_valid)],
            verbose=False,
            early_stopping_rounds=50,
        )
    else:
        fitted = deepcopy(model)
        fitted.fit(X_train, y_train)

    val_pred = fitted.predict(X_valid)
    metrics = _regression_metrics(y_valid, val_pred)
    return fitted, metrics


def _refit_model_on_full_train(
    model_name: str,
    model: Any,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    random_state: int,
) -> Any:
    final_model = clone(model)

    if model_name in {"xgboost", "hist_gradient_boosting"} and len(X_train) > 10:
        stratify_bins = _make_stratify_bins(y_train)
        X_fit, X_es, y_fit, y_es = train_test_split(
            X_train,
            y_train,
            test_size=0.15,
            random_state=random_state,
            shuffle=True,
            stratify=stratify_bins,
        )

        if model_name == "xgboost":
            final_model.fit(
                X_fit,
                y_fit,
                eval_set=[(X_es, y_es)],
                verbose=False,
                early_stopping_rounds=50,
            )
        else:
            final_model.fit(X_train, y_train)
        return final_model

    final_model.fit(X_train, y_train)
    return final_model


def _optuna_tune_model(
    model_name: str,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_valid: pd.DataFrame,
    y_valid: pd.Series,
    n_trials: int,
    timeout_seconds: Optional[int],
    random_state: int,
) -> Tuple[Any, Dict[str, float], Dict[str, Any]]:
    builder = MODEL_BUILDERS[model_name]

    def objective(trial: optuna.Trial) -> float:
        candidate = builder(trial)
        if model_name == "xgboost":
            candidate.fit(
                X_train,
                y_train,
                eval_set=[(X_valid, y_valid)],
                verbose=False,
                early_stopping_rounds=50,
            )
        else:
            candidate.fit(X_train, y_train)

        pred = candidate.predict(X_valid)
        return _rmse(_to_numpy(y_valid), _to_numpy(pred))

    study = optuna.create_study(
        direction="minimize", sampler=optuna.samplers.TPESampler(seed=random_state)
    )
    study.optimize(
        objective, n_trials=n_trials, timeout=timeout_seconds, show_progress_bar=False
    )

    best_model = builder(study.best_trial)
    fitted_model, metrics = _fit_candidate(
        model_name, best_model, X_train, y_train, X_valid, y_valid
    )
    return fitted_model, metrics, dict(study.best_trial.params)


def _fit_stacking_model(
    tuned_models: Dict[str, Any],
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_valid: pd.DataFrame,
    y_valid: pd.Series,
) -> Tuple[Any, Dict[str, float], Dict[str, Any]]:
    base_candidates = []
    preferred_order = [
        "xgboost",
        "extra_trees",
        "ridge",
    ]
    for name in preferred_order:
        if name in tuned_models:
            base_candidates.append((name, clone(tuned_models[name])))

    if len(base_candidates) < 2:
        return None, {}, {}

    final_estimator = Ridge(alpha=1.0)
    stacker = StackingRegressor(
        estimators=base_candidates,
        final_estimator=final_estimator,
        passthrough=False,
        cv=5,
        n_jobs=-1,
    )
    stacker.fit(X_train, y_train)
    metrics = _regression_metrics(y_valid, stacker.predict(X_valid))
    return (
        stacker,
        metrics,
        {"base_estimators": [name for name, _ in base_candidates], "final_alpha": 1.0},
    )


def _save_artifacts(
    bundle: PredictionBundle, output_dir: str | Path, model_name: str
) -> Dict[str, str]:
    artifact_dir = Path(output_dir)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    pkl_path = artifact_dir / f"{model_name}.pkl"
    joblib_path = artifact_dir / f"{model_name}.joblib"
    evaluation_path = artifact_dir / "models_evaluation.json"
    parameters_path = artifact_dir / "models_parameters.json"

    with open(pkl_path, "wb") as f:
        pickle.dump(bundle, f)

    joblib.dump(bundle, joblib_path)

    metrics = bundle.metrics
    evaluation_keys = {"best_params", "config"}
    evaluation = {k: v for k, v in metrics.items() if k not in evaluation_keys}
    parameters = {
        "best_model": metrics["best_model"],
        "best_params": metrics["best_params"],
        "config": metrics["config"],
    }

    with open(evaluation_path, "w", encoding="utf-8") as f:
        json.dump(evaluation, f, indent=2, default=str)
    with open(parameters_path, "w", encoding="utf-8") as f:
        json.dump(parameters, f, indent=2, default=str)

    return {
        "pickle": str(pkl_path),
        "joblib": str(joblib_path),
        "evaluation": str(evaluation_path),
        "parameters": str(parameters_path),
    }


def train_and_select_best_model(
    config: Optional[TrainingConfig] = None,
) -> Dict[str, Any]:
    if config is None:
        config = TrainingConfig()

    if config.preprocessed_dir:
        # Use the output of the preprocessing step instead of re-running it.
        pre_dir = Path(config.preprocessed_dir)
        preprocessor = joblib.load(pre_dir / "preprocessor.joblib")
        X_train_p = pd.read_csv(pre_dir / "X_train.csv", index_col=0)
        X_test_p = pd.read_csv(pre_dir / "X_test.csv", index_col=0)
        y_train = pd.read_csv(pre_dir / "y_train.csv", index_col=0).iloc[:, 0]
        y_test = pd.read_csv(pre_dir / "y_test.csv", index_col=0).iloc[:, 0]
    else:
        raw_df = load_raw_data(config.data_path)
        preprocessor = DataPreprocessor(
            DataPreprocessorConfig(
                test_size=config.test_size,
                random_state=config.random_state,
            )
        )

        X_train_p, X_test_p, y_train, y_test = preprocessor.fit_transform_split(
            raw_df, target_col=config.target_col
        )

    inner_stratify_bins = _make_stratify_bins(y_train)
    X_inner_train, X_inner_valid, y_inner_train, y_inner_valid = train_test_split(
        X_train_p,
        y_train,
        test_size=config.validation_size,
        random_state=config.random_state,
        shuffle=True,
        stratify=inner_stratify_bins,
    )

    tuned_models: Dict[str, Any] = {}
    tuning_results: List[TrainingResult] = []

    for model_name in MODEL_TYPES:
        model, val_metrics, best_params = _optuna_tune_model(
            model_name=model_name,
            X_train=X_inner_train,
            y_train=y_inner_train,
            X_valid=X_inner_valid,
            y_valid=y_inner_valid,
            n_trials=config.n_trials,
            timeout_seconds=config.timeout_seconds,
            random_state=config.random_state,
        )
        tuned_models[model_name] = model
        tuning_results.append(
            TrainingResult(
                model_name=model_name,
                validation_metrics=val_metrics,
                test_metrics={},
                best_params=best_params,
            )
        )

    stacker, stack_val_metrics, stack_params = _fit_stacking_model(
        tuned_models, X_inner_train, y_inner_train, X_inner_valid, y_inner_valid
    )
    if stacker is not None:
        tuned_models["stacking"] = stacker
        tuning_results.append(
            TrainingResult(
                model_name="stacking",
                validation_metrics=stack_val_metrics,
                test_metrics={},
                best_params=stack_params,
            )
        )

    final_results: List[TrainingResult] = []
    refit_models: Dict[str, Any] = {}

    for result in tuning_results:
        refit_model = _refit_model_on_full_train(
            result.model_name,
            tuned_models[result.model_name],
            X_train_p,
            y_train,
            config.random_state,
        )
        refit_models[result.model_name] = refit_model

        test_metrics = _regression_metrics(y_test, refit_model.predict(X_test_p))
        result.test_metrics = test_metrics
        final_results.append(result)

    best_result = min(
        final_results, key=lambda item: item.validation_metrics["rmse_log"]
    )
    best_name = best_result.model_name
    best_model = refit_models[best_name]
    best_metrics = _public_metrics(best_result.test_metrics)

    if best_model is None:
        raise RuntimeError("No model was trained successfully.")

    # Final model: same hyperparameters, refit on ALL data (train + test).
    # The reported test metrics come from the train-only fit above.
    X_all = pd.concat([X_train_p, X_test_p])
    y_all = pd.concat([y_train, y_test])
    best_model = _refit_model_on_full_train(
        best_name,
        tuned_models[best_name],
        X_all,
        y_all,
        config.random_state,
    )

    bundle = PredictionBundle(
        preprocessor=preprocessor,
        model=best_model,
        model_name=best_name,
        metrics={
            "best_model": best_name,
            "validation": {
                r.model_name: _public_metrics(r.validation_metrics)
                for r in final_results
            },
            "test": {
                r.model_name: _public_metrics(r.test_metrics) for r in final_results
            },
            "selected_validation_metrics": _public_metrics(
                best_result.validation_metrics
            ),
            "selected_test_metrics": best_metrics,
            "final_model_trained_on": "all data (train + test)",
            "best_params": {r.model_name: r.best_params for r in final_results},
            "config": asdict(config),
        },
        target_col=config.target_col,
    )

    artifacts = _save_artifacts(bundle, config.artifact_dir, config.model_name)

    return {
        "bundle": bundle,
        "artifacts": artifacts,
        "results": [
            {
                "model_name": r.model_name,
                "validation_metrics": _public_metrics(r.validation_metrics),
                "test_metrics": _public_metrics(r.test_metrics),
                "best_params": r.best_params,
            }
            for r in final_results
        ],
        "best_model": best_name,
        "best_test_metrics": best_metrics,
    }


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description="Train and select the best Airbnb price model"
    )
    parser.add_argument(
        "--data-path", type=str, default=None, help="Path to the raw CSV file"
    )
    parser.add_argument(
        "--n-trials", type=int, default=20, help="Optuna trials per model family"
    )
    parser.add_argument(
        "--timeout-seconds", type=int, default=None, help="Optional Optuna timeout"
    )
    parser.add_argument(
        "--test-size", type=float, default=0.2, help="Holdout test size"
    )
    parser.add_argument(
        "--validation-size", type=float, default=0.2, help="Inner validation size"
    )
    parser.add_argument("--random-state", type=int, default=42, help="Random seed")
    parser.add_argument(
        "--artifact-dir",
        type=str,
        default=str(ARTIFACT_DIR),
        help="Where to save artifacts",
    )
    parser.add_argument(
        "--model-name", type=str, default="price_model", help="Artifact base name"
    )
    parser.add_argument(
        "--preprocessed-dir",
        type=str,
        default=None,
        help="Folder with the preprocessing output (skips preprocessing)",
    )
    args = parser.parse_args()

    config = TrainingConfig(
        data_path=args.data_path,
        test_size=args.test_size,
        validation_size=args.validation_size,
        random_state=args.random_state,
        n_trials=args.n_trials,
        timeout_seconds=args.timeout_seconds,
        artifact_dir=args.artifact_dir,
        model_name=args.model_name,
        preprocessed_dir=args.preprocessed_dir,
    )

    outcome = train_and_select_best_model(config)
    print(
        json.dumps(
            {
                "best_model": outcome["best_model"],
                "best_test_metrics": outcome["best_test_metrics"],
                "artifacts": outcome["artifacts"],
            },
            indent=2,
            default=str,
        )
    )


if __name__ == "__main__":
    main()
