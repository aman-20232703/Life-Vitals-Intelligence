from __future__ import annotations

from dataclasses import dataclass
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

TARGET_ALIASES = {
    "life_expectancy",
    "life_expectancy_at_birth",
    "life_expectancy_years",
}

MODEL_FEATURES = [
    "year",
    "adult_mortality",
    "infant_deaths",
    "alcohol",
    "gdp",
    "bmi",
    "schooling",
    "hiv_aids",
    "income_composition_of_resources",
    "population",
    "percentage_expenditure",
    "thinness_1_19_years",
    "thinness_5_9_years",
    "under_five_deaths",
    "measles",
    "total_expenditure",
    "hepatitis_b",
    "polio",
    "diphtheria",
]

SERIES_FEATURES = {
    "gdp",
    "adult_mortality",
    "infant_deaths",
    "alcohol",
    "bmi",
    "schooling",
    "hiv_aids",
    "income_composition_of_resources",
    "population",
    "percentage_expenditure",
    "thinness_1_19_years",
    "thinness_5_9_years",
    "under_five_deaths",
    "measles",
    "total_expenditure",
    "hepatitis_b",
    "polio",
    "diphtheria",
    "urban_population_percent",
    "unemployment_rate",
    "education_index",
    "sanitation_access_percent",
    "clean_water_access_percent",
    "air_pollution_pm25",
    "vaccination_coverage",
    "disease_rate",
}


@dataclass(slots=True)
class DatasetContext:
    country: str | None
    year: int | None
    frame: pd.DataFrame
    match_level: str
    row: dict[str, Any] | None


