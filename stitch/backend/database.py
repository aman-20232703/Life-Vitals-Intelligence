from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Full URL with token embedded
DATABASE_URL = "sqlite:///./lifevitals.db"

#DATABASE_URL = "libsql://lifevital-aman2703.aws-ap-south-1.turso.io?authToken=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzc4NzI2NzEsImlkIjoiMDE5ZGYxNzctOTkwMS03YmUzLTlmMTAtOWEzZjBjZjlhNmUzIiwicmlkIjoiMjllMDhkNGMtYzU3Mi00ZDFiLTkxNDgtY2E1OWI5ZGNjNDRhIn0.BYO-FwJh41Q0juxZRFtQ-sJTsBiULtcpSddcpbfmFY7mi8GEyTbN7mRgg7R000QJi4kOWZhwGVQryEtgPBvzCw"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
