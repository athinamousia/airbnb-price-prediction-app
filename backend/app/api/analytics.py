"""
Analytics service - handles statistics and aggregations
"""

import ast
from collections import Counter
import numpy as np
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import joblib
import pandas as pd

from backend.app.core.logging import logger
from backend.app.core.cache import cache

try:
    from constants import cols_to_drop, neighbourhood_en
except ModuleNotFoundError:
    from backend.constants import cols_to_drop, neighbourhood_en

try:
    from modeling.preprocessing import DataPreprocessor, DataPreprocessorConfig
except ModuleNotFoundError:
    from backend.modeling.preprocessing import DataPreprocessor, DataPreprocessorConfig


class AnalyticsService:

    MULTI_VALUE_COLUMNS = {"amenities", "host_verifications"}
    FORCE_NUMERIC_COLUMNS = {"host_response_rate", "host_acceptance_rate"}
    AVAILABILITY_COLUMNS = {
        "availability_30",
        "availability_60",
        "availability_90",
        "availability_365",
    }
    AVAILABILITY_WINDOWS = ["30 days", "60 days", "90 days", "365 days"]
    # Map each label back to the numeric window it represents.
    _WINDOW_LABEL_TO_INT = {
        label: int(label.split()[0])
        for label in ["30 days", "60 days", "90 days", "365 days"]
    }

    DISPLAY_NAME_OVERRIDES = {
        "neighbourhood_cleansed": "Neighborhood",
        "bath_count": "Baths",
        "availability_windows": "Availability Windows",
    }

    # Columns engineered from other inputs — not shown as user-facing inputs.
    DERIVED_COLUMNS = {
        "accommodates_per_bedroom",
        "accommodates_per_bed",
        "beds_per_bedroom",
        "bath_per_guest",
        "minimum_to_maximum_nights_ratio",
        # Area-level features merged from the review pipeline
        "avg_sentiment_score",
        "review_volume_trend",
        "area_review_overview",
        "area_sentiment_grade_5",
        "area_review_count",
    }

    VARIABLE_DESCRIPTIONS = {
        "accommodates": "Maximum number of guests the listing can host.",
        "bathrooms": "Number of bathrooms available to guests.",
        "bathrooms_text": "Bathroom details as shown in listing text.",
        "bedrooms": "Number of bedrooms in the property.",
        "beds": "Number of beds available for sleeping.",
        "property_type": "Type of property, such as apartment or house.",
        "room_type": "Rental type, for example entire place or private room.",
        "neighbourhood_cleansed": "Neighborhood where the listing is located.",
        "minimum_nights": "Minimum nights required for a reservation.",
        "maximum_nights": "Maximum nights allowed for a reservation.",
        "availability_365": "Number of available days in the next 365 days.",
        "host_response_time": "How quickly the host usually responds.",
        "host_response_rate": "Percentage of inquiries the host responds to.",
        "host_acceptance_rate": "Percentage of booking requests accepted by the host.",
        "host_is_superhost": "Whether the host is marked as a superhost.",
        "instant_bookable": "Whether guests can book instantly without approval.",
        "amenities": "Available amenities selected from the listing.",
        "host_verifications": "Verification methods completed by the host.",
        "latitude": "Latitude coordinate of the listing.",
        "longitude": "Longitude coordinate of the listing.",
        "review_scores_rating": "Overall review rating score.",
        "review_scores_cleanliness": "Review score for cleanliness.",
        "review_scores_location": "Review score for location.",
        "review_scores_value": "Review score for value.",
    }

    def __init__(self):
        self._df: Optional[pd.DataFrame] = None
        self._prediction_df: Optional[pd.DataFrame] = None
        self._prediction_preprocessor: Optional[DataPreprocessor] = None
        self._load_listings()

    def _load_listings(self):
        try:
            project_root = Path(__file__).resolve().parents[3]
            # Always use the raw listings for analytics.
            # cleaned_listings.csv is OHE-encoded and lacks the categorical
            # columns (neighbourhood_cleansed, property_type, room_type, etc.)
            # that all analytics methods rely on.
            listings_path = project_root / "data" / "listings.csv"
            if not listings_path.exists():
                logger.warning("listings.csv not found; analytics unavailable")
                self._df = None
                self._build_prediction_source()
                return
            self._df = pd.read_csv(listings_path)
            # Translate Greek neighbourhood names to English (same mapping used in preprocessing)
            if "neighbourhood_cleansed" in self._df.columns:
                self._df["neighbourhood_cleansed"] = self._df[
                    "neighbourhood_cleansed"
                ].map(lambda v: neighbourhood_en.get(str(v).strip().upper(), v))
            logger.info(f"Loaded listings from {listings_path}")
            self._build_prediction_source()
        except Exception as error:
            logger.error(f"Error loading listings: {error}")
            self._df = None
            self._prediction_df = None
            self._prediction_preprocessor = None

    def _build_prediction_source(self) -> None:
        try:
            project_root = Path(__file__).resolve().parents[3]
            # Always use the RAW listings for prediction options.
            # cleaned_listings.csv is already OHE-encoded, which would expose
            # hundreds of binary columns as individual UI inputs.
            raw_path = project_root / "data" / "listings.csv"
            if not raw_path.exists():
                logger.warning("listings.csv not found; prediction options unavailable")
                self._prediction_df = None
                self._prediction_preprocessor = None
                return

            working = pd.read_csv(raw_path)
            working["price"] = (
                working["price"]
                .astype(str)
                .str.replace(r"[\$,]", "", regex=True)
                .str.strip()
            )
            working["price"] = pd.to_numeric(working["price"], errors="coerce")
            working = working[working["price"] > 0].copy()

            if working.empty:
                self._prediction_df = None
                self._prediction_preprocessor = None
                return

            X = working.drop(columns=["price"])
            y = working["price"]

            preprocessor = DataPreprocessor(DataPreprocessorConfig())
            preprocessor.fit(X, y)

            # Keep the same filtering/cleaning stage used by training, before OHE and scaling.
            X_pre = preprocessor._base_clean(X, fit=False)
            X_pre = preprocessor._transform_drop_columns(X_pre)
            X_pre = preprocessor._transform_rare_categories(X_pre)
            X_pre = preprocessor._transform_bool_cols(X_pre)
            X_pre = preprocessor._transform_corr_drop(X_pre)

            self._prediction_df = X_pre
            self._prediction_preprocessor = preprocessor
        except Exception as error:
            logger.error(f"Error building prediction source data: {error}")
            self._prediction_df = None
            self._prediction_preprocessor = None

    def _price_series(self, df: pd.DataFrame = None) -> pd.Series:
        target = df if df is not None else self._df
        if target is None or "price" not in target.columns:
            return pd.Series(dtype="float64")
        cleaned = target["price"].astype(str).str.replace(r"[\$,]", "", regex=True)
        return pd.to_numeric(cleaned, errors="coerce")

    @staticmethod
    def _to_json_safe(value: Any) -> Any:
        if isinstance(value, (np.integer,)):
            return int(value)
        if isinstance(value, (np.floating, float)):
            value = float(value)
            return int(value) if value.is_integer() else value
        return str(value)

    @staticmethod
    def _to_display_name(column_name: str) -> str:
        overrides = AnalyticsService.DISPLAY_NAME_OVERRIDES
        if column_name in overrides:
            return overrides[column_name]
        return " ".join(part.capitalize() for part in column_name.split("_"))

    @staticmethod
    def _parse_list_cell(value: Any) -> list[str]:
        if value is None or (isinstance(value, float) and np.isnan(value)):
            return []

        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]

        text = str(value).strip()
        if not text:
            return []

        try:
            parsed = ast.literal_eval(text)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
        except (ValueError, SyntaxError):
            pass

        cleaned = text.strip("[]")
        return [
            item.strip().strip("\"'") for item in cleaned.split(",") if item.strip()
        ]

    def _infer_numeric_step(self, series: pd.Series) -> float:
        numeric = pd.to_numeric(series, errors="coerce").dropna()
        if numeric.empty:
            return 1.0
        sample = numeric.head(1000)
        has_fraction = bool((sample % 1 != 0).any())
        return 0.1 if has_fraction else 1.0

    @staticmethod
    def _normalize_percent_series(series: pd.Series) -> pd.Series:
        raw = series.astype(str).str.replace("%", "", regex=False).str.strip()
        return pd.to_numeric(raw, errors="coerce")

    @staticmethod
    def _normalize_boolean_label(value: Any) -> str | None:
        normalized = str(value).strip().lower()
        if normalized in {"t", "true", "1", "yes", "y"}:
            return "Yes"
        if normalized in {"f", "false", "0", "no", "n"}:
            return "No"
        return None

    def get_prediction_options(self) -> Dict[str, Any]:
        cache_key = "prediction_options_v5"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        if self._prediction_df is None:
            return {"columns": []}

        # Keep this aligned with model training by excluding known dropped columns and target.
        dropped_columns = set(cols_to_drop)
        seen_columns: set[str] = set()
        columns = []
        availability_added = False
        for col, raw_series in self._prediction_df.items():
            if col in seen_columns:
                continue
            seen_columns.add(col)

            if col in dropped_columns or col == "price" or col in self.DERIVED_COLUMNS:
                continue

            # Consolidate all availability_X columns into a single multi-select field.
            if col in self.AVAILABILITY_COLUMNS:
                if not availability_added:
                    availability_added = True
                    columns.append(
                        {
                            "name": "availability_windows",
                            "display_name": self._to_display_name(
                                "availability_windows"
                            ),
                            "description": "Select which booking windows the listing is available in.",
                            "type": "string",
                            "input_kind": "multi_select",
                            "option_count": len(self.AVAILABILITY_WINDOWS),
                            "options": self.AVAILABILITY_WINDOWS,
                            "default": [],
                        }
                    )
                continue

            series = raw_series.dropna()
            if series.empty:
                continue

            display_name = self._to_display_name(col)
            description = self.VARIABLE_DESCRIPTIONS.get(
                col, f"Input value for {display_name}."
            )

            if col in self.MULTI_VALUE_COLUMNS:
                # Amenities are now handled as top-N binary dummies; use the
                # fitted amenity_cols_ list directly to avoid case-mismatch
                # issues with raw CSV tokens.
                if col == "amenities":
                    amenity_cols = []
                    if self._prediction_preprocessor is not None:
                        amenity_cols = getattr(
                            self._prediction_preprocessor, "amenity_cols_", []
                        )
                    if not amenity_cols:
                        # Fallback: compute top-20 from raw series
                        token_counts: Counter = Counter()
                        for value in series:
                            tokens = [
                                t.lower().strip()
                                for t in self._parse_list_cell(value)
                                if t.strip()
                            ]
                            token_counts.update(set(tokens))
                        amenity_cols = [tok for tok, _ in token_counts.most_common(20)]
                    if not amenity_cols:
                        continue
                    options = sorted(amenity_cols)
                    columns.append(
                        {
                            "name": col,
                            "display_name": display_name,
                            "description": description,
                            "type": "string",
                            "input_kind": "multi_select",
                            "option_count": len(options),
                            "options": options,
                            "default": [],
                        }
                    )
                    continue

                parsed_tokens = []
                for value in series:
                    parsed_tokens.extend(self._parse_list_cell(value))

                allowed_tokens: set[str] | None = None
                if self._prediction_preprocessor is not None:
                    if col == "amenities" and hasattr(
                        self._prediction_preprocessor, "amenity_cols_"
                    ):
                        allowed_tokens = set(
                            self._prediction_preprocessor.amenity_cols_
                        )
                    else:
                        stats = (
                            self._prediction_preprocessor.list_target_encodings_.get(
                                col
                            )
                        )
                        if stats is not None:
                            allowed_tokens = set(stats.get("token_mean", {}).keys())

                if allowed_tokens is not None:
                    options = sorted(
                        {
                            token
                            for token in parsed_tokens
                            if token and token in allowed_tokens
                        }
                    )
                else:
                    options = sorted({token for token in parsed_tokens if token})

                if not options:
                    continue

                columns.append(
                    {
                        "name": col,
                        "display_name": display_name,
                        "description": description,
                        "type": "string",
                        "input_kind": "multi_select",
                        "option_count": len(options),
                        "options": options,
                        "default": [],
                    }
                )
                continue

            if col == "neighbourhood_cleansed":
                translated = (
                    series.astype(str)
                    .str.strip()
                    .map(lambda value: neighbourhood_en.get(value.upper(), value))
                )
                options = sorted({value for value in translated if value})
                if not options:
                    continue

                columns.append(
                    {
                        "name": col,
                        "display_name": display_name,
                        "description": description,
                        "type": "string",
                        "input_kind": "select",
                        "option_count": len(options),
                        "options": options,
                        "default": options[0],
                    }
                )
                continue

            bool_labels = sorted(
                {
                    label
                    for value in series
                    for label in [self._normalize_boolean_label(value)]
                    if label is not None
                }
            )
            if len(bool_labels) >= 2:
                columns.append(
                    {
                        "name": col,
                        "display_name": display_name,
                        "description": description,
                        "type": "string",
                        "input_kind": "select",
                        "option_count": len(bool_labels),
                        "options": bool_labels,
                        "default": "No" if "No" in bool_labels else bool_labels[0],
                    }
                )
                continue

            if col in self.FORCE_NUMERIC_COLUMNS:
                normalized = self._normalize_percent_series(series).dropna()
                is_numeric = not normalized.empty
            else:
                normalized = pd.to_numeric(series, errors="coerce").dropna()
                numeric_ratio = (len(normalized) / len(series)) if len(series) else 0.0
                is_numeric = (
                    pd.api.types.is_numeric_dtype(series) or numeric_ratio >= 0.95
                )

            if is_numeric:
                if normalized.empty:
                    normalized = pd.to_numeric(series, errors="coerce").dropna()
                if normalized.empty:
                    continue

                min_value = float(normalized.min())
                max_value = float(normalized.max())
                median_value = float(normalized.median())
                step_value = self._infer_numeric_step(normalized)

                value_type = "number"
                columns.append(
                    {
                        "name": col,
                        "display_name": display_name,
                        "description": description,
                        "type": value_type,
                        "input_kind": "number",
                        "option_count": int(normalized.nunique()),
                        "options": [],
                        "default": self._to_json_safe(median_value),
                        "min": self._to_json_safe(min_value),
                        "max": self._to_json_safe(max_value),
                        "step": step_value,
                    }
                )
                continue
            else:
                options = sorted(
                    {str(v).strip() for v in series.astype(str) if str(v).strip()}
                )
                value_type = "string"

            if not options:
                continue

            columns.append(
                {
                    "name": col,
                    "display_name": display_name,
                    "description": description,
                    "type": value_type,
                    "input_kind": "select",
                    "option_count": len(options),
                    "options": options,
                    "default": options[0],
                }
            )

        result = {"columns": columns}
        cache.set(cache_key, result)
        return result

    def predict_price(self, form_values: Dict[str, Any]) -> Dict[str, Any]:
        """
        Accepts the raw UI form values, converts them to the format expected by the
        trained PredictionBundle, and returns the predicted price in original currency.

        Conversion rules applied before passing to the bundle's preprocessor:
        - ``availability_windows`` (list[int|str]) → expands to availability_30/60/90/365.
          Selected windows get the full value (e.g. 30), unselected get 0.
        - Boolean UI labels ("Yes"/"No") → "t"/"f" for columns that the preprocessor
          treats as bool_cols_ (e.g. host_is_superhost, instant_bookable); → 1/0 for
          other boolean-looking columns (e.g. bath_is_shared).
        - List values (amenities, host_verifications) → stringified list representation.
        """
        backend_root = Path(__file__).resolve().parents[2]
        bundle_path = backend_root / "models" / "artifacts" / "price_model.joblib"
        if not bundle_path.exists():
            raise FileNotFoundError(
                f"Model artifact not found at {bundle_path}. "
                "Run the training pipeline first."
            )

        bundle = joblib.load(bundle_path)

        # Columns that the preprocessor maps via "t"/"f" → 0/1
        bool_tf_cols: set = set()
        if self._prediction_preprocessor is not None:
            bool_tf_cols = set(getattr(self._prediction_preprocessor, "bool_cols_", []))

        row: Dict[str, Any] = {}
        for key, value in form_values.items():
            if key == "availability_windows":
                selected = {
                    self._WINDOW_LABEL_TO_INT.get(str(w), int(str(w).split()[0]))
                    for w in (value or [])
                }
                for window in self.AVAILABILITY_WINDOWS:
                    row[f"availability_{window}"] = window if window in selected else 0

            elif isinstance(value, str) and value in {"Yes", "No"}:
                if key in bool_tf_cols:
                    row[key] = "t" if value == "Yes" else "f"
                else:
                    row[key] = 1 if value == "Yes" else 0

            elif isinstance(value, list):
                row[key] = str(value)

            else:
                row[key] = value

        df = pd.DataFrame([row])
        predicted_price = float(bundle.predict(df)[0])
        return {"predicted_price": round(predicted_price, 2)}

    def get_kpis(self) -> Dict[str, Any]:
        cache_key = "kpis"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        if self._df is None:
            return {
                "total_listings": 0,
                "avg_price_per_night": 0.0,
                "avg_occupancy_rate": 0.0,
                "avg_review_score": None,
                "superhost_percentage": 0.0,
            }

        total_listings = int(len(self._df))

        prices = self._price_series()
        avg_price = float(prices.mean()) if not prices.empty else 0.0

        if "availability_365" in self._df.columns:
            availability = pd.to_numeric(
                self._df["availability_365"], errors="coerce"
            ).clip(lower=0, upper=365)
            occupancy_rate = float(((365 - availability).mean() / 365) * 100)
        else:
            occupancy_rate = 0.0

        avg_review_score = None
        review_candidates = [
            "review_scores_rating",
            "review_scores_value",
            "review_scores_cleanliness",
            "review_scores_location",
        ]
        selected_col = next(
            (c for c in review_candidates if c in self._df.columns), None
        )
        if selected_col:
            rating = pd.to_numeric(self._df[selected_col], errors="coerce")
            mean_rating = float(rating.mean()) if not rating.empty else 0.0
            avg_review_score = mean_rating / 20 if mean_rating > 5 else mean_rating

        superhost_percentage = 0.0
        if "host_is_superhost" in self._df.columns:
            superhost = (
                self._df["host_is_superhost"]
                .astype(str)
                .str.lower()
                .isin(["t", "true", "1", "yes"])
            )
            superhost_percentage = float(superhost.mean() * 100)

        result = {
            "total_listings": total_listings,
            "avg_price_per_night": round(avg_price, 2),
            "avg_occupancy_rate": round(occupancy_rate, 2),
            "avg_review_score": (
                round(avg_review_score, 2) if avg_review_score else None
            ),
            "superhost_percentage": round(superhost_percentage, 2),
        }
        cache.set(cache_key, result)
        return result

    def get_price_analysis(self, neighbourhood: str = None) -> Dict[str, Any]:
        cache_key = f"price_analysis_{neighbourhood or 'all'}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        if self._df is None:
            return {
                "histogram": {"labels": [], "counts": []},
                "neighbourhoods": [],
                "avg_by_neighbourhood": [],
                "selected": "all",
                "stats": {"min": 0, "max": 0, "median": 0, "mean": 0},
            }

        # all neighbourhoods for dropdown
        neighbourhoods = sorted(
            self._df["neighbourhood_cleansed"].dropna().unique().tolist()
        )

        # filter df if neighbourhood selected
        df = self._df.copy()
        if neighbourhood and neighbourhood != "all":
            df = df[df["neighbourhood_cleansed"] == neighbourhood]

        # clean prices
        prices = self._price_series(df).dropna()

        # remove top 5% outliers
        if not prices.empty:
            prices = prices[prices <= prices.quantile(0.95)]
            prices = prices[prices > 0]

        # histogram using numpy
        if not prices.empty:
            counts, bin_edges = np.histogram(prices.values, bins=20)
            labels = [
                f"${int(bin_edges[i])}-${int(bin_edges[i+1])}"
                for i in range(len(bin_edges) - 1)
            ]
            stats = {
                "min": round(float(prices.min()), 2),
                "max": round(float(prices.max()), 2),
                "median": round(float(prices.median()), 2),
                "mean": round(float(prices.mean()), 2),
            }
        else:
            counts, labels = np.array([]), []
            stats = {"min": 0, "max": 0, "median": 0, "mean": 0}

        # avg price by neighbourhood top 15
        all_prices = self._price_series(self._df)
        avg_by_nb = (
            self._df.assign(price_clean=all_prices)
            .groupby("neighbourhood_cleansed")["price_clean"]
            .mean()
            .dropna()
            .sort_values(ascending=False)
            .head(15)
        )

        result = {
            "histogram": {
                "labels": labels,
                "counts": counts.tolist(),
            },
            "neighbourhoods": ["all"] + neighbourhoods,
            "avg_by_neighbourhood": [
                {"neighbourhood": k, "avg_price": round(float(v), 2)}
                for k, v in avg_by_nb.items()
            ],
            "selected": neighbourhood or "all",
            "stats": stats,
        }

        cache.set(cache_key, result)
        return result

    def get_geo_distribution(self):
        cache_key = "geo_distribution"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        if self._df is None:
            return []

        cols = [
            c
            for c in ["latitude", "longitude", "neighbourhood_cleansed"]
            if c in self._df.columns
        ]
        if not all(
            c in self._df.columns
            for c in ["latitude", "longitude", "neighbourhood_cleansed"]
        ):
            return []

        df = self._df[["latitude", "longitude", "neighbourhood_cleansed"]].copy()
        df["price"] = self._price_series()
        df = df.dropna(subset=["latitude", "longitude", "price"])
        df = df[df["price"] > 0]
        df = df[df["price"] <= df["price"].quantile(0.99)]  # trim extreme outliers

        result = [
            {
                "latitude": round(float(row["latitude"]), 6),
                "longitude": round(float(row["longitude"]), 6),
                "price": round(float(row["price"]), 2),
                "neighbourhood": row["neighbourhood_cleansed"],
            }
            for _, row in df.iterrows()
        ]

        cache.set(cache_key, result)
        return result

    def get_geo_distribution_grouped(self):
        cache_key = "geo_distribution_grouped"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        if self._df is None:
            return []

        required = ["latitude", "longitude", "neighbourhood_cleansed"]
        if not all(c in self._df.columns for c in required):
            return []

        df = self._df[["latitude", "longitude", "neighbourhood_cleansed"]].copy()
        df["price"] = self._price_series()
        df = df.dropna(subset=["latitude", "longitude", "price"])
        df = df[df["price"] > 0]
        df = df[df["price"] <= df["price"].quantile(0.99)]

        grouped = (
            df.groupby("neighbourhood_cleansed")
            .agg(
                latitude=("latitude", "mean"),
                longitude=("longitude", "mean"),
                avg_price=("price", "mean"),
                count=("price", "count"),
            )
            .reset_index()
        )

        result = [
            {
                "neighbourhood": row["neighbourhood_cleansed"],
                "latitude": round(float(row["latitude"]), 6),
                "longitude": round(float(row["longitude"]), 6),
                "avg_price": round(float(row["avg_price"]), 2),
                "count": int(row["count"]),
            }
            for _, row in grouped.iterrows()
        ]

        cache.set(cache_key, result)
        return result

    def get_property_type_distribution(
        self, neighbourhood: str = "all", room_type: str = "all"
    ) -> Dict[str, Any]:
        cache_key = f"property_type_distribution_{neighbourhood}_{room_type}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        if self._df is None:
            return {
                "property_types": [],
                "neighbourhoods": ["all"],
                "room_types": ["all"],
                "selected_neighbourhood": "all",
                "selected_room_type": "all",
            }

        required = ["property_type", "neighbourhood_cleansed", "room_type"]
        if not all(c in self._df.columns for c in required):
            return {
                "property_types": [],
                "neighbourhoods": ["all"],
                "room_types": ["all"],
                "selected_neighbourhood": neighbourhood or "all",
                "selected_room_type": room_type or "all",
            }

        neighbourhoods = sorted(
            self._df["neighbourhood_cleansed"].dropna().astype(str).unique().tolist()
        )
        room_types = sorted(
            self._df["room_type"].dropna().astype(str).unique().tolist()
        )

        df = self._df.copy()
        if neighbourhood and neighbourhood != "all":
            df = df[df["neighbourhood_cleansed"] == neighbourhood]
        if room_type and room_type != "all":
            df = df[df["room_type"] == room_type]

        distribution = df["property_type"].dropna().astype(str).value_counts().head(12)

        result = {
            "property_types": [
                {"property_type": key, "count": int(value)}
                for key, value in distribution.items()
            ],
            "neighbourhoods": ["all"] + neighbourhoods,
            "room_types": ["all"] + room_types,
            "selected_neighbourhood": neighbourhood or "all",
            "selected_room_type": room_type or "all",
        }

        cache.set(cache_key, result)
        return result

    def get_host_insights(
        self, neighbourhood: str = "all", room_type: str = "all"
    ) -> Dict[str, Any]:
        cache_key = f"host_insights_{neighbourhood}_{room_type}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        if self._df is None:
            return {
                "superhost_percentage": 0.0,
                "superhost_count": 0,
                "non_superhost_count": 0,
                "response_time_distribution": [],
                "neighbourhoods": ["all"],
                "room_types": ["all"],
                "selected_neighbourhood": "all",
                "selected_room_type": "all",
            }

        neighbourhoods = (
            sorted(
                self._df["neighbourhood_cleansed"]
                .dropna()
                .astype(str)
                .unique()
                .tolist()
            )
            if "neighbourhood_cleansed" in self._df.columns
            else []
        )
        room_types = (
            sorted(self._df["room_type"].dropna().astype(str).unique().tolist())
            if "room_type" in self._df.columns
            else []
        )

        df = self._df.copy()
        if (
            "neighbourhood_cleansed" in df.columns
            and neighbourhood
            and neighbourhood != "all"
        ):
            df = df[df["neighbourhood_cleansed"] == neighbourhood]
        if "room_type" in df.columns and room_type and room_type != "all":
            df = df[df["room_type"] == room_type]

        if "host_is_superhost" in df.columns:
            superhost_series = (
                df["host_is_superhost"]
                .astype(str)
                .str.lower()
                .isin(["t", "true", "1", "yes"])
            )
            superhost_count = int(superhost_series.sum())
            non_superhost_count = int((~superhost_series).sum())
            total_known = superhost_count + non_superhost_count
            superhost_percentage = (
                float((superhost_count / total_known) * 100) if total_known > 0 else 0.0
            )
        else:
            superhost_count = 0
            non_superhost_count = 0
            superhost_percentage = 0.0

        response_distribution = []
        if "host_response_time" in df.columns:
            ordered_labels = [
                "within an hour",
                "within a few hours",
                "within a day",
                "a few days or more",
            ]
            normalized = (
                df["host_response_time"]
                .fillna("unknown")
                .astype(str)
                .str.strip()
                .str.lower()
            )

            counts = normalized.value_counts()
            response_distribution = [
                {
                    "response_time": label,
                    "count": int(counts.get(label, 0)),
                }
                for label in ordered_labels
                if int(counts.get(label, 0)) > 0
            ]

            unknown_count = int(counts.get("unknown", 0))
            if unknown_count > 0:
                response_distribution.append(
                    {"response_time": "unknown", "count": unknown_count}
                )

        result = {
            "superhost_percentage": round(superhost_percentage, 2),
            "superhost_count": superhost_count,
            "non_superhost_count": non_superhost_count,
            "response_time_distribution": response_distribution,
            "neighbourhoods": ["all"] + neighbourhoods,
            "room_types": ["all"] + room_types,
            "selected_neighbourhood": neighbourhood or "all",
            "selected_room_type": room_type or "all",
        }

        cache.set(cache_key, result)
        return result


analytics_service = AnalyticsService()
