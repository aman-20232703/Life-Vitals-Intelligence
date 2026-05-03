from services.analysis import (
    analyze_economy,
    analyze_health,
    analyze_social,
)
from services.data_service import get_dataset_repository
from services.analytics_service import (
    calculate_economy_score,
    calculate_health_score,
    calculate_overall_score,
    calculate_social_score,
    generate_projection,
    generate_recommendations,
)
from services.dashboard_service import (
    calculate_dashboard_summary,
    compare_with_global_average,
    generate_dashboard_insights,
    generate_dashboard_recommendations,
)
from services.model_service import load_model_bundle, predict_life_expectancy, train_model_bundle

__all__ = [
    "analyze_economy",
    "analyze_health",
    "analyze_social",
    "get_dataset_repository",
    "calculate_overall_score",
    "calculate_economy_score",
    "calculate_health_score",
    "calculate_social_score",
    "generate_projection",
    "generate_recommendations",
    "calculate_dashboard_summary",
    "generate_dashboard_insights",
    "compare_with_global_average",
    "generate_dashboard_recommendations",
    "load_model_bundle",
    "predict_life_expectancy",
    "train_model_bundle",
]
