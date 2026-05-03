from pydantic import BaseModel, EmailStr, Field


class FeedbackRequest(BaseModel):
    overall_rating: int = Field(ge=1, le=5)
    ease_of_use: int = Field(ge=1, le=5)
    features_used: str = Field(min_length=1, max_length=1000)
    comments: str = Field(min_length=1, max_length=2000)


class ContactRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=2000)


class ExperienceRequest(BaseModel):
    country_visited: str = Field(min_length=1, max_length=100)
    visit_duration: int = Field(ge=1, le=365)
    
    healthcare: int = Field(ge=1, le=5)
    nutrition: int = Field(ge=1, le=5)
    environment: int = Field(ge=1, le=5)
    safety: int = Field(ge=1, le=5)
    education: int = Field(ge=1, le=5)
    physical_activity: int = Field(ge=1, le=5)
    overall_experience: int = Field(ge=1, le=5)
    
    comments: str = Field(min_length=1, max_length=2000)


class FeedbackResponse(BaseModel):
    id: int
    user_id: int
    overall_rating: int
    ease_of_use: int
    features_used: str
    comments: str
    created_at: str

    class Config:
        from_attributes = True


class ContactResponse(BaseModel):
    id: int
    user_id: int | None
    name: str
    email: str
    subject: str
    message: str
    created_at: str

    class Config:
        from_attributes = True


class ExperienceResponse(BaseModel):
    id: int
    user_id: int
    country_visited: str
    visit_duration: int
    healthcare: int
    nutrition: int
    environment: int
    safety: int
    education: int
    physical_activity: int
    overall_experience: int
    comments: str
    created_at: str

    class Config:
        from_attributes = True
