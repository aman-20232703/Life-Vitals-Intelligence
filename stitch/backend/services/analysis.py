from __future__ import annotations

from backend.services.data_service import get_dataset_repository, percentile_score


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _normalize(value: float, minimum: float, maximum: float) -> float:
    if maximum == minimum:
        return 0.0
    return _clamp((value - minimum) / (maximum - minimum), 0.0, 1.0)


def _series_score(column: str, value: float, *, higher_is_better: bool = True) -> float:
    repository = get_dataset_repository()
    series = repository.get_numeric_series(column)
    if not series.empty:
        return percentile_score(value, series, higher_is_better=higher_is_better)

    if higher_is_better:
        return _normalize(value, 0, max(value, 1.0)) * 100.0
    return (1 - _normalize(value, 0, max(value, 1.0))) * 100.0


def analyze_economy(
    *,
    gdp: float,
    income_composition_of_resources: float,
    percentage_expenditure: float,
    total_expenditure: float,
    population: float,
    country: str | None = None,
    year: int | None = None,
):
    repository = get_dataset_repository()
    context = repository.get_context(country=country, year=year)

    gdp_score = _series_score("gdp", gdp, higher_is_better=True)
    income_score = _series_score("income_composition_of_resources", income_composition_of_resources, higher_is_better=True)
    percentage_exp_score = _series_score("percentage_expenditure", percentage_expenditure, higher_is_better=True)
    total_exp_score = _series_score("total_expenditure", total_expenditure, higher_is_better=True)
    population_score = _series_score("population", population, higher_is_better=False)

    score = _clamp(
        (gdp_score * 0.30)
        + (income_score * 0.30)
        + (percentage_exp_score * 0.15)
        + (total_exp_score * 0.15)
        + (population_score * 0.10),
        0,
        100,
    )

    if score >= 75:
        status = "Advanced"
    elif score >= 50:
        status = "Stable"
    else:
        status = "Developing"

    context_label = "global dataset"
    if context.match_level == "country-year":
        context_label = f"{context.country} {context.year} data"
    elif context.match_level == "country":
        context_label = f"{context.country} country data"
    elif context.match_level == "year":
        context_label = f"{context.year} year data"

    insight = (
        f"Economic score: {score:.1f}/100\n"
        f"Status: {status}\n"
        f"Main support: GDP, income composition, and health spending indicators are the strongest positive signals\n"
        f"Main pressure: high population pressure can dilute per-capita resource impact\n"
        f"Context note: the score is anchored to {context_label} when a country or year filter is supplied\n"
        f"Takeaway: the economy appears {status.lower()}, with the biggest improvement potential coming from inclusive growth and sustained social spending."
    )

    return {
        "score": round(score, 1),
        "status": status,
        "insight": insight,
    }


def analyze_health(
    *,
    adult_mortality: float,
    infant_deaths: float,
    bmi: float,
    hiv_aids: float,
    hepatitis_b: float,
    polio: float,
    diphtheria: float,
    under_five_deaths: float,
    country: str | None = None,
    year: int | None = None,
):
    repository = get_dataset_repository()
    context = repository.get_context(country=country, year=year)

    adult_mortality_score = _series_score("adult_mortality", adult_mortality, higher_is_better=False)
    infant_deaths_score = _series_score("infant_deaths", infant_deaths, higher_is_better=False)
    bmi_score = _series_score("bmi", bmi, higher_is_better=True)
    hiv_score = _series_score("hiv_aids", hiv_aids, higher_is_better=False)
    hep_score = _series_score("hepatitis_b", hepatitis_b, higher_is_better=True)
    polio_score = _series_score("polio", polio, higher_is_better=True)
    diphtheria_score = _series_score("diphtheria", diphtheria, higher_is_better=True)
    under_five_score = _series_score("under_five_deaths", under_five_deaths, higher_is_better=False)

    vaccination_score = (hep_score + polio_score + diphtheria_score) / 3.0

    score = _clamp(
        (adult_mortality_score * 0.20)
        + (infant_deaths_score * 0.15)
        + (under_five_score * 0.15)
        + (hiv_score * 0.15)
        + (bmi_score * 0.10)
        + (vaccination_score * 0.25),
        0,
        100,
    )

    if score >= 75:
        risk = "Low"
    elif score >= 50:
        risk = "Medium"
    else:
        risk = "High"

    context_label = "global dataset"
    if context.match_level == "country-year":
        context_label = f"{context.country} {context.year} data"
    elif context.match_level == "country":
        context_label = f"{context.country} country data"
    elif context.match_level == "year":
        context_label = f"{context.year} year data"

    insight = (
        f"Health score: {score:.1f}/100\n"
        f"Risk level: {risk}\n"
        f"Protective factors: higher vaccination coverage and healthy BMI are improving the score\n"
        f"Risk factors: mortality indicators, HIV/AIDS burden, and under-five deaths are reducing the score\n"
        f"Context note: the score is anchored to {context_label} when a country or year filter is supplied\n"
        f"Takeaway: the best gains are likely from reducing mortality burden and preserving strong immunization coverage."
    )

    return {
        "score": round(score, 1),
        "risk_level": risk,
        "insight": insight,
    }


def analyze_social(
    *,
    schooling: float,
    income_composition_of_resources: float,
    alcohol: float,
    status: str,
    population: float,
    country: str | None = None,
    year: int | None = None,
):
    repository = get_dataset_repository()
    context = repository.get_context(country=country, year=year)

    schooling_score = _series_score("schooling", schooling, higher_is_better=True)
    income_score = _series_score("income_composition_of_resources", income_composition_of_resources, higher_is_better=True)
    alcohol_score = _series_score("alcohol", alcohol, higher_is_better=False)
    population_score = _series_score("population", population, higher_is_better=False)

    status_map = {
        "developed": 85.0,
        "developing": 55.0,
    }
    status_score = status_map.get((status or "").strip().lower(), 60.0)

    score = _clamp(
        (schooling_score * 0.35)
        + (income_score * 0.30)
        + (status_score * 0.20)
        + (alcohol_score * 0.10)
        + (population_score * 0.05),
        0,
        100,
    )

    if score >= 75:
        category = "Good"
    elif score >= 45:
        category = "Moderate"
    else:
        category = "Poor"

    context_label = "global dataset"
    if context.match_level == "country-year":
        context_label = f"{context.country} {context.year} data"
    elif context.match_level == "country":
        context_label = f"{context.country} country data"
    elif context.match_level == "year":
        context_label = f"{context.year} year data"

    insight = (
        f"Social development score: {score:.1f}/100\n"
        f"Category: {category}\n"
        f"Strong areas: schooling, social resource composition, and development status are lifting the score\n"
        f"Weak areas: high alcohol burden and population pressure are pulling the score down\n"
        f"Context note: the score is anchored to {context_label} when a country or year filter is supplied\n"
        f"Takeaway: the community is {category.lower()} overall, with meaningful gains likely from improving education and social-resource quality."
    )

    return {
        "score": round(score, 1),
        "category": category,
        "insight": insight,
    }
