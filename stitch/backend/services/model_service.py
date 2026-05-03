from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import pickle
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

from backend.services.data_service import (
    TARGET_ALIASES,
    get_dataset_repository,
    safe_float,
)

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "model"
MODEL_PATH = MODEL_DIR / "model.pkl"

PREFERRED_FEATURES = [
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

FEATURE_SIGN_HINTS = {
    "adult_mortality": -1.0,
    "infant_deaths": -1.0,
    "alcohol": -0.4,
    "gdp": 1.0,
    "bmi": 0.6,
    "schooling": 1.0,
    "hiv_aids": -1.0,
    "income_composition_of_resources": 1.0,
    "population": 0.1,
    "percentage_expenditure": 0.6,
    "thinness_1_19_years": -0.7,
    "thinness_5_9_years": -0.7,
    "under_five_deaths": -0.8,
    "measles": -0.6,
    "total_expenditure": 0.5,
    "hepatitis_b": 0.3,
    "polio": 0.3,
    "diphtheria": 0.3,
    "year": 0.1,
}


@dataclass(slots=True)
class ModelBundle:
    model: RandomForestRegressor
    feature_columns: list[str]
    feature_medians: dict[str, float]
    target_column: str
    training_rows: int
    training_score: float
    target_mean: float
    target_std: float
    feature_importances: dict[str, float]


_MODEL_BUNDLE: ModelBundle | None = None


def _target_column(frame: pd.DataFrame) -> str | None:
    for column in TARGET_ALIASES:
        if column in frame.columns:
            return column
    return None


def _prepare_training_frame() -> tuple[pd.DataFrame, str, list[str]]:
    repository = get_dataset_repository()
    frame = repository.get_training_frame()
    if frame.empty:
        return pd.DataFrame(), "", []

    target_column = _target_column(frame)
    if target_column is None:
        return pd.DataFrame(), "", []

    feature_columns = [column for column in PREFERRED_FEATURES if column in frame.columns and column != target_column]
    if not feature_columns:
        return pd.DataFrame(), target_column, []

    training_frame = frame[[target_column, *feature_columns]].copy()
    for column in [target_column, *feature_columns]:
        training_frame[column] = pd.to_numeric(training_frame[column], errors="coerce")

    training_frame = training_frame.dropna(subset=[target_column])
    if training_frame.empty:
        return pd.DataFrame(), target_column, feature_columns

    for column in feature_columns:
        training_frame[column] = training_frame[column].fillna(training_frame[column].median())

    return training_frame.reset_index(drop=True), target_column, feature_columns


def _save_bundle(bundle: ModelBundle) -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with MODEL_PATH.open("wb") as handle:
        pickle.dump(bundle, handle)


def _load_bundle_from_disk() -> ModelBundle | None:
    if not MODEL_PATH.exists():
        return None
    with MODEL_PATH.open("rb") as handle:
        bundle = pickle.load(handle)
    if isinstance(bundle, ModelBundle):
        return bundle
    if isinstance(bundle, dict) and "model" in bundle:
        return ModelBundle(**bundle)
    return None


def train_model_bundle(force_retrain: bool = False) -> ModelBundle:
    global _MODEL_BUNDLE

    if not force_retrain:
        cached = _load_bundle_from_disk()
        if cached is not None:
            _MODEL_BUNDLE = cached
            return cached

    training_frame, target_column, feature_columns = _prepare_training_frame()
    if training_frame.empty or not feature_columns or not target_column:
        raise RuntimeError(
            "No usable dataset was found. Place WHO/UN CSV or Excel files inside backend/data and retry."
        )

    X = training_frame[feature_columns].copy()
    y = training_frame[target_column].astype(float).copy()

    model = RandomForestRegressor(
        n_estimators=400,
        random_state=42,
        n_jobs=-1,
        max_depth=18,
        min_samples_leaf=2,
    )
    model.fit(X, y)

    training_score = float(model.score(X, y))
    feature_medians = {}
    for column in feature_columns:
        median = float(X[column].median())
        feature_medians[column] = 0.0 if np.isnan(median) else median
    feature_importances = {
        column: float(importance)
        for column, importance in zip(feature_columns, model.feature_importances_)
    }

    bundle = ModelBundle(
        model=model,
        feature_columns=feature_columns,
        feature_medians=feature_medians,
        target_column=target_column,
        training_rows=len(training_frame),
        training_score=training_score,
        target_mean=float(y.mean()),
        target_std=float(y.std(ddof=0)),
        feature_importances=feature_importances,
    )
    _save_bundle(bundle)
    _MODEL_BUNDLE = bundle
    return bundle


def load_model_bundle(*, allow_train: bool = True) -> ModelBundle:
    global _MODEL_BUNDLE

    if _MODEL_BUNDLE is not None:
        return _MODEL_BUNDLE

    cached = _load_bundle_from_disk()
    if cached is not None:
        _MODEL_BUNDLE = cached
        return cached

    if not allow_train:
        raise RuntimeError("The life expectancy model is not loaded yet.")

    return train_model_bundle(force_retrain=False)


def _resolve_feature_value(
    feature: str,
    payload: dict[str, Any],
    context_row: dict[str, Any] | None,
    medians: dict[str, float],
) -> float:
    value = payload.get(feature)
    if value is None and context_row is not None:
        value = context_row.get(feature)
    if value is None:
        value = medians.get(feature, 0.0)
    return safe_float(value, medians.get(feature, 0.0))


def _status_from_prediction(prediction: float) -> str:
    if prediction < 60:
        return "critical"
    if prediction < 72:
        return "moderate"
    return "normal"


def _feature_story(bundle: ModelBundle, row: dict[str, float]) -> tuple[str, str]:
    medians = bundle.feature_medians
    feature_pairs: list[tuple[str, float]] = []

    for feature in bundle.feature_columns:
        value = row.get(feature, medians.get(feature, 0.0))
        baseline = medians.get(feature, 0.0)
        scale = abs(baseline) if abs(baseline) > 1e-6 else 1.0
        deviation = (value - baseline) / scale
        sign = FEATURE_SIGN_HINTS.get(feature, 0.0)
        feature_pairs.append((feature, deviation * sign * bundle.feature_importances.get(feature, 0.0)))

    positive = sorted(feature_pairs, key=lambda item: item[1], reverse=True)
    negative = sorted(feature_pairs, key=lambda item: item[1])

    top_support = positive[0][0] if positive else "dataset context"
    top_risk = negative[0][0] if negative else "dataset context"

    def _pretty(name: str) -> str:
        return name.replace("_", " ").title()

    return _pretty(top_support), _pretty(top_risk)


def predict_life_expectancy(
    input_data: Any,
    *,
    country: str | None = None,
    year: int | None = None,
) -> dict[str, Any]:
    bundle = load_model_bundle()
    repository = get_dataset_repository()

    payload = input_data.model_dump() if hasattr(input_data, "model_dump") else dict(input_data)
    resolved_country = payload.get("country") or country
    resolved_year = year if year is not None else payload.get("year")
    context = repository.get_context(country=resolved_country, year=safe_float(resolved_year, None) if resolved_year is not None else None)

    row: dict[str, float] = {}
    for feature in bundle.feature_columns:
        row[feature] = _resolve_feature_value(feature, payload, context.row, bundle.feature_medians)

    features = pd.DataFrame([row], columns=bundle.feature_columns)
    values = features.to_numpy(dtype=float)
    prediction = float(bundle.model.predict(values)[0])

    tree_predictions = np.array([tree.predict(values)[0] for tree in bundle.model.estimators_], dtype=float)
    uncertainty = float(tree_predictions.std(ddof=0))
    missing_count = sum(1 for feature in bundle.feature_columns if payload.get(feature) is None)
    confidence_score = float(np.clip(97.0 - (uncertainty * 5.5) - (missing_count * 1.0), 55.0, 99.5))

    status = _status_from_prediction(prediction)
    support, risk = _feature_story(bundle, row)
    context_label = "dataset row"
    if context.match_level == "country-year":
        context_label = "country and year match"
    elif context.match_level == "country":
        context_label = "country match"
    elif context.match_level == "year":
        context_label = "year match"

    clinical_insight = (
        f"Predicted life expectancy: {prediction:.1f} years. "
        f"Confidence score: {confidence_score:.1f}%. "
        f"Best dataset context: {context_label}. "
        f"Strongest supportive signal: {support}. "
        f"Main caution signal: {risk}. "
        f"The model is trained on your available WHO/UN data and uses the filtered dataset context when country or year is supplied."
    )

    return {
        "prediction": round(prediction, 1),
        "confidence_score": round(confidence_score, 1),
        "clinical_insight": clinical_insight,
        "status": status,
        "country": resolved_country,
        "year": safe_float(resolved_year, None) if resolved_year is not None else None,
        "training_rows": bundle.training_rows,
        "training_score": round(bundle.training_score, 3),
    }
