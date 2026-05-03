from datetime import datetime

from pydantic import BaseModel, Field


class PredictionInput(BaseModel):
    year: int = Field(ge=1900, le=2100)
    country: str | None = None
    adult_mortality: float = Field(ge=0)
    infant_deaths: float = Field(ge=0)
    alcohol: float = Field(ge=0)
    gdp: float = Field(ge=0)
    bmi: float = Field(ge=0)
    schooling: float = Field(ge=0)
    hiv_aids: float = Field(ge=0)


class PredictionResult(BaseModel):
    prediction: float
    confidence_score: float
    clinical_insight: str
    status: str


class EconomyInput(BaseModel):
    country: str | None = None
    year: int | None = None
    gdp: float = Field(ge=0)
    income_composition_of_resources: float = Field(ge=0, le=1)
    percentage_expenditure: float = Field(ge=0)
    total_expenditure: float = Field(ge=0)
    population: float = Field(ge=0)


class EconomyResult(BaseModel):
    score: float
    status: str
    insight: str


class HealthInput(BaseModel):
    country: str | None = None
    year: int | None = None
    adult_mortality: float = Field(ge=0)
    infant_deaths: float = Field(ge=0)
    bmi: float = Field(ge=0)
    hiv_aids: float = Field(ge=0)
    hepatitis_b: float = Field(ge=0, le=100)
    polio: float = Field(ge=0, le=100)
    diphtheria: float = Field(ge=0, le=100)
    under_five_deaths: float = Field(ge=0)


class HealthResult(BaseModel):
    score: float
    risk_level: str
    insight: str


class SocialInput(BaseModel):
    country: str | None = None
    year: int | None = None
    schooling: float = Field(ge=0)
    income_composition_of_resources: float = Field(ge=0, le=1)
    alcohol: float = Field(ge=0)
    status: str
    population: float = Field(ge=0)


class SocialResult(BaseModel):
    score: float
    category: str
    insight: str


class SavePredictionRequest(BaseModel):
    input_payload: PredictionInput
    prediction: float
    confidence_score: float
    clinical_insight: str
    status: str = "normal"


class PredictionHistoryItem(BaseModel):
    id: int
    created_at: datetime
    input_payload: dict
    predicted_life_expectancy: float
    confidence_score: float
    clinical_insight: str
    status: str
