"""
Analytics service - handles statistics and aggregations
"""

import numpy as np
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd

from app.core.logging import logger
from app.core.cache import cache


class AnalyticsService:

    def __init__(self):
        self._df: Optional[pd.DataFrame] = None
        self._load_listings()

    def _load_listings(self):
        try:
            project_root = Path(__file__).resolve().parents[3]
            listings_path = project_root / "data" / "listings.csv"
            self._df = pd.read_csv(listings_path)
            logger.info(f"Loaded listings from {listings_path}")
        except Exception as error:
            logger.error(f"Error loading listings.csv: {error}")
            self._df = None

    def _price_series(self, df: pd.DataFrame = None) -> pd.Series:
        target = df if df is not None else self._df
        if target is None or "price" not in target.columns:
            return pd.Series(dtype="float64")
        cleaned = target["price"].astype(str).str.replace(r"[\$,]", "", regex=True)
        return pd.to_numeric(cleaned, errors="coerce")

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


analytics_service = AnalyticsService()
