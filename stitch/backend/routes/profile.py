from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.auth.security import get_current_user
from backend.database import get_db
from backend.models.user import User
from backend.schemas.user import ProfileResponse, ProfileUpdateRequest

router = APIRouter(tags=["profile"])


def _to_profile(user: User) -> ProfileResponse:
    return ProfileResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        age=user.age,
        gender=user.gender,
        country=user.country,
        height_cm=user.height_cm,
        weight_kg=user.weight_kg,
        smoking_status=user.smoking_status,
        alcohol_consumption=user.alcohol_consumption,
        physical_activity=user.physical_activity,
        education_level=user.education_level,
        occupation=user.occupation,
        income_range=user.income_range,
        user_role=user.user_role,
    )


@router.get("/profile", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return _to_profile(current_user)


@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updates = payload.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(current_user, field, value)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return _to_profile(current_user)
