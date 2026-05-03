from __future__ import annotations

import math

from fastapi import APIRouter, Depends, Query
import pandas as pd

# map endpoints are intentionally public (no auth) so frontend map can load dataset years
from backend.services.analysis import analyze_economy, analyze_health, analyze_social
from backend.services.data_service import get_dataset_repository, percentile_score

router = APIRouter(tags=["map"])

AGE_BUCKETS = ["10-20", "20-30", "30-40", "40-50", "50-60", "60+"]


def _to_float(value, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(number) or math.isinf(number):
        return default
    return number


def _clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


def _series_score(repository, column: str, value: float, *, higher_is_better: bool = True) -> float:
    series = repository.get_numeric_series(column)
    if series.empty:
        return 0.0
    return percentile_score(value, series, higher_is_better=higher_is_better)


def _health_by_age_from_dataset(repository, row: dict) -> dict[str, float]:
    vaccination = (
        _series_score(repository, "hepatitis_b", _to_float(row.get("hepatitis_b")), higher_is_better=True)
        + _series_score(repository, "polio", _to_float(row.get("polio")), higher_is_better=True)
        + _series_score(repository, "diphtheria", _to_float(row.get("diphtheria")), higher_is_better=True)
    ) / 3.0

    adult_mortality = _series_score(repository, "adult_mortality", _to_float(row.get("adult_mortality")), higher_is_better=False)
    infant_deaths = _series_score(repository, "infant_deaths", _to_float(row.get("infant_deaths")), higher_is_better=False)
    under_five = _series_score(repository, "under_five_deaths", _to_float(row.get("under_five_deaths")), higher_is_better=False)
    hiv = _series_score(repository, "hiv_aids", _to_float(row.get("hiv_aids")), higher_is_better=False)
    bmi = _series_score(repository, "bmi", _to_float(row.get("bmi")), higher_is_better=True)

    age_scores = {
        "10-20": _clamp((vaccination * 0.50) + (infant_deaths * 0.25) + (bmi * 0.25)),
        "20-30": _clamp((vaccination * 0.40) + (bmi * 0.30) + (hiv * 0.30)),
        "30-40": _clamp((adult_mortality * 0.35) + (bmi * 0.25) + (hiv * 0.20) + (vaccination * 0.20)),
        "40-50": _clamp((adult_mortality * 0.45) + (hiv * 0.25) + (vaccination * 0.20) + (bmi * 0.10)),
        "50-60": _clamp((adult_mortality * 0.55) + (hiv * 0.25) + (vaccination * 0.15) + (bmi * 0.05)),
        "60+": _clamp((adult_mortality * 0.65) + (hiv * 0.20) + (vaccination * 0.10) + (bmi * 0.05)),
    }

    return {age: round(score, 1) for age, score in age_scores.items()}


@router.get("/map-data")
def get_map_data(
    year: int | None = Query(default=None, ge=1900, le=2100),
):
    repository = get_dataset_repository()
    frame = repository.frame.copy()

    if frame.empty or "country" not in frame.columns:
        return {"years": [], "selected_year": None, "data": {}}

    years: list[int] = []
    selected_year: int | None = None
    if "year" in frame.columns:
        year_series = pd.to_numeric(frame["year"], errors="coerce").dropna().astype(int)
        years = sorted(year_series.unique().tolist())
        selected_year = (
            year if year in years else (years[-1] if years else None)
        )
        if selected_year is not None:
            frame_year = pd.to_numeric(frame["year"], errors="coerce")
            frame = frame[frame_year == float(selected_year)]

    map_data: dict[str, dict] = {}

    for country, group in frame.groupby("country", sort=True):
        if not country:
            continue

        row = group.iloc[0]
        country_name = str(country).strip()
        row_year = int(_to_float(row.get("year"), 0)) if "year" in row else None

        life_value = _to_float(row.get("life_expectancy"), 0.0)
        if life_value <= 0:
            country_mean = repository.get_country_target_mean(country_name)
            life_value = country_mean if country_mean is not None else 0.0

        economy_result = analyze_economy(
            country=country_name,
            year=row_year,
            gdp=_to_float(row.get("gdp"), 0.0),
            income_composition_of_resources=_to_float(row.get("income_composition_of_resources"), 0.0),
            percentage_expenditure=_to_float(row.get("percentage_expenditure"), 0.0),
            total_expenditure=_to_float(row.get("total_expenditure"), 0.0),
            population=_to_float(row.get("population"), 0.0),
        )

        health_result = analyze_health(
            country=country_name,
            year=row_year,
            adult_mortality=_to_float(row.get("adult_mortality"), 0.0),
            infant_deaths=_to_float(row.get("infant_deaths"), 0.0),
            bmi=_to_float(row.get("bmi"), 0.0),
            hiv_aids=_to_float(row.get("hiv_aids"), 0.0),
            hepatitis_b=_to_float(row.get("hepatitis_b"), 0.0),
            polio=_to_float(row.get("polio"), 0.0),
            diphtheria=_to_float(row.get("diphtheria"), 0.0),
            under_five_deaths=_to_float(row.get("under_five_deaths"), 0.0),
        )

        social_result = analyze_social(
            country=country_name,
            year=row_year,
            schooling=_to_float(row.get("schooling"), 0.0),
            income_composition_of_resources=_to_float(row.get("income_composition_of_resources"), 0.0),
            alcohol=_to_float(row.get("alcohol"), 0.0),
            status=str(row.get("status") or "Developing"),
            population=_to_float(row.get("population"), 0.0),
        )

        age_scores = _health_by_age_from_dataset(repository, row.to_dict())

        map_data[country_name] = {
            "life": round(life_value, 1),
            "economy": round(_to_float(economy_result.get("score"), 0.0), 1),
            "social": round(_to_float(social_result.get("score"), 0.0), 1),
            "health": age_scores,
        }

    return {
        "years": years,
        "selected_year": selected_year,
        "data": map_data,
    }


@router.get("/map-years")
def get_map_years():
    repository = get_dataset_repository()
    frame = repository.frame

    if frame.empty or "year" not in frame.columns:
        return {"years": [], "selected_year": None}

    year_series = pd.to_numeric(frame["year"], errors="coerce").dropna()
    if year_series.empty:
        return {"years": [], "selected_year": None}

    years = sorted(year_series.astype(int).unique().tolist())
    return {
        "years": years,
        "selected_year": years[-1] if years else None,
    }
