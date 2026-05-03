from fastapi import APIRouter, Depends
from datetime import datetime
from sqlalchemy.orm import Session

from auth.security import get_current_user
from database import get_db
from models.prediction import Prediction
from models.user import User
from services.dashboard_service import (
    calculate_dashboard_summary,
    compare_with_global_average,
    generate_dashboard_insights,
    generate_dashboard_recommendations,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _query_user_predictions(db: Session, user_id: int):
    return (
        db.query(Prediction)
        .filter(Prediction.user_id == user_id)
        .order_by(Prediction.created_at.desc())
        .all()
    )


@router.get("/summary")
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = _query_user_predictions(db, current_user.id)
    summary = calculate_dashboard_summary(rows, country=current_user.country, year=datetime.utcnow().year)
    summary["user_name"] = current_user.full_name
    return summary


@router.get("/insights")
def get_dashboard_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = _query_user_predictions(db, current_user.id)
    return generate_dashboard_insights(rows, country=current_user.country, year=datetime.utcnow().year)


@router.get("/comparison")
def get_dashboard_comparison(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = _query_user_predictions(db, current_user.id)
    return compare_with_global_average(rows, country=current_user.country, year=datetime.utcnow().year)


@router.get("/recommendations")
def get_dashboard_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = _query_user_predictions(db, current_user.id)
    return generate_dashboard_recommendations(rows, country=current_user.country, year=datetime.utcnow().year)
