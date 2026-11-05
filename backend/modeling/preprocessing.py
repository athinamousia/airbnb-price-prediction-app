import ast
import math
import re
from pathlib import Path
import numpy as np
import pandas as pd

from backend.constants import cols_to_drop, neighbourhood_en
from collections import Counter
from dataclasses import dataclass
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.model_selection import KFold, train_test_split
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_AREA_REVIEW_FEATURES_PATH = (
    PROJECT_ROOT / "data" / "neighbourhood_review_features.csv"
)


class IQROutlierCapper(BaseEstimator, TransformerMixin):
    """
    Fits IQR fences + median on train numeric columns and caps outliers on transform.
    """

    def __init__(self):
        self.stats_ = {}

    def fit(self, X, y=None):
        X = X.copy()
        self.stats_.clear()
        for col in X.columns:
            s = pd.to_numeric(X[col], errors="coerce")
            s_non_na = s.dropna()
            if s_non_na.empty:
                continue
            q1 = s_non_na.quantile(0.25)
            q3 = s_non_na.quantile(0.75)
            iqr = q3 - q1
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            med = s_non_na.median()
            self.stats_[col] = {"lower": lower, "upper": upper, "median": med}
        return self

    def transform(self, X):
        X = X.copy()
        for col, d in self.stats_.items():
            if col not in X.columns:
                continue
            s = pd.to_numeric(X[col], errors="coerce")
            mask = (s < d["lower"]) | (s > d["upper"])
            s.loc[mask] = d["median"]
            X[col] = s
        return X


@dataclass
class DataPreprocessorConfig:
    test_size: float = 0.2
    random_state: int = 42
    min_list_freq: float = 0.30
    host_verification_top_n: int = 8
    corr_threshold: float = 0.85
    missing_drop_threshold: float = 0.30
    rare_category_min_freq: float = 0.01
    rare_category_min_count: int = 20
    target_n_bins: int = 10
    target_outlier_quantile: float = 0.95
    area_review_features_path: str = str(DEFAULT_AREA_REVIEW_FEATURES_PATH)


