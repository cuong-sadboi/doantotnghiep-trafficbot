"""
app.py - Flask REST API cho AI Bot Detection Service
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging

from predict import predict, predict_batch

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    model_loaded = os.path.exists("model.pkl")
    return jsonify({
        "status": "ok",
        "model_ready": model_loaded,
        "version": "1.0.0",
    })


@app.route("/predict", methods=["POST"])
def predict_single():
    """
    Predict single session.

    Request body (JSON):
    {
        "requests_per_minute": float,
        "session_duration": float,
        "unique_pages": int,
        "avg_click_interval": float,
        "is_headless": 0 or 1,
        "user_agent_length": int,
        "visit_count": int
    }

    Response:
    {
        "label": 0 or 1,
        "is_bot": bool,
        "confidence": float,
        "probabilities": { "real_user": float, "bot": float }
    }
    """
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400

    data = request.get_json()
    required_fields = [
        "requests_per_minute", "session_duration", "unique_pages",
        "avg_click_interval", "is_headless", "user_agent_length", "visit_count"
    ]

    missing = [f for f in required_fields if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    try:
        result = predict(data)
        logger.info(f"Prediction: {result}")
        return jsonify(result)
    except FileNotFoundError:
        return jsonify({"error": "Model not found. Run train.py first."}), 503
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/predict/batch", methods=["POST"])
def predict_batch_endpoint():
    """
    Predict batch of sessions.

    Request body (JSON):
    {
        "sessions": [ {...}, {...} ]
    }

    Response:
    {
        "results": [ {...}, {...} ],
        "total": int,
        "bots_detected": int
    }
    """
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400

    data = request.get_json()
    sessions = data.get("sessions", [])

    if not sessions or not isinstance(sessions, list):
        return jsonify({"error": "sessions must be a non-empty list"}), 400

    try:
        results = predict_batch(sessions)
        bots = sum(1 for r in results if r["is_bot"])
        return jsonify({
            "results": results,
            "total": len(results),
            "bots_detected": bots,
        })
    except FileNotFoundError:
        return jsonify({"error": "Model not found. Run train.py first."}), 503
    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/model/info", methods=["GET"])
def model_info():
    """Get model info"""
    import pickle
    try:
        with open("model.pkl", "rb") as f:
            model_data = pickle.load(f)
        model = model_data["model"]
        features = model_data["features"]
        return jsonify({
            "model_type": type(model).__name__,
            "n_estimators": model.n_estimators,
            "n_features": model.n_features_in_,
            "features": features,
            "classes": model.classes_.tolist(),
        })
    except FileNotFoundError:
        return jsonify({"error": "Model not found. Run train.py first."}), 503


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
