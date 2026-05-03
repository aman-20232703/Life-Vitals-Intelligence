from __future__ import annotations

from datetime import datetime
from typing import Any

from backend.services.analytics_service import calculate_overall_score
from backend.services.data_service import get_dataset_repository, safe_float


def _clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


def _normalize(value: float, minimum: float, maximum: float) -> float:
    if maximum == minimum:
        return 0.0
    return _clamp(((value - minimum) / (maximum - minimum)) * 100.0)


def _module_rows(rows: list[Any], module: str):
    filtered = [
        row for row in rows
        if str((row.input_payload or {}).get("module", "life")).lower() == module
    ]
    return sorted(filtered, key=lambda row: row.created_at, reverse=True)


def _latest(rows: list[Any], module: str):
    module_rows = _module_rows(rows, module)
    return module_rows[0] if module_rows else None


def _module_value(row: Any | None, default: float) -> float:
    if row is None:
        return default
    return float(row.predicted_life_expectancy)


def _source_payload(row: Any | None, context_row: dict[str, Any] | None) -> dict[str, Any]:
    if row is not None:
        return dict(row.input_payload or {})
    return dict(context_row or {})


def _reference_value(
    row: Any | None,
    context_value: float | None,
    fallback: float | None,
) -> float | None:
    if row is not None:
        return float(row.predicted_life_expectancy)
    if context_value is not None:
        return float(context_value)
    if fallback is not None:
        return float(fallback)
    return None


def _life_factor_rankings(payload: dict[str, Any]) -> list[dict[str, Any]]:
    adult_mortality = float(payload.get("adult_mortality", 0) or 0)
    infant_deaths = float(payload.get("infant_deaths", 0) or 0)
    alcohol = float(payload.get("alcohol", 0) or 0)
    gdp = float(payload.get("gdp", 0) or 0)
    bmi = float(payload.get("bmi", 0) or 0)
    schooling = float(payload.get("schooling", 0) or 0)
    hiv_aids = float(payload.get("hiv_aids", 0) or 0)

    healthy_bmi_score = _normalize(30 - abs(bmi - 22), 0, 30)
    school_score = _normalize(schooling, 0, 18)
    gdp_score = _normalize(gdp, 0, 40000)
    mortality_score = _normalize(400 - adult_mortality, 0, 400)
    infant_score = _normalize(120 - infant_deaths, 0, 120)
    alcohol_score = _normalize(12 - alcohol, 0, 12)
    hiv_score = _normalize(10 - hiv_aids, 0, 10)

    factors = [
        {
            "label": "Schooling",
            "direction": "↑" if schooling >= 12 else "↓",
            "score": school_score,
            "reason": "Higher schooling improves health literacy and preventive care use.",
        },
        {
            "label": "GDP",
            "direction": "↑" if gdp >= 12000 else "↓",
            "score": gdp_score,
            "reason": "Higher GDP usually means better healthcare access and living conditions.",
        },
        {
            "label": "Adult Mortality",
            "direction": "↓" if adult_mortality > 150 else "↑",
            "score": mortality_score,
            "reason": "Adult mortality is a direct pressure on life expectancy outcomes.",
        },
        {
            "label": "Infant Deaths",
            "direction": "↓" if infant_deaths > 20 else "↑",
            "score": infant_score,
            "reason": "Infant deaths reflect early-life healthcare quality and public health strength.",
        },
        {
            "label": "BMI",
            "direction": "↑" if 18.5 <= bmi <= 25 else "↓",
            "score": healthy_bmi_score,
            "reason": "BMI outside the healthy range can weaken long-term health resilience.",
        },
        {
            "label": "Alcohol",
            "direction": "↓" if alcohol > 5 else "↑",
            "score": alcohol_score,
            "reason": "High alcohol burden increases chronic risk and can lower longevity.",
        },
        {
            "label": "HIV/AIDS",
            "direction": "↓" if hiv_aids > 1 else "↑",
            "score": hiv_score,
            "reason": "HIV/AIDS burden strongly affects longevity when treatment access is limited.",
        },
    ]

    return sorted(factors, key=lambda item: item["score"], reverse=True)[:3]


