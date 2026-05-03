from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth.security import create_access_token, get_password_hash, verify_password
from database import get_db
from models.user import User
from schemas.token import Token
from schemas.user import LoginRequest, SignupRequest

router = APIRouter(tags=["auth"])


@router.post("/signup", response_model=Token)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        age=payload.age,
        gender=payload.gender,
        country=payload.country,
        height_cm=payload.height_cm,
        weight_kg=payload.weight_kg,
        smoking_status=payload.smoking_status,
        alcohol_consumption=payload.alcohol_consumption,
        physical_activity=payload.physical_activity,
        education_level=payload.education_level,
        occupation=payload.occupation,
        income_range=payload.income_range,
        user_role=payload.user_role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.email})
    return Token(access_token=token)


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token({"sub": user.email})
    return Token(access_token=token)
