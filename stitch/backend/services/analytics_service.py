from __future__ import annotations

from datetime import datetime


def _clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


def _normalize(value: float, minimum: float, maximum: float) -> float:
    if maximum == minimum:
        return 0.0
    return _clamp(((value - minimum) / (maximum - minimum)) * 100.0)


def _risk_from_score(score: float) -> str:
    if score >= 75:
        return "Low"
    if score >= 50:
        return "Medium"
    return "High"


def calculate_overall_score(
    *,
    life_expectancy_prediction: float,
    health_score: float | None = None,
    social_score: float | None = None,
):
    life_score = _normalize(life_expectancy_prediction, 35, 90)
    weighted_scores: list[tuple[float, float]] = [(life_score, 0.4)]

    if health_score is not None:
        weighted_scores.append((_clamp(health_score), 0.3))
    if social_score is not None:
        weighted_scores.append((_clamp(social_score), 0.3))

    weight_total = sum(weight for _, weight in weighted_scores) or 1.0
    overall_score = _clamp(
        sum(score * weight for score, weight in weighted_scores) / weight_total,
        0,
        100,
    )

    if overall_score >= 70:
        status = "Good"
    elif overall_score >= 45:
        status = "Average"
    else:
        status = "Poor"

    return {
        "overall_score": round(overall_score, 1),
        "status": status,
        "components": {
            "life_score": round(life_score, 1),
            "health_score": round(_clamp(health_score), 1) if health_score is not None else None,
            "social_score": round(_clamp(social_score), 1) if social_score is not None else None,
        },
    }


def calculate_economy_score(*, gdp: float, income_level: str, unemployment_rate: float, population: float):
    income_map = {
        "low": 30,
        "lower-middle": 46,
        "middle": 62,
        "upper-middle": 80,
        "high": 92,
    }

    gdp_score = _normalize(gdp, 500, 80000)
    income_score = income_map.get((income_level or "").lower(), 55)
    unemployment_score = _normalize(max(0.0, 30.0 - unemployment_rate), 0, 30)
    population_stability = _normalize(max(0.0, 2_000_000_000 - population), 0, 2_000_000_000)

    score = _clamp(
        (gdp_score * 0.35)
        + (income_score * 0.30)
        + (unemployment_score * 0.25)
        + (population_stability * 0.10)
    )

    if score >= 72:
        label = "Strong"
    elif score >= 45:
        label = "Growing"
    else:
        label = "Weak"

    return {
        "score": round(score, 1),
        "label": label,
        "components": {
            "gdp": round(gdp_score, 1),
            "income": round(float(income_score), 1),
            "employment": round(unemployment_score, 1),
            "population": round(population_stability, 1),
        },
        "explanation": (
            f"Economic strength is {label.lower()} mainly due to GDP, income profile, and unemployment balance."
        ),
    }


def calculate_health_score(*, bmi: float, disease_rate: float, nutrition_level: str, vaccination_coverage: float):
    nutrition_map = {
        "poor": 30,
        "fair": 50,
        "good": 72,
        "excellent": 90,
    }
    nutrition_score = nutrition_map.get((nutrition_level or "").lower(), 58)

    bmi_score = _normalize(max(0.0, 30 - abs(bmi - 22)), 0, 30)
    disease_score = _normalize(max(0.0, 100 - disease_rate), 0, 100)
    vaccination_score = _normalize(vaccination_coverage, 0, 100)

    base_score = (
        (nutrition_score * 0.30)
        + (bmi_score * 0.20)
        + (disease_score * 0.25)
        + (vaccination_score * 0.25)
    )

    age_modifiers = {
        "Child": 1.05,
        "Adult": 1.0,
        "Senior": 0.9,
    }

    groups = []
    for group, modifier in age_modifiers.items():
        score = _clamp(base_score * modifier)
        groups.append(
            {
                "group": group,
                "score": round(score, 1),
                "risk_level": _risk_from_score(score),
            }
        )

    average_score = sum(item["score"] for item in groups) / len(groups)

    return {
        "average_score": round(average_score, 1),
        "groups": groups,
        "explanation": "Health scores compare child, adult, and senior resilience using BMI, disease pressure, nutrition, and vaccination coverage.",
    }


