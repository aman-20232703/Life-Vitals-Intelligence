from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routes.auth import router as auth_router
from routes.analytics import router as analytics_router
from routes.dashboard import router as dashboard_router
from routes.history import router as history_router
from routes.map import router as map_router
from routes.predict import router as predict_router
from routes.profile import router as profile_router
from routes.feedback import router as feedback_router
from services.data_service import get_dataset_repository
from services.model_service import load_model_bundle

# Ensure SQLAlchemy models are imported before table creation.
from backend import models  # noqa: F401

app = FastAPI(title="LifeVitals API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(predict_router)
app.include_router(history_router)
app.include_router(analytics_router)
app.include_router(dashboard_router)
app.include_router(map_router)
app.include_router(feedback_router)


@app.on_event("startup")
def load_ml_assets():
    get_dataset_repository()
    try:
        load_model_bundle()
    except RuntimeError:
        pass


@app.get("/")
def health_check():
    return {"status": "ok", "service": "LifeVitals API"}
