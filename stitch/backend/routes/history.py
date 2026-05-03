from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth.security import get_current_user
from database import get_db
from models.prediction import Prediction
from models.user import User
from schemas.prediction import PredictionHistoryItem

router = APIRouter(tags=["history"])


@router.get("/history", response_model=list[PredictionHistoryItem])
def get_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Prediction)
        .filter(Prediction.user_id == current_user.id)
        .order_by(Prediction.created_at.desc())
        .all()
    )

    return [
        PredictionHistoryItem(
            id=row.id,
            created_at=row.created_at,
            input_payload=row.input_payload,
            predicted_life_expectancy=row.predicted_life_expectancy,
            confidence_score=row.confidence_score,
            clinical_insight=row.clinical_insight,
            status=row.status,
        )
        for row in rows
    ]


@router.delete("/history/{prediction_id}", response_model=dict)
def delete_history_item(
    prediction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Prediction)
        .filter(Prediction.id == prediction_id, Prediction.user_id == current_user.id)
        .first()
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History item not found",
        )

    db.delete(row)
    db.commit()

    return {"message": "History item deleted", "id": prediction_id}