def calculate_social_score(*, education_index: float, sanitation_access_percent: float, clean_water_access_percent: float, air_pollution_pm25: float):
    education_score = _normalize(education_index, 0, 1)
    sanitation_score = _normalize(sanitation_access_percent, 0, 100)
    water_score = _normalize(clean_water_access_percent, 0, 100)
    air_quality_score = _normalize(max(0.0, 150 - air_pollution_pm25), 0, 150)

    score = _clamp(
        (education_score * 0.35)
        + (sanitation_score * 0.25)
        + (water_score * 0.25)
        + (air_quality_score * 0.15)
    )

    if score >= 75:
        category = "Good"
    elif score >= 45:
        category = "Moderate"
    else:
        category = "Poor"

    return {
        "score": round(score, 1),
        "category": category,
        "dimensions": {
            "Education": round(education_score, 1),
            "Sanitation": round(sanitation_score, 1),
            "Clean Water": round(water_score, 1),
            "Air Quality": round(air_quality_score, 1),
        },
        "explanation": "Social development reflects access to education, sanitation, clean water, and cleaner air.",
    }


def generate_projection(*, past_values: list[float], current_year: int | None = None, future_year: int = 2035):
    year_now = current_year or datetime.utcnow().year

    cleaned = [float(v) for v in past_values if isinstance(v, (int, float))]
    if len(cleaned) < 3:
        cleaned = [64.8, 65.7, 66.9, 67.8, 68.6]

    start_year = year_now - (len(cleaned) - 1)
    points: list[dict] = []

    for index, value in enumerate(cleaned):
        yr = start_year + index
        point_type = "present" if index == len(cleaned) - 1 else "past"
        points.append({"year": yr, "value": round(value, 1), "type": point_type})

    deltas = [cleaned[i] - cleaned[i - 1] for i in range(1, len(cleaned))]
    trend = sum(deltas) / len(deltas) if deltas else 0.25

    current_value = cleaned[-1]
    for yr in range(year_now + 1, future_year + 1):
        current_value = _clamp(current_value + trend, 35, 95)
        points.append({"year": yr, "value": round(current_value, 1), "type": "future"})

    return {
        "points": points,
        "predicted_year": future_year,
        "predicted_value": points[-1]["value"],
        "explanation": "Projection follows recent trend direction from past records and extends it smoothly into future years.",
    }


def generate_recommendations(*, overall_score: float, economy_score: float, health_score: float, social_score: float):
    overall_score = _clamp(overall_score)
    economy_score = _clamp(economy_score)
    health_score = _clamp(health_score)
    social_score = _clamp(social_score)

    if overall_score >= 75:
        risk = "Low"
    elif overall_score >= 50:
        risk = "Medium"
    else:
        risk = "High"

    recommendations: list[str] = []

    if health_score < 65:
        recommendations.append("Improve healthcare access and preventive screening coverage.")
    if social_score < 65:
        recommendations.append("Increase education and sanitation investments in vulnerable areas.")
    if economy_score < 65:
        recommendations.append("Promote stable employment and income-support policies.")
    if social_score < 70:
        recommendations.append("Reduce air pollution and expand clean water infrastructure.")

    if not recommendations:
        recommendations.extend(
            [
                "Maintain current healthcare and social protection quality.",
                "Keep monitoring early-warning risk indicators quarterly.",
            ]
        )

    return {
        "risk": risk,
        "recommendations": recommendations,
        "summary": (
            f"Overall risk is {risk.lower()} based on combined wellness, economic, health, and social performance."
        ),
    }