def _build_alerts(life_payload: dict[str, Any], health_payload: dict[str, Any], social_payload: dict[str, Any]) -> list[dict[str, str]]:
    alerts: list[dict[str, str]] = []
    adult_mortality = safe_float(life_payload.get("adult_mortality"), 0.0)
    infant_deaths = safe_float(life_payload.get("infant_deaths"), 0.0)
    schooling = safe_float(life_payload.get("schooling"), 0.0)
    hep = safe_float(health_payload.get("hepatitis_b"), 0.0)
    polio = safe_float(health_payload.get("polio"), 0.0)
    diphtheria = safe_float(health_payload.get("diphtheria"), 0.0)
    vaccination = (hep + polio + diphtheria) / 3.0 if (hep or polio or diphtheria) else 0.0
    alcohol = safe_float(social_payload.get("alcohol"), 0.0)
    income_composition = safe_float(social_payload.get("income_composition_of_resources"), 0.0)

    if adult_mortality > 180:
        alerts.append({"severity": "danger", "text": "High mortality risk: adult mortality is elevated and needs priority attention."})
    if infant_deaths > 20:
        alerts.append({"severity": "warning", "text": "Infant death levels are still high and may reflect gaps in maternal care."})
    if schooling < 10:
        alerts.append({"severity": "warning", "text": "Low schooling can slow long-term health improvement and prevention awareness."})
    if vaccination < 80:
        alerts.append({"severity": "warning", "text": "Vaccination coverage is below a safe public-health threshold."})
    if income_composition < 0.55:
        alerts.append({"severity": "warning", "text": "Income composition is weak, which may limit social and health resilience."})
    if alcohol > 5:
        alerts.append({"severity": "danger", "text": "Alcohol burden is high and can worsen long-term social and health outcomes."})

    if not alerts:
        alerts.append({"severity": "good", "text": "No major alerts detected. Current indicators are broadly stable."})

    return alerts[:4]


def _build_change(rows: list[Any]) -> dict[str, Any]:
    life_rows = _module_rows(rows, "life")
    if len(life_rows) < 2:
        return {
            "delta_years": 0.0,
            "trend": "stable",
            "label": "Not enough history yet to compare the last two predictions.",
            "reasons": [],
        }

    latest = life_rows[0]
    previous = life_rows[1]
    delta = float(latest.predicted_life_expectancy - previous.predicted_life_expectancy)

    latest_input = latest.input_payload or {}
    previous_input = previous.input_payload or {}
    reasons: list[str] = []

    if float(latest_input.get("gdp", 0) or 0) > float(previous_input.get("gdp", 0) or 0):
        reasons.append("GDP increased")
    if float(latest_input.get("schooling", 0) or 0) > float(previous_input.get("schooling", 0) or 0):
        reasons.append("Schooling improved")
    if float(latest_input.get("adult_mortality", 0) or 0) < float(previous_input.get("adult_mortality", 0) or 0):
        reasons.append("Adult mortality reduced")
    if float(latest_input.get("hiv_aids", 0) or 0) < float(previous_input.get("hiv_aids", 0) or 0):
        reasons.append("HIV/AIDS burden reduced")
    if float(latest_input.get("alcohol", 0) or 0) < float(previous_input.get("alcohol", 0) or 0):
        reasons.append("Alcohol burden reduced")

    if not reasons:
        reasons.append("No major input changes detected")

    if delta > 0.05:
        trend = "improved"
        label = f"+{delta:.1f} years improvement since the last prediction."
    elif delta < -0.05:
        trend = "declined"
        label = f"{delta:.1f} years decline since the last prediction."
    else:
        trend = "stable"
        label = "Life expectancy is stable compared with the last prediction."

    return {
        "delta_years": round(delta, 1),
        "trend": trend,
        "label": label,
        "reasons": reasons[:3],
    }


