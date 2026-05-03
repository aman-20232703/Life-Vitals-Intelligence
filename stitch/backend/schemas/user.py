from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

    age: int = Field(ge=1, le=120)
    gender: str
    country: str

    height_cm: int = Field(ge=50, le=250)
    weight_kg: int = Field(ge=20, le=400)
    smoking_status: str
    alcohol_consumption: str
    physical_activity: str

    education_level: str
    occupation: str
    income_range: str
    user_role: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    age: int
    gender: str
    country: str
    height_cm: int
    weight_kg: int
    smoking_status: str
    alcohol_consumption: str
    physical_activity: str
    education_level: str
    occupation: str
    income_range: str
    user_role: str


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    age: int | None = Field(default=None, ge=1, le=120)
    gender: str | None = None
    country: str | None = None
    height_cm: int | None = Field(default=None, ge=50, le=250)
    weight_kg: int | None = Field(default=None, ge=20, le=400)
    smoking_status: str | None = None
    alcohol_consumption: str | None = None
    physical_activity: str | None = None
    education_level: str | None = None
    occupation: str | None = None
    income_range: str | None = None
    user_role: str | None = None
