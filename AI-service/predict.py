"""
predict.py - Prediction logic (dùng model đã train)
"""

import pickle
import numpy as np

MODEL_FILE = "model.pkl"

FEATURES = [
    "requests_per_minute",
    "session_duration",
    "unique_pages",
    "avg_click_interval",
    "is_headless",
    "user_agent_length",
    "visit_count",
]

_model_cache = None


def load_model():
    global _model_cache
    if _model_cache is None:
        with open(MODEL_FILE, "rb") as f:
            _model_cache = pickle.load(f)
    return _model_cache


def predict(data: dict) -> dict:
    """
    Predict whether traffic is bot or real user.

    Args:
        data: dict with keys matching FEATURES

    Returns:
        {
            "label": 0 or 1,
            "is_bot": bool,
            "confidence": float (0.0 - 1.0),
            "probabilities": {"real_user": float, "bot": float}
        }
    """
    model_data = load_model()
    model = model_data["model"]
    features = model_data["features"]

    # Build feature vector
    try:
        X = np.array([[float(data.get(f, 0)) for f in features]])
    except (TypeError, ValueError) as e:
        raise ValueError(f"Invalid input data: {e}")

    label = int(model.predict(X)[0])
    proba = model.predict_proba(X)[0]  # [P(real), P(bot)]

    return {
        "label": label,
        "is_bot": bool(label == 1),
        "confidence": float(max(proba)),
        "probabilities": {
            "real_user": round(float(proba[0]), 4),
            "bot": round(float(proba[1]), 4),
        },
    }


def predict_batch(data_list: list) -> list:
    """Predict a batch of sessions."""
    return [predict(d) for d in data_list]


if __name__ == "__main__":
    # Quick test
    test_cases = [
        {
            "name": "Normal User",
            "requests_per_minute": 5.0,
            "session_duration": 300.0,
            "unique_pages": 8,
            "avg_click_interval": 45.0,
            "is_headless": 0,
            "user_agent_length": 130,
            "visit_count": 12,
        },
        {
            "name": "Bingbot",
            "requests_per_minute": 120.0,
            "session_duration": 30.0,
            "unique_pages": 5,
            "avg_click_interval": 6.0,
            "is_headless": 1,
            "user_agent_length": 88,
            "visit_count": 5,
        },
        {
            "name": "Traffic Bot",
            "requests_per_minute": 300.0,
            "session_duration": 10.0,
            "unique_pages": 2,
            "avg_click_interval": 0.5,
            "is_headless": 1,
            "user_agent_length": 45,
            "visit_count": 50,
        },
    ]

    print("=== Prediction Test ===")
    for tc in test_cases:
        name = tc.pop("name")
        result = predict(tc)
        print(f"\n[{name}]")
        print(f"  Label      : {'Bot' if result['is_bot'] else 'Real User'}")
        print(f"  Confidence : {result['confidence']:.2%}")
        print(f"  Bot prob   : {result['probabilities']['bot']:.2%}")