def calculate_dashboard_summary(rows: list[Any], *, country: str | None = None, year: int | None = None) -> dict[str, Any]:
    repository = get_dataset_repository()
    life_row = _latest(rows, "life")
    health_row = _latest(rows, "health")
    social_row = _latest(rows, "social")
    context = repository.get_context(country=country, year=year)

    life_payload = _source_payload(life_row, context.row)
    health_payload = _source_payload(health_row, context.row)
    social_payload = _source_payload(social_row, context.row)

    context_life_mean = repository.get_country_target_mean(country)
    if context_life_mean is None:
        context_life_mean = repository.get_global_target_mean()

    life_value = _reference_value(life_row, context_life_mean, None)
    health_value = _module_value(health_row, safe_float(health_payload.get("score"), 0.0)) if health_row else None
    social_value = _module_value(social_row, safe_float(social_payload.get("score"), 0.0)) if social_row else None

    if life_value is None and health_value is None and social_value is None:
        return {
            "overall_score": None,
            "status": "Unavailable",
            "last_prediction": None,
            "confidence_score": None,
            "total_predictions": len(rows),
            "latest_created_at": life_row.created_at.isoformat() if life_row else None,
            "module_scores": {
                "life": None,
                "health": None,
                "social": None,
            },
            "data_source": context.match_level,
        }

    if life_value is None:
        life_value = 0.0

    overall = calculate_overall_score(
        life_expectancy_prediction=life_value,
        health_score=health_value,
        social_score=social_value,
    )

    return {
        "overall_score": overall["overall_score"],
        "status": overall["status"],
        "last_prediction": round(life_value, 1),
        "confidence_score": round(float(life_row.confidence_score), 1) if life_row else 0.0,
        "total_predictions": len(rows),
        "latest_created_at": life_row.created_at.isoformat() if life_row else None,
        "module_scores": {
            "life": round(life_value, 1),
            "health": round(health_value, 1) if health_value is not None else None,
            "social": round(social_value, 1) if social_value is not None else None,
        },
        "data_source": context.match_level,
    }


def generate_dashboard_insights(rows: list[Any], *, country: str | None = None, year: int | None = None) -> dict[str, Any]:
    repository = get_dataset_repository()
    life_row = _latest(rows, "life")
    health_row = _latest(rows, "health")
    social_row = _latest(rows, "social")
    context = repository.get_context(country=country, year=year)

    life_input = _source_payload(life_row, context.row)
    factors = _life_factor_rankings(life_input)

    if not repository.has_data and not life_row and not health_row and not social_row:
        return {
            "today_insight": "No WHO or UN dataset is loaded yet. Add real CSV or Excel files to backend/data to generate factor insights.",
            "top_factors": [],
            "alerts": [
                {
                    "severity": "warning",
                    "text": "No dataset loaded yet, so the dashboard cannot generate data-backed insights.",
                }
            ],
            "change": {
                "delta_years": 0.0,
                "trend": "stable",
                "label": "No prediction history is available yet.",
                "reasons": [],
            },
            "data_source": "unavailable",
        }

    strong = factors[0]["label"] if factors else "Dataset context"
    risk_factors = [
        ("Adult Mortality", float(life_input.get("adult_mortality", 0) or 0)),
        ("Infant Deaths", float(life_input.get("infant_deaths", 0) or 0)),
        ("HIV/AIDS", float(life_input.get("hiv_aids", 0) or 0)),
        ("Alcohol", float(life_input.get("alcohol", 0) or 0)),
    ]
    if any(score > 0 for _, score in risk_factors):
        weak = max(risk_factors, key=lambda item: item[1])[0]
        today_insight = f"{strong} is the strongest factor improving life expectancy, while {weak} is the main area holding it back."
    else:
        today_insight = "No strong risk signal is available yet. Load a real dataset or add a prediction history entry to see factor-level insights."

    return {
        "today_insight": today_insight,
        "top_factors": factors,
        "alerts": _build_alerts(life_input, _source_payload(health_row, context.row), _source_payload(social_row, context.row)),
        "change": _build_change(rows),
        "data_source": context.match_level,
    }


