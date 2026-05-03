from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth.security import get_current_user
from database import get_db
from models.prediction import Prediction
from models.user import User
from schemas.prediction import (
    EconomyInput,
    EconomyResult,
    HealthInput,
    HealthResult,
    PredictionInput,
    PredictionResult,
    SavePredictionRequest,
    SocialInput,
    SocialResult,
)
from services.analysis import analyze_economy, analyze_health, analyze_social
from services.model_service import predict_life_expectancy

router = APIRouter(tags=["predict"])


@router.post("/predict", response_model=PredictionResult)
@router.post("/predict-life", response_model=PredictionResult)
def predict(
    payload: PredictionInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = predict_life_expectancy(
            payload,
            country=payload.country or current_user.country,
            year=payload.year,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    saved = Prediction(
        user_id=current_user.id,
        input_payload={**payload.model_dump(), "module": "life"},
        predicted_life_expectancy=result["prediction"],
        confidence_score=result["confidence_score"],
        clinical_insight=result["clinical_insight"],
        status=result["status"],
    )
    db.add(saved)
    db.commit()

    return PredictionResult(**result)


@router.post("/predict-economy", response_model=EconomyResult)
def predict_economy(
    payload: EconomyInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload_data = payload.model_dump(exclude={"country", "year"})
    result = analyze_economy(
        **payload_data,
        country=payload.country or current_user.country,
        year=payload.year,
    )

    saved = Prediction(
        user_id=current_user.id,
        input_payload={**payload.model_dump(), "module": "economy"},
        predicted_life_expectancy=result["score"],
        confidence_score=result["score"],
        clinical_insight=result["insight"],
        status=result["status"].lower(),
    )
    db.add(saved)
    db.commit()

    return EconomyResult(**result)


@router.post("/predict-health", response_model=HealthResult)
def predict_health(
    payload: HealthInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload_data = payload.model_dump(exclude={"country", "year"})
    result = analyze_health(
        **payload_data,
        country=payload.country or current_user.country,
        year=payload.year,
    )

    saved = Prediction(
        user_id=current_user.id,
        input_payload={**payload.model_dump(), "module": "health"},
        predicted_life_expectancy=result["score"],
        confidence_score=result["score"],
        clinical_insight=result["insight"],
        status=result["risk_level"].lower(),
    )
    db.add(saved)
    db.commit()

    return HealthResult(**result)


@router.post("/predict-social", response_model=SocialResult)
def predict_social(
    payload: SocialInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload_data = payload.model_dump(exclude={"country", "year"})
    result = analyze_social(
        **payload_data,
        country=payload.country or current_user.country,
        year=payload.year,
    )

    saved = Prediction(
        user_id=current_user.id,
        input_payload={**payload.model_dump(), "module": "social"},
        predicted_life_expectancy=result["score"],
        confidence_score=result["score"],
        clinical_insight=result["insight"],
        status=result["category"].lower(),
    )
    db.add(saved)
    db.commit()

    return SocialResult(**result)


@router.post("/save_prediction", response_model=dict)
def save_prediction(
    payload: SavePredictionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    saved = Prediction(
        user_id=current_user.id,
        input_payload={**payload.input_payload.model_dump(), "module": "life"},
        predicted_life_expectancy=payload.prediction,
        confidence_score=payload.confidence_score,
        clinical_insight=payload.clinical_insight,
        status=payload.status,
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)

    return {"message": "Prediction saved", "id": saved.id}