class DataPreprocessor:
    def __init__(self, config: DataPreprocessorConfig = DataPreprocessorConfig()):
        self.cfg = config
        self.manual_drop_cols = cols_to_drop
        self.neighbourhood_en = neighbourhood_en

        # Learned during fit
        self.drop_100_missing_cols_ = []
        self.drop_high_missing_cols_ = []
        self.bool_cols_ = []
        self.list_target_encodings_ = {}
        self.rare_category_levels_ = {}
        self.amenity_cols_ = []
        self.corr_drop_cols_ = []
        self.numeric_cols_ = []
        self.categorical_cols_ = []
        self.target_outlier_bounds_ = None
        self.area_review_features_ = None

        self.outlier_capper_ = IQROutlierCapper()
        self.num_imputer_ = SimpleImputer(strategy="median")
        self.cat_imputer_ = SimpleImputer(strategy="most_frequent")
        self.ohe_ = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
        self.scaler_ = StandardScaler()

        self.feature_names_ = None

    @staticmethod
    def _replace_null_strings(df):
        return df.replace({"nan": np.nan, "": np.nan})

    @staticmethod
    def _parse_list_value(val):
        if pd.isna(val) or val == "":
            return []
        try:
            parsed = ast.literal_eval(val)
            if isinstance(parsed, list):
                return [str(v).strip().lower() for v in parsed]
        except Exception:
            pass
        val = str(val).strip("[]").replace('"', "").replace("'", "")
        return [v.strip().lower() for v in val.split(",") if v.strip()]

    @staticmethod
    def _parse_bathrooms_text(series):
        bath_count = []
        bath_shared = []
        for val in series:
            if pd.isna(val):
                bath_count.append(np.nan)
                bath_shared.append(np.nan)
                continue
            txt = str(val).strip().lower()
            is_shared = 1 if "shared" in txt else 0
            if "half" in txt:
                count = 0.5
            else:
                m = re.search(r"(\d+\.?\d*)", txt)
                count = float(m.group(1)) if m else np.nan
            bath_count.append(count)
            bath_shared.append(is_shared)
        return bath_count, bath_shared

    @staticmethod
    def _safe_ratio(numerator, denominator):
        num = pd.to_numeric(numerator, errors="coerce")
        den = pd.to_numeric(denominator, errors="coerce")
        return np.where((den > 0) & np.isfinite(den), num / den, np.nan)

    def _make_target_stratify_bins(self, y):
        y_num = pd.to_numeric(y, errors="coerce")
        if y_num.nunique(dropna=True) < 2:
            return None

        n_bins = min(self.cfg.target_n_bins, int(y_num.nunique(dropna=True)))
        if n_bins < 2:
            return None

        try:
            bins = pd.qcut(
                y_num.rank(method="first"), q=n_bins, labels=False, duplicates="drop"
            )
        except ValueError:
            return None

        if pd.Series(bins).nunique(dropna=True) < 2:
            return None
        return bins

    def _load_area_review_features(self):
        if self.area_review_features_ is not None:
            return self.area_review_features_

        path = Path(self.cfg.area_review_features_path)
        if not path.exists():
            self.area_review_features_ = pd.DataFrame()
            return self.area_review_features_

        area_features = pd.read_csv(path)
        required_cols = {"neighbourhood_cleansed"}
        if not required_cols.issubset(area_features.columns):
            self.area_review_features_ = pd.DataFrame()
            return self.area_review_features_

        self.area_review_features_ = area_features
        return self.area_review_features_

    def _merge_area_review_features(self, df):
        area_features = self._load_area_review_features()
        if area_features.empty or "neighbourhood_cleansed" not in df.columns:
            return df

        join_columns = [
            col
            for col in area_features.columns
            if col
            in {
                "neighbourhood_cleansed",
                "avg_sentiment_score",
                "review_volume_trend",
                "area_review_overview",
                "area_sentiment_grade_5",
                "area_review_count",
            }
        ]
        return df.merge(
            area_features[join_columns], on="neighbourhood_cleansed", how="left"
        )

    def _add_derived_features(self, df):
        df = df.copy()

        if {"accommodates", "bedrooms"}.issubset(df.columns):
            df["accommodates_per_bedroom"] = self._safe_ratio(
                df["accommodates"], df["bedrooms"]
            )
        if {"accommodates", "beds"}.issubset(df.columns):
            df["accommodates_per_bed"] = self._safe_ratio(
                df["accommodates"], df["beds"]
            )
        if {"beds", "bedrooms"}.issubset(df.columns):
            df["beds_per_bedroom"] = self._safe_ratio(df["beds"], df["bedrooms"])
        if {"bath_count", "accommodates"}.issubset(df.columns):
            df["bath_per_guest"] = self._safe_ratio(
                df["bath_count"], df["accommodates"]
            )
        if {"minimum_nights", "maximum_nights"}.issubset(df.columns):
            df["minimum_to_maximum_nights_ratio"] = self._safe_ratio(
                df["minimum_nights"], df["maximum_nights"]
            )

        return df

    def _base_clean(self, df, fit=False):
        df = df.copy()
        df = self._replace_null_strings(df)

        invalid_cols = [
            col
            for col in df.columns
            if not str(col).strip() or str(col).startswith("Unnamed")
        ]
        if invalid_cols:
            df = df.drop(columns=invalid_cols)

        # Newer listings exports ship the area name as `neighbourhood`.
        if "neighbourhood_cleansed" not in df.columns and "neighbourhood" in df.columns:
            df["neighbourhood_cleansed"] = df["neighbourhood"]

        # Drop manual columns
        drop_cols = [c for c in self.manual_drop_cols if c in df.columns]
        if drop_cols:
            df = df.drop(columns=drop_cols)

        # Translate neighbourhood names
        if "neighbourhood_cleansed" in df.columns:
            df["neighbourhood_cleansed"] = df["neighbourhood_cleansed"].map(
                lambda x: self.neighbourhood_en.get(x, x)
            )

        if "property_type" in df.columns:
            df["property_type"] = (
                df["property_type"]
                .astype(str)
                .str.strip()
                .str.lower()
                .replace({"nan": np.nan})
            )

        # Price cleaning (target)
        if "price" in df.columns:
            df["price"] = (
                df["price"].astype(str).str.replace("[$,]", "", regex=True).str.strip()
            )
            df["price"] = pd.to_numeric(df["price"], errors="coerce")
            df = df[df["price"] > 0].copy()

        # Rate columns
        for col in ["host_acceptance_rate", "host_response_rate"]:
            if col in df.columns:
                raw = df[col].astype(str).str.replace("%", "", regex=False).str.strip()
                as_num = pd.to_numeric(raw, errors="coerce")
                # Keep already-scaled values in [0, 1] and scale percentage-like values.
                df[col] = np.where(as_num > 1, as_num / 100.0, as_num)

        # bathrooms_text -> bath_count + bath_is_shared
        if "bathrooms_text" in df.columns:
            counts, shared = self._parse_bathrooms_text(df["bathrooms_text"])
            df["bath_count"] = counts
            df["bath_is_shared"] = shared
            df = df.drop(columns=["bathrooms_text"])

        df = self._merge_area_review_features(df)

        df = self._add_derived_features(df)

        return df

    def _fit_target_outlier_bounds(self, y):
        y_num = pd.to_numeric(y, errors="coerce").dropna()
        if y_num.empty:
            self.target_outlier_bounds_ = None
            return

        q1 = y_num.quantile(0.25)
        q3 = y_num.quantile(0.75)
        iqr = q3 - q1
        self.target_outlier_bounds_ = {
            "lower": q1 - 1.5 * iqr,
            "upper": q3 + 1.5 * iqr,
        }

    def _filter_train_target_outliers(self, X, y):
        if self.target_outlier_bounds_ is None:
            return X, y

        lower = self.target_outlier_bounds_["lower"]
        upper = self.target_outlier_bounds_["upper"]
        mask = y.between(lower, upper, inclusive="both")
        if mask.sum() == 0:
            return X, y
        return X.loc[mask].copy(), y.loc[mask].copy()

    def _build_list_encoding_stats(self, X, y, col, prefix):
        if col not in X.columns:
            return None

        y = pd.Series(y, index=X.index)
        parsed = X[col].apply(self._parse_list_value)
        min_count = max(1, int(math.ceil(self.cfg.min_list_freq * len(parsed))))

        token_listing_cnt = Counter()
        for tokens in parsed:
            token_listing_cnt.update(set(tokens))
        if col == "host_verifications":
            allowed_tokens = {
                tok
                for tok, _ in token_listing_cnt.most_common(
                    self.cfg.host_verification_top_n
                )
            }
        else:
            allowed_tokens = {
                tok for tok, cnt in token_listing_cnt.items() if cnt >= min_count
            }

        token_sum = {}
        token_cnt = {}
        for idx, tokens in parsed.items():
            target_val = y.loc[idx]
            if pd.isna(target_val):
                continue
            for tok in tokens:
                if not tok or tok not in allowed_tokens:
                    continue
                token_sum[tok] = token_sum.get(tok, 0.0) + float(target_val)
                token_cnt[tok] = token_cnt.get(tok, 0) + 1

        token_mean = {
            tok: token_sum[tok] / token_cnt[tok]
            for tok in token_cnt
            if token_cnt[tok] > 0
        }
        return {
            "prefix": prefix,
            "global_mean": float(y.mean()) if len(y) else 0.0,
            "token_mean": token_mean,
        }

    def _encode_list_column_with_stats(self, X, col, stats):
        if col not in X.columns or stats is None:
            return pd.Series(index=X.index, dtype=float)

        parsed = X[col].apply(self._parse_list_value)
        token_mean = stats["token_mean"]
        global_mean = stats["global_mean"]

        def _row_te(tokens):
            vals = [token_mean[t] for t in tokens if t in token_mean]
            return float(np.mean(vals)) if vals else global_mean

        return parsed.apply(_row_te)

    def _fit_amenity_dummies(self, X, top_n: int = 25):
        self.amenity_cols_ = []
        if "amenities" not in X.columns:
            return
        parsed = X["amenities"].apply(self._parse_list_value)
        token_count = Counter()
        for tokens in parsed:
            token_count.update(set(tokens))
        self.amenity_cols_ = [tok for tok, _ in token_count.most_common(top_n)]

    def _transform_amenity_dummies(self, X):
        X = X.copy()
        if "amenities" not in X.columns:
            return X
        parsed = X["amenities"].apply(self._parse_list_value)
        for amenity in self.amenity_cols_:
            safe_name = re.sub(r"[^\w]", "_", amenity).strip("_")
            X[f"amenity_{safe_name}"] = parsed.apply(
                lambda tokens, a=amenity: 1 if a in tokens else 0
            )
        X = X.drop(columns=["amenities"])
        return X

    def _oof_list_target_encodings(self, X, y, n_splits=5):
        oof = {}
        if len(X) < 2:
            return oof

        n_splits = min(n_splits, len(X))
        if n_splits < 2:
            return oof

        splitter = KFold(
            n_splits=n_splits, shuffle=True, random_state=self.cfg.random_state
        )

        for col, prefix in [
            ("host_verifications", "hostverif"),
        ]:
            if col not in X.columns:
                continue

            feature_name = f"{prefix}_te"
            encoded = pd.Series(index=X.index, dtype=float)

            for train_idx, val_idx in splitter.split(X):
                X_fold_train = X.iloc[train_idx]
                y_fold_train = y.iloc[train_idx]
                X_fold_val = X.iloc[val_idx]

                stats = self._build_list_encoding_stats(
                    X_fold_train, y_fold_train, col, prefix
                )
                fold_encoded = self._encode_list_column_with_stats(
                    X_fold_val, col, stats
                )
                encoded.iloc[val_idx] = fold_encoded.to_numpy()

            oof[feature_name] = encoded.fillna(
                float(pd.to_numeric(y, errors="coerce").mean())
            )

        return oof

    def _fit_list_encodings(self, X, y):
        self.list_target_encodings_.clear()

        for col, prefix in [
            ("host_verifications", "hostverif"),
        ]:
            stats = self._build_list_encoding_stats(X, y, col, prefix)
            if stats is not None:
                self.list_target_encodings_[col] = stats

    def _transform_list_encodings(self, X):
        X = X.copy()
        for col, info in self.list_target_encodings_.items():
            if col not in X.columns:
                continue

            X[f"{info['prefix']}_te"] = self._encode_list_column_with_stats(
                X, col, info
            )
            X = X.drop(columns=[col])
        return X

    def _fit_bool_cols(self, X):
        self.bool_cols_ = []
        for col in X.select_dtypes(include="object").columns:
            vals = X[col].dropna().astype(str).str.lower().str.strip().unique()
            if set(vals).issubset({"t", "f", "true", "false"}):
                self.bool_cols_.append(col)

    def _fit_rare_categories(self, X):
        self.rare_category_levels_ = {}
        for col in ["property_type"]:
            if col not in X.columns:
                continue

            non_na = X[col].dropna().astype(str).str.strip()
            if non_na.empty:
                continue

            min_count = max(
                self.cfg.rare_category_min_count,
                int(math.ceil(self.cfg.rare_category_min_freq * len(non_na))),
            )
            counts = non_na.value_counts()
            keep_levels = counts[counts >= min_count].index.tolist()
            self.rare_category_levels_[col] = set(keep_levels)

    def _transform_rare_categories(self, X):
        X = X.copy()
        for col, keep_levels in self.rare_category_levels_.items():
            if col not in X.columns:
                continue

            non_null = X[col].notna()
            X.loc[non_null, col] = X.loc[non_null, col].apply(
                lambda value: value if value in keep_levels else "other"
            )
        return X

    def _transform_bool_cols(self, X):
        X = X.copy()
        bool_map = {"t": 1, "f": 0, "true": 1, "false": 0}
        for col in self.bool_cols_:
            if col in X.columns:
                X[col] = X[col].astype(str).str.lower().str.strip().map(bool_map)
        return X

    def _fit_drop_columns(self, X):
        # 100% missing and >threshold missing from train only
        self.drop_100_missing_cols_ = [
            c for c in X.columns if X[c].isna().mean() >= 1.0
        ]
        self.drop_high_missing_cols_ = [
            c for c in X.columns if X[c].isna().mean() > self.cfg.missing_drop_threshold
        ]

    def _transform_drop_columns(self, X):
        X = X.copy()
        cols = sorted(set(self.drop_100_missing_cols_ + self.drop_high_missing_cols_))
        cols = [c for c in cols if c in X.columns]
        if cols:
            X = X.drop(columns=cols)
        return X

    def _fit_corr_drop(self, X):
        num = X.select_dtypes(include=["number"])
        if num.shape[1] == 0:
            self.corr_drop_cols_ = []
            return
        corr = num.corr()
        upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
        to_drop = [
            col
            for col in upper.columns
            if any(upper[col].abs() >= self.cfg.corr_threshold)
        ]
        self.corr_drop_cols_ = to_drop

    def _transform_corr_drop(self, X):
        X = X.copy()
        cols = [c for c in self.corr_drop_cols_ if c in X.columns]
        if cols:
            X = X.drop(columns=cols)
        return X

    def fit(self, X_train, y_train):
        X = self._base_clean(X_train, fit=True)

        # Learn drop columns from train
        self._fit_drop_columns(X)
        X = self._transform_drop_columns(X)

        # Group rare high-cardinality categories on train only.
        self._fit_rare_categories(X)
        X = self._transform_rare_categories(X)

        # Learn amenity binary columns from train, then transform
        self._fit_amenity_dummies(X)
        X = self._transform_amenity_dummies(X)

        # Learn and apply target encodings for list-like columns
        self._fit_list_encodings(X, y_train)
        X = self._transform_list_encodings(X)

        # Learn and apply bool mapping
        self._fit_bool_cols(X)
        X = self._transform_bool_cols(X)

        # Correlation-based drop from train
        self._fit_corr_drop(X)
        X = self._transform_corr_drop(X)

        # Split numeric/categorical
        self.numeric_cols_ = X.select_dtypes(include=["number"]).columns.tolist()
        self.categorical_cols_ = X.select_dtypes(exclude=["number"]).columns.tolist()

        # Outlier capper on numeric train only
        X_num = X[self.numeric_cols_].copy()
        self.outlier_capper_.fit(X_num)
        X_num = self.outlier_capper_.transform(X_num)

        # Imputers on train only
        self.num_imputer_.fit(X_num)
        X_num_imp = pd.DataFrame(
            self.num_imputer_.transform(X_num),
            columns=self.numeric_cols_,
            index=X_num.index,
        )
        self.scaler_.fit(X_num_imp)

        if self.categorical_cols_:
            self.cat_imputer_.fit(X[self.categorical_cols_])

        # OneHotEncoder on train only
        if self.categorical_cols_:
            X_cat_imp = self.cat_imputer_.transform(X[self.categorical_cols_])
            self.ohe_.fit(X_cat_imp)

        # Save final feature names
        num_names = self.numeric_cols_
        if self.categorical_cols_:
            cat_names = self.ohe_.get_feature_names_out(self.categorical_cols_).tolist()
        else:
            cat_names = []
        self.feature_names_ = num_names + cat_names
        return self

    def transform(self, X):
        X = self._base_clean(X, fit=False)

        X = self._transform_drop_columns(X)
        X = self._transform_rare_categories(X)
        X = self._transform_amenity_dummies(X)
        X = self._transform_list_encodings(X)
        X = self._transform_bool_cols(X)
        X = self._transform_corr_drop(X)

        # Ensure expected columns exist
        for c in self.numeric_cols_:
            if c not in X.columns:
                X[c] = np.nan
        for c in self.categorical_cols_:
            if c not in X.columns:
                X[c] = np.nan

        X_num = X[self.numeric_cols_].copy()
        X_num = self.outlier_capper_.transform(X_num)
        X_num = pd.DataFrame(
            self.num_imputer_.transform(X_num),
            columns=self.numeric_cols_,
            index=X.index,
        )
        X_num = pd.DataFrame(
            self.scaler_.transform(X_num),
            columns=self.numeric_cols_,
            index=X.index,
        )

        if self.categorical_cols_:
            X_cat = X[self.categorical_cols_].copy()
            X_cat_imp = self.cat_imputer_.transform(X_cat)
            X_cat_ohe = self.ohe_.transform(X_cat_imp)
            cat_names = self.ohe_.get_feature_names_out(self.categorical_cols_)
            X_cat_df = pd.DataFrame(X_cat_ohe, columns=cat_names, index=X.index)
        else:
            X_cat_df = pd.DataFrame(index=X.index)

        X_final = pd.concat([X_num, X_cat_df], axis=1)
        return X_final

    def fit_transform_split(self, raw_df, target_col="price"):
        # Base deterministic cleaning before split
        df = self._base_clean(raw_df, fit=False)

        # Remove price outliers from ALL data (train and test) before splitting.
        upper = df[target_col].quantile(self.cfg.target_outlier_quantile)
        self.target_outlier_bounds_ = {"lower": 0.0, "upper": float(upper)}
        df = df[df[target_col] <= upper].copy()

        # Separate target
        y = df[target_col].copy()
        X = df.drop(columns=[target_col])

        stratify_bins = self._make_target_stratify_bins(y)

        # Split
        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=self.cfg.test_size,
            random_state=self.cfg.random_state,
            stratify=stratify_bins,
        )


        # Build OOF list-encoding values for the training matrix only.
        oof_train_list_encodings = self._oof_list_target_encodings(X_train, y_train)

        # Fit on train only, transform both
        self.fit(X_train, y_train)
        X_train_p = self.transform(X_train)
        X_test_p = self.transform(X_test)

        # Replace train-only list target encodings with OOF values, scaled with
        # the same fitted scaler so train and test stay on the same scale.
        for feature_name, encoded in oof_train_list_encodings.items():
            if feature_name in X_train_p.columns:
                if feature_name in self.numeric_cols_:
                    i = self.numeric_cols_.index(feature_name)
                    encoded = (encoded - self.scaler_.mean_[i]) / self.scaler_.scale_[i]
                X_train_p.loc[encoded.index, feature_name] = encoded

        return X_train_p, X_test_p, np.log1p(y_train), np.log1p(y_test)


DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parents[2] / "output" / "processed"


def main() -> None:
    import argparse
    import json
    import joblib
    from backend.modeling.modeling import load_raw_data

    parser = argparse.ArgumentParser(description="Preprocess the Airbnb listings")
    parser.add_argument("--data-path", type=str, default=None)
    parser.add_argument("--output-dir", type=str, default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--random-state", type=int, default=42)
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    raw_df = load_raw_data(args.data_path)
    preprocessor = DataPreprocessor(
        DataPreprocessorConfig(test_size=args.test_size, random_state=args.random_state)
    )
    X_train, X_test, y_train, y_test = preprocessor.fit_transform_split(raw_df)

    X_train.to_csv(out_dir / "X_train.csv")
    X_test.to_csv(out_dir / "X_test.csv")
    y_train.rename("price_log").to_csv(out_dir / "y_train.csv")
    y_test.rename("price_log").to_csv(out_dir / "y_test.csv")
    # Full preprocessed dataset (train + test), used by the SHAP step.
    pd.concat([X_train, X_test]).to_csv(out_dir / "X_all.csv")
    pd.concat([y_train, y_test]).rename("price_log").to_csv(out_dir / "y_all.csv")

    # One readable file: all preprocessed features + target (log and euros) + split.
    full = pd.concat([X_train.assign(split="train"), X_test.assign(split="test")])
    y_log = pd.concat([y_train, y_test])
    full["price_log"] = y_log
    full["price"] = np.expm1(y_log)
    full.to_csv(out_dir / "processed_dataset.csv")
    with open(out_dir / "feature_names.json", "w", encoding="utf-8") as f:
        json.dump(list(preprocessor.feature_names_), f, indent=2)
    joblib.dump(preprocessor, out_dir / "preprocessor.joblib")

    print(
        f"Preprocessing done: train={X_train.shape}, test={X_test.shape}, "
        f"saved to {out_dir}"
    )
