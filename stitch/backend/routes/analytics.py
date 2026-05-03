from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth.security import get_current_user
from database import get_db
from models.prediction import Prediction
from models.user import User
from services.analytics_service import (
    calculate_economy_score,
    calculate_health_score,
    calculate_overall_score,
    calculate_social_score,
    generate_projection,
    generate_recommendations,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


class EconomyAnalyticsRequest(BaseModel):
    gdp: float = Field(ge=0)
    income_level: str
    unemployment_rate: float = Field(ge=0)
    population: float = Field(ge=0)


class HealthAnalyticsRequest(BaseModel):
    bmi: float = Field(ge=0)
    disease_rate: float = Field(ge=0)
    nutrition_level: str
    vaccination_coverage: float = Field(ge=0, le=100)


class SocialAnalyticsRequest(BaseModel):
    education_index: float = Field(ge=0, le=1)
    sanitation_access_percent: float = Field(ge=0, le=100)
    clean_water_access_percent: float = Field(ge=0, le=100)
    air_pollution_pm25: float = Field(ge=0)


class RiskAnalyticsRequest(BaseModel):
    overall_score: float = Field(ge=0, le=100)
    economy_score: float = Field(ge=0, le=100)
    health_score: float = Field(ge=0, le=100)
    social_score: float = Field(ge=0, le=100)


def _latest_module_score(rows: list[Prediction], module_name: str, default: float):
    for row in rows:
        module = str((row.input_payload or {}).get("module", "life")).lower()
        if module == module_name:
            return float(row.predicted_life_expectancy)
    return float(default)


@router.get("/overall")
def get_overall_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Prediction)
        .filter(Prediction.user_id == current_user.id)
        .order_by(Prediction.created_at.desc())
        .all()
    )

    life_prediction = _latest_module_score(rows, "life", 68.0)
    health_score = _latest_module_score(rows, "health", 62.0)
    social_score = _latest_module_score(rows, "social", 60.0)

    result = calculate_overall_score(
        life_expectancy_prediction=life_prediction,
        health_score=health_score,
        social_score=social_score,
    )
    result["inputs"] = {
        "life_expectancy_prediction": round(life_prediction, 1),
        "health_score": round(health_score, 1),
        "social_score": round(social_score, 1),
    }
    return result


@router.post("/economy")
def post_economy_analytics(
    payload: EconomyAnalyticsRequest,
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return calculate_economy_score(**payload.model_dump())


@router.post("/health")
def post_health_analytics(
    payload: HealthAnalyticsRequest,
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return calculate_health_score(**payload.model_dump())


@router.post("/social")
def post_social_analytics(
    payload: SocialAnalyticsRequest,
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return calculate_social_score(**payload.model_dump())


@router.get("/projection")
def get_projection_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Prediction)
        .filter(Prediction.user_id == current_user.id)
        .order_by(Prediction.created_at.asc())
        .all()
    )

    life_values = [
        float(row.predicted_life_expectancy)
        for row in rows
        if str((row.input_payload or {}).get("module", "life")).lower() == "life"
    ]

    current_year = datetime.utcnow().year
    return generate_projection(
        past_values=life_values[-8:],
        current_year=current_year,
        future_year=2035,
    )


@router.post("/risk")
def post_risk_analytics(
    payload: RiskAnalyticsRequest,
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return generate_recommendations(**payload.model_dump())