class DatasetRepository:
    def __init__(self, data_dir: Path | None = None):
        self.data_dir = data_dir or DATA_DIR
        self._frame = pd.DataFrame()
        self._loaded = False

    @staticmethod
    def _clean_name(value: str) -> str:
        text = re.sub(r"[^0-9a-zA-Z]+", "_", str(value).strip().lower())
        return text.strip("_")

    def _read_file(self, path: Path) -> pd.DataFrame:
        if path.suffix.lower() == ".csv":
            frame = pd.read_csv(path)
        elif path.suffix.lower() in {".xlsx", ".xls"}:
            frame = pd.read_excel(path)
        else:
            return pd.DataFrame()

        frame = frame.copy()
        frame.columns = [self._clean_name(column) for column in frame.columns]
        frame.replace({"": pd.NA, " ": pd.NA}, inplace=True)

        for column in frame.columns:
            if frame[column].dtype == object:
                frame[column] = frame[column].astype(str).str.strip()
                frame.loc[frame[column].isin({"nan", "None", "<NA>"}), column] = pd.NA

        return self._standardize_columns(frame)

    def _standardize_columns(self, frame: pd.DataFrame) -> pd.DataFrame:
        rename_map = {
            "life_expectancy_at_birth": "life_expectancy",
            "life_expectancy_years": "life_expectancy",
            "adult_mortality_rate": "adult_mortality",
            "infant_death": "infant_deaths",
            "hiv_aids_rate": "hiv_aids",
            "income_composition_of_resources_index": "income_composition_of_resources",
            "income_composition": "income_composition_of_resources",
            "gdp_per_capita": "gdp",
            "schooling_years": "schooling",
            "urban_population": "urban_population_percent",
            "education": "education_index",
            "sanitation": "sanitation_access_percent",
            "clean_water": "clean_water_access_percent",
            "air_pollution": "air_pollution_pm25",
            "vaccination": "vaccination_coverage",
            "disease": "disease_rate",
            "unemployment": "unemployment_rate",
            "population_density_per_km2": "population_density",
            "population_density": "population_density",
        }

        frame = frame.rename(columns={column: rename_map.get(column, column) for column in frame.columns})

        if "country" in frame.columns:
            frame["country"] = frame["country"].astype("string").str.strip()
        if "year" in frame.columns:
            frame["year"] = pd.to_numeric(frame["year"], errors="coerce")

        numeric_candidates = [column for column in frame.columns if column != "country"]
        for column in numeric_candidates:
            if column == "country":
                continue
            series = frame[column]
            if pd.api.types.is_numeric_dtype(series):
                continue

            numeric_series = pd.to_numeric(series, errors="coerce")
            valid_ratio = float(numeric_series.notna().mean()) if len(numeric_series) else 0.0
            if valid_ratio >= 0.7:
                frame[column] = numeric_series

        return frame

    def refresh(self) -> pd.DataFrame:
        frames: list[pd.DataFrame] = []
        if self.data_dir.exists():
            for path in sorted(self.data_dir.rglob("*")):
                if path.suffix.lower() not in {".csv", ".xlsx", ".xls"}:
                    continue
                try:
                    frame = self._read_file(path)
                except Exception:
                    continue
                if not frame.empty:
                    frames.append(frame)

        if frames:
            combined = pd.concat(frames, ignore_index=True, sort=False)
        else:
            combined = pd.DataFrame()

        if not combined.empty:
            combined = combined.drop_duplicates().reset_index(drop=True)
            combined = self._fill_missing_values(combined)

        self._frame = combined
        self._loaded = True
        return self._frame

    def _fill_missing_values(self, frame: pd.DataFrame) -> pd.DataFrame:
        result = frame.copy()
        for column in result.columns:
            if column == "country":
                continue
            if pd.api.types.is_numeric_dtype(result[column]):
                result[column] = result[column].fillna(result[column].median())
            else:
                mode = result[column].mode(dropna=True)
                if not mode.empty:
                    result[column] = result[column].fillna(mode.iloc[0])
        return result

    @property
    def frame(self) -> pd.DataFrame:
        if not self._loaded:
            self.refresh()
        return self._frame

    @property
    def has_data(self) -> bool:
        return not self.frame.empty

    def get_available_columns(self) -> list[str]:
        return list(self.frame.columns)

    def get_numeric_series(self, column: str) -> pd.Series:
        if column not in self.frame.columns:
            return pd.Series(dtype=float)
        series = pd.to_numeric(self.frame[column], errors="coerce").dropna()
        return series.astype(float)

    def get_numeric_bounds(self, column: str) -> tuple[float, float] | None:
        series = self.get_numeric_series(column)
        if series.empty:
            return None
        return float(series.min()), float(series.max())

    def get_reference_frame(self, country: str | None = None, year: int | None = None) -> pd.DataFrame:
        frame = self.frame
        if frame.empty:
            return frame

        filtered = frame
        if country and "country" in filtered.columns:
            filtered = filtered[filtered["country"].astype(str).str.casefold() == str(country).strip().casefold()]
        if year is not None and "year" in filtered.columns:
            year_value = pd.to_numeric(pd.Series([year]), errors="coerce").iloc[0]
            if pd.notna(year_value):
                filtered = filtered[pd.to_numeric(filtered["year"], errors="coerce") == float(year_value)]

        if not filtered.empty:
            return filtered.reset_index(drop=True)

        if country and "country" in frame.columns:
            filtered = frame[frame["country"].astype(str).str.casefold() == str(country).strip().casefold()]
            if not filtered.empty:
                if year is not None and "year" in filtered.columns:
                    filtered = filtered.sort_values("year", ascending=False)
                return filtered.reset_index(drop=True)

        if year is not None and "year" in frame.columns:
            filtered = frame[pd.to_numeric(frame["year"], errors="coerce") == float(year)]
            if not filtered.empty:
                return filtered.reset_index(drop=True)

        return frame.reset_index(drop=True)

    def get_context(self, country: str | None = None, year: int | None = None) -> DatasetContext:
        frame = self.get_reference_frame(country=country, year=year)
        if frame.empty:
            return DatasetContext(country=country, year=year, frame=frame, match_level="none", row=None)

        match_level = "country-year"
        if country and year is None:
            match_level = "country"
        elif year is not None and not country:
            match_level = "year"
        elif not country and year is None:
            match_level = "global"

        row = frame.iloc[0].to_dict()
        return DatasetContext(country=country, year=year, frame=frame, match_level=match_level, row=row)

    def get_target_series(self) -> pd.Series:
        for column in TARGET_ALIASES:
            if column in self.frame.columns:
                return pd.to_numeric(self.frame[column], errors="coerce").dropna().astype(float)
        return pd.Series(dtype=float)

    def get_training_frame(self) -> pd.DataFrame:
        frame = self.frame.copy()
        if frame.empty:
            return frame

        target_column = None
        for column in TARGET_ALIASES:
            if column in frame.columns:
                target_column = column
                break
        if target_column is None:
            return pd.DataFrame()

        available_features = [column for column in MODEL_FEATURES if column in frame.columns and column != target_column]
        selected_columns = [target_column, *available_features]
        training_frame = frame[selected_columns].copy()

        for column in selected_columns:
            training_frame[column] = pd.to_numeric(training_frame[column], errors="coerce")

        training_frame = training_frame.dropna(subset=[target_column])
        if training_frame.empty:
            return training_frame

        for column in available_features:
            training_frame[column] = training_frame[column].fillna(training_frame[column].median())

        return training_frame.reset_index(drop=True)

    def get_model_features(self) -> list[str]:
        frame = self.frame
        if frame.empty:
            return []
        return [column for column in MODEL_FEATURES if column in frame.columns]

    def get_global_target_mean(self) -> float | None:
        series = self.get_target_series()
        if series.empty:
            return None
        return float(series.mean())

    def get_country_target_mean(self, country: str | None = None) -> float | None:
        if not country or self.frame.empty or "country" not in self.frame.columns:
            return None
        frame = self.frame[self.frame["country"].astype(str).str.casefold() == str(country).strip().casefold()]
        if frame.empty:
            return None
        for column in TARGET_ALIASES:
            if column in frame.columns:
                series = pd.to_numeric(frame[column], errors="coerce").dropna()
                if not series.empty:
                    return float(series.mean())
        return None


@lru_cache(maxsize=1)
def get_dataset_repository() -> DatasetRepository:
    repository = DatasetRepository()
    repository.refresh()
    return repository


def percentile_score(value: float, series: pd.Series, *, higher_is_better: bool = True) -> float:
    numeric = pd.to_numeric(series, errors="coerce").dropna().astype(float)
    if numeric.empty:
        return 0.0

    lower = float(numeric.quantile(0.1))
    upper = float(numeric.quantile(0.9))
    if lower == upper:
        lower = float(numeric.min())
        upper = float(numeric.max())
    if lower == upper:
        return 50.0

    scaled = (float(value) - lower) / (upper - lower)
    scaled = max(0.0, min(1.0, scaled))
    score = scaled * 100.0
    return score if higher_is_better else 100.0 - score


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        if isinstance(value, str) and not value.strip():
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_int(value: Any, default: int | None = None) -> int | None:
    try:
        if value is None:
            return default
        if isinstance(value, str) and not value.strip():
            return default
        return int(float(value))
    except (TypeError, ValueError):
        return default


def weighted_average(values: dict[str, float]) -> float:
    if not values:
        return 0.0
    total = sum(values.values())
    return total / len(values)
