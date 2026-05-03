from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth.security import get_current_user
from database import get_db
from models.user import User
from models.feedback import Feedback, Contact, Experience
from schemas.feedback import (
    FeedbackRequest,
    ContactRequest,
    ExperienceRequest,
    FeedbackResponse,
    ContactResponse,
    ExperienceResponse,
)

router = APIRouter(tags=["feedback"])


@router.post("/feedback", response_model=FeedbackResponse)
def submit_feedback(
    payload: FeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit website feedback"""
    feedback = Feedback(
        user_id=current_user.id,
        overall_rating=payload.overall_rating,
        ease_of_use=payload.ease_of_use,
        features_used=payload.features_used,
        comments=payload.comments,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


@router.post("/contact", response_model=ContactResponse)
def submit_contact(
    payload: ContactRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit contact form"""
    contact = Contact(
        user_id=current_user.id,
        name=payload.name,
        email=payload.email,
        subject=payload.subject,
        message=payload.message,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.post("/experience", response_model=ExperienceResponse)
def submit_experience(
    payload: ExperienceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit travel experience and ratings"""
    experience = Experience(
        user_id=current_user.id,
        country_visited=payload.country_visited,
        visit_duration=payload.visit_duration,
        healthcare=payload.healthcare,
        nutrition=payload.nutrition,
        environment=payload.environment,
        safety=payload.safety,
        education=payload.education,
        physical_activity=payload.physical_activity,
        overall_experience=payload.overall_experience,
        comments=payload.comments,
    )
    db.add(experience)
    db.commit()
    db.refresh(experience)
    return experience
