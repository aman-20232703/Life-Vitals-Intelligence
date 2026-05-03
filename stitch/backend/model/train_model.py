from __future__ import annotations

from services.model_service import train_model_bundle


if __name__ == "__main__":
    bundle = train_model_bundle(force_retrain=True)
    print(
        f"Saved model.pkl with {bundle.training_rows} rows, "
        f"{len(bundle.feature_columns)} features, and training score {bundle.training_score:.3f}."
    )