def compare_with_global_average(rows: list[Any], *, country: str | None = None, year: int | None = None) -> dict[str, Any]:
    repository = get_dataset_repository()
    life_row = _latest(rows, "life")
    context = repository.get_context(country=country, year=year)
    current = _reference_value(life_row, repository.get_country_target_mean(country), repository.get_global_target_mean())
    global_average = repository.get_global_target_mean()

    if current is None or global_average is None:
        return {
            "user_prediction": round(current, 1) if current is not None else None,
            "global_average": global_average,
            "difference": None,
            "status": "Unavailable",
            "text": "No dataset average is available yet. Add WHO/UN CSV or Excel files to backend/data.",
            "data_source": context.match_level,
        }

    difference = round(current - global_average, 1)

    if difference > 0.05:
        status = "Above Average"
        comparison_text = f"Your latest life expectancy prediction is {abs(difference):.1f} years above the global average."
    elif difference < -0.05:
        status = "Below Average"
        comparison_text = f"Your latest life expectancy prediction is {abs(difference):.1f} years below the global average."
    else:
        status = "On Average"
        comparison_text = "Your latest life expectancy prediction is very close to the global average."

    return {
        "user_prediction": round(current, 1),
        "global_average": round(global_average, 1),
        "difference": difference,
        "status": status,
        "text": comparison_text,
        "data_source": context.match_level,
    }


def generate_dashboard_recommendations(rows: list[Any], *, country: str | None = None, year: int | None = None) -> dict[str, Any]:
    repository = get_dataset_repository()
    life_row = _latest(rows, "life")
    health_row = _latest(rows, "health")
    social_row = _latest(rows, "social")
    context = repository.get_context(country=country, year=year)

    life_input = _source_payload(life_row, context.row)
    health_input = _source_payload(health_row, context.row)
    social_input = _source_payload(social_row, context.row)

    if not repository.has_data and not life_row and not health_row and not social_row:
        return {
            "summary": "No real dataset is loaded yet.",
            "recommendations": [
                "Add WHO or UN CSV/Excel files to backend/data.",
                "Train model.pkl from the loaded dataset before calling prediction endpoints.",
                "Revisit the dashboard once the dataset is available so the recommendations reflect real data.",
            ],
            "data_source": "unavailable",
        }

    recommendations: list[str] = []

    vaccination = (
        float(health_input.get("hepatitis_b", 0) or 0)
        + float(health_input.get("polio", 0) or 0)
        + float(health_input.get("diphtheria", 0) or 0)
    ) / 3.0

    if float(life_input.get("adult_mortality", 0) or 0) > 180 or float(health_input.get("under_five_deaths", 0) or 0) > 20:
        recommendations.append("Improve healthcare access and preventive screening coverage.")
    if float(life_input.get("schooling", 0) or 0) < 10:
        recommendations.append("Increase education support because schooling strongly improves long-term outcomes.")
    if float(social_input.get("income_composition_of_resources", 0) or 0) < 0.55:
        recommendations.append("Improve social-resource equity through inclusive income and protection policies.")
    if float(social_input.get("alcohol", 0) or 0) > 5 or vaccination < 80:
        recommendations.append("Strengthen prevention programs for alcohol-related and vaccine-preventable risks.")

    if not recommendations:
        recommendations.extend(
            [
                "Maintain current health programs and monitor early warning indicators.",
                "Keep education, nutrition, and social infrastructure investments steady.",
                "Review prediction trends monthly so small declines are caught early.",
            ]
        )

    return {
        "summary": "Recommendations are based on the latest prediction patterns and current risk signals.",
        "recommendations": recommendations[:3],
        "data_source": context.match_level,
    }
