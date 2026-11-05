"""SHAP analysis of the final (retrained) model on the whole processed dataset."""

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import shap

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PROCESSED_DIR = PROJECT_ROOT / "output" / "processed"
DEFAULT_ARTIFACT_DIR = PROJECT_ROOT / "output" / "models"
DEFAULT_SHAP_DIR = PROJECT_ROOT / "output" / "shap"


def _explain_single(model, X: pd.DataFrame, background: pd.DataFrame):
    """Return (shap_values, base_value) for one fitted estimator."""
    name = type(model).__name__
    if name in {"Ridge", "ElasticNet", "LinearRegression"}:
        explainer = shap.LinearExplainer(model, background)
        values = explainer.shap_values(X)
        return np.asarray(values), float(np.ravel(explainer.expected_value)[0])
    explainer = shap.TreeExplainer(model)
    values = explainer.shap_values(X)
    return np.asarray(values), float(np.ravel(explainer.expected_value)[0])


def compute_shap(model, X: pd.DataFrame, background_size: int = 200, seed: int = 42):
    """SHAP values on the log-price scale.

    A stacking model is a linear blend of its base estimators, so its SHAP
    values are the weighted sum of each base estimator's SHAP values.
    """
    background = X.sample(min(background_size, len(X)), random_state=seed)

    if hasattr(model, "estimators_") and hasattr(model, "final_estimator_"):
        weights = np.ravel(model.final_estimator_.coef_)
        values = np.zeros(X.shape, dtype=float)
        base = float(model.final_estimator_.intercept_)
        for weight, estimator in zip(weights, model.estimators_):
            est_values, est_base = _explain_single(estimator, X, background)
            values += weight * est_values
            base += weight * est_base
        return values, base

    return _explain_single(model, X, background)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run SHAP on the final model")
    parser.add_argument("--processed-dir", type=str, default=str(DEFAULT_PROCESSED_DIR))
    parser.add_argument("--artifact-dir", type=str, default=str(DEFAULT_ARTIFACT_DIR))
    parser.add_argument("--model-name", type=str, default="price_model")
    parser.add_argument("--output-dir", type=str, default=None)
    parser.add_argument("--background-size", type=int, default=200)
    parser.add_argument(
        "--max-rows",
        type=int,
        default=200,
        help="Random sample of rows to explain (exact tree SHAP is very slow on Extra Trees). 0 = all rows.",
    )
    args = parser.parse_args()

    processed_dir = Path(args.processed_dir)
    artifact_dir = Path(args.artifact_dir)
    out_dir = Path(args.output_dir) if args.output_dir else DEFAULT_SHAP_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    bundle = joblib.load(artifact_dir / f"{args.model_name}.joblib")
    X = pd.read_csv(processed_dir / "X_all.csv", index_col=0)
    X = X[bundle.preprocessor.feature_names_]
    if args.max_rows and len(X) > args.max_rows:
        X = X.sample(args.max_rows, random_state=42)

    values, base_value = compute_shap(bundle.model, X, args.background_size)

    # Check: base value + sum of SHAP values must equal the model prediction.
    pred = np.ravel(bundle.model.predict(X))
    max_gap = float(np.max(np.abs(base_value + values.sum(axis=1) - pred)))

    shap_df = pd.DataFrame(values, columns=X.columns, index=X.index)
    shap_df.to_csv(out_dir / "shap_values.csv")

    # Sign of the correlation between a feature's value and its SHAP value:
    # positive = higher values push the price up, negative = push it down.
    direction = [
        float(np.nan_to_num(np.corrcoef(X[col].to_numpy(dtype=float), shap_df[col])[0, 1]))
        if X[col].nunique() > 1
        else 0.0
        for col in X.columns
    ]

    importance = (
        pd.DataFrame(
            {
                "feature": X.columns,
                "mean_abs_shap": np.abs(values).mean(axis=0),
                "mean_shap": values.mean(axis=0),
                "value_shap_corr": direction,
            }
        )
        .sort_values("mean_abs_shap", ascending=False)
        .reset_index(drop=True)
    )
    importance.to_csv(out_dir / "shap_feature_importance.csv", index=False)

    summary = {
        "model": bundle.model_name,
        "n_rows": int(len(X)),
        "n_features": int(X.shape[1]),
        "base_value_log_price": base_value,
        "max_additivity_gap": max_gap,
        "top_features": importance.head(20).to_dict(orient="records"),
    }
    with open(out_dir / "shap_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        shap.summary_plot(values, X, show=False, max_display=20)
        plt.tight_layout()
        plt.savefig(out_dir / "shap_summary.png", dpi=150)
        plt.close()
    except Exception as error:  # plotting is optional
        print(f"Skipping summary plot: {error}")

    print(f"SHAP done for '{bundle.model_name}' on {len(X)} rows -> {out_dir}")
    print(importance.head(10).to_string(index=False))
    print(f"Max additivity gap: {max_gap:.2e}")


if __name__ == "__main__":
    main()
