"""
app.py - Study Behavior Analyzer Flask Backend
"""

import json
import os

import joblib
import numpy as np
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")

_MODELS = None

with open(os.path.join(MODEL_DIR, "meta.json"), encoding="utf-8") as f:
    META = json.load(f)

CLUSTER_NAMES = {int(k): v for k, v in META["cluster_names"].items()}
CLUSTER_CENTERS = {
    int(row["cluster_id"]): row for row in META.get("cluster_centers", [])
}
CLUSTER_CENTERS_SCALED = {
    int(row["cluster_id"]): np.array(row["values"], dtype=float)
    for row in META.get("cluster_centers_scaled", [])
}
CLUSTER_DIST = META.get("cluster_distribution", {})
FEATURE_COLS = META["feature_cols"]
FIELD_SPECS = {
    "weekly_self_study_hours": (0, 40),
    "attendance_percentage": (0, 100),
    "class_participation": (0, 10),
}
OPTIMAL_ZONE = {
    "study_hours": (16, 24),
    "attendance": (85, 95),
    "participation": (6, 8.5),
}

class ValidationError(Exception):
    def __init__(self, fields):
        super().__init__("Invalid input values")
        self.fields = fields


def _get_models():
    global _MODELS
    if _MODELS is None:
        _MODELS = {
            "reg": joblib.load(os.path.join(MODEL_DIR, "regression.pkl")),
            "clf": joblib.load(os.path.join(MODEL_DIR, "classifier.pkl")),
            "scaler": joblib.load(os.path.join(MODEL_DIR, "scaler.pkl")),
            "le": joblib.load(os.path.join(MODEL_DIR, "label_encoder.pkl")),
        }
    return _MODELS


@app.route("/")
def index():
    return render_template("index.html", meta=META, overview=_build_overview_stats())


@app.route("/dashboard")
def dashboard():
    return render_template(
        "dashboard.html",
        meta=META,
        overview=_build_overview_stats(),
        cluster_profiles=_cluster_profiles(),
    )


# --- New Multipage Routes ---
@app.route("/about")
def about():
    return render_template("about.html", meta=META)


@app.route("/how-it-works")
def how_it_works():
    return render_template("how_it_works.html", meta=META)


@app.route("/study-types")
def study_types():
    return render_template("study_types.html", meta=META, cluster_profiles=_cluster_profiles())


@app.route("/insights")
def insights():
    return render_template("insights.html", meta=META)


@app.route("/history")
def history():
    # Placeholder: In-memory or local storage can be added later
    return render_template("history.html", meta=META)


@app.route("/predict", methods=["POST"])
def predict():
    try:
        features = _parse_features(request.get_json(force=True))
        study_hours, attendance, participation = features[0]
        score, productivity, study_type, productivity_probs = _predict_from_features(features)
        benchmark = _benchmark_summary(study_hours, attendance, participation, score)
        confidence = _confidence_summary(productivity_probs, score, benchmark["alignment"])
        cluster_profile = _cluster_profile(study_type)

        return jsonify({
            "score": score,
            "productivity": productivity,
            "cluster": study_type,
            "cluster_profile": cluster_profile,
            "suggestions": _smart_suggestions(study_hours, attendance, participation, score),
            "narrative": _result_narrative(score, productivity, study_type, benchmark, confidence),
            "comparison": benchmark,
            "confidence": confidence,
            "fingerprint": _behavior_fingerprint(study_hours, attendance, participation, score),
            "insights": _insight_cards(study_hours, attendance, participation, score, productivity_probs),
            "study_profile": _study_profile_summary(study_hours, attendance, participation),
            "cluster_dist": _cluster_distribution(),
            "metrics": META["metrics"],
        })
    except ValidationError as exc:
        return jsonify({
            "error": {
                "code": "validation_error",
                "message": "Invalid input values.",
                "fields": exc.fields,
            }
        }), 400
    except Exception as exc:
        return jsonify({
            "error": {
                "code": "prediction_error",
                "message": str(exc),
            }
        }), 500


@app.route("/trend", methods=["POST"])
def trend():
    try:
        base_features = _parse_features(request.get_json(force=True))
        attendance = float(base_features[0][1])
        participation = float(base_features[0][2])

        points = []
        for study_hours in range(0, 41, 2):
            features = np.array([[study_hours, attendance, participation]], dtype=float)
            score, _, _, _ = _predict_from_features(features)
            points.append({"study_hours": study_hours, "score": score})

        optimal_point = max(points, key=lambda point: point["score"])

        return jsonify({
            "points": points,
            "summary": _trend_summary(points, attendance, participation),
            "optimal_point": optimal_point,
        })
    except ValidationError as exc:
        return jsonify({
            "error": {
                "code": "validation_error",
                "message": "Invalid input values.",
                "fields": exc.fields,
            }
        }), 400
    except Exception as exc:
        return jsonify({
            "error": {
                "code": "trend_error",
                "message": str(exc),
            }
        }), 500


def _parse_features(data):
    if not isinstance(data, dict):
        raise ValidationError({
            "request": "Expected a JSON object with study behavior fields."
        })

    values = {}
    errors = {}
    for field, (min_value, max_value) in FIELD_SPECS.items():
        raw_value = data.get(field)
        if raw_value is None:
            errors[field] = "This field is required."
            continue

        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            errors[field] = "Must be a numeric value."
            continue

        if value < min_value or value > max_value:
            errors[field] = f"Must be between {min_value} and {max_value}."
            continue

        values[field] = value

    if errors:
        raise ValidationError(errors)

    return np.array([[values[col] for col in FEATURE_COLS]], dtype=float)


def _predict_from_features(features):
    models = _get_models()
    reg = models["reg"]
    clf = models["clf"]
    scaler = models["scaler"]
    le = models["le"]

    scaled = scaler.transform(features)

    score_raw = float(reg.predict(scaled)[0])
    score = round(min(max(score_raw, 0), 100), 1)

    clf_label_idx = int(clf.predict(scaled)[0])
    productivity = le.inverse_transform([clf_label_idx])[0]

    productivity_probs = None
    if hasattr(clf, "predict_proba"):
        prob_values = clf.predict_proba(scaled)[0]
        productivity_probs = {
            label: round(float(prob) * 100, 1)
            for label, prob in zip(le.classes_, prob_values)
        }

    cluster_id = _predict_cluster_id(scaled[0])
    study_type = CLUSTER_NAMES.get(cluster_id, "Consistent Learner")

    return score, productivity, study_type, productivity_probs


def _build_overview_stats():
    return {
        "students": "1M+",
        "models": 3,
        "accuracy": round(META["metrics"]["classifier"]["accuracy"] * 100),
        "r2": round(META["metrics"]["regression"]["r2"], 2),
    }


def _cluster_distribution():
    return CLUSTER_DIST


def _predict_cluster_id(scaled_features):
    distances = []
    for cluster_id, center in CLUSTER_CENTERS_SCALED.items():
        distance = float(np.linalg.norm(scaled_features - center))
        distances.append((distance, cluster_id))
    return min(distances, key=lambda item: item[0])[1]


def _cluster_profiles():
    return [
        _cluster_profile(cluster_name)
        for cluster_name in CLUSTER_NAMES.values()
    ]


def _cluster_profile(cluster_name):
    cluster_id = next((cid for cid, name in CLUSTER_NAMES.items() if name == cluster_name), None)
    center = CLUSTER_CENTERS.get(cluster_id, {})
    return {
        "name": cluster_name,
        "study_hours": round(float(center.get("weekly_self_study_hours", 0)), 1),
        "attendance": round(float(center.get("attendance_percentage", 0)), 1),
        "participation": round(float(center.get("class_participation", 0)), 1),
        "description": {
            "Consistent Learner": "Stable weekly effort with strong classroom follow-through.",
            "Night Owl": "Long study bursts with softer attendance discipline.",
            "Last-Minute Crammer": "Compressed effort pattern that relies on late acceleration.",
        }.get(cluster_name, "Balanced academic behavior profile."),
    }


def _benchmark_summary(study_hours, attendance, participation, score):
    optimal_score = 0
    checks = [
        ("Study hours", study_hours, OPTIMAL_ZONE["study_hours"]),
        ("Attendance", attendance, OPTIMAL_ZONE["attendance"]),
        ("Participation", participation, OPTIMAL_ZONE["participation"]),
    ]

    deltas = []
    for label, value, (lower, upper) in checks:
        in_range = lower <= value <= upper
        optimal_score += int(in_range)
        if value < lower:
            deltas.append(f"{label} is {round(lower - value, 1)} below the target band.")
        elif value > upper:
            deltas.append(f"{label} is {round(value - upper, 1)} above the target band.")
        else:
            deltas.append(f"{label} sits inside the optimal band.")

    alignment = round(optimal_score / len(checks) * 100)
    return {
        "alignment": alignment,
        "optimal_zone": {
            "study_hours": f"{OPTIMAL_ZONE['study_hours'][0]}-{OPTIMAL_ZONE['study_hours'][1]} h",
            "attendance": f"{OPTIMAL_ZONE['attendance'][0]}-{OPTIMAL_ZONE['attendance'][1]}%",
            "participation": f"{OPTIMAL_ZONE['participation'][0]}-{OPTIMAL_ZONE['participation'][1]} / 10",
        },
        "headline": (
            "Operating inside the high-efficiency zone."
            if alignment >= 67 else
            "Close to the optimal zone, with a few levers left to tighten."
            if alignment >= 34 else
            "Current profile sits outside the strongest scoring band."
        ),
        "delta_to_80": round(max(0, 80 - score), 1),
        "detail": deltas,
    }


def _confidence_summary(productivity_probs, score, alignment):
    if productivity_probs:
        top_confidence = max(productivity_probs.values())
    else:
        top_confidence = 65.0

    reliability = round((top_confidence * 0.6) + (alignment * 0.4), 1)
    band = "High" if reliability >= 75 else "Moderate" if reliability >= 55 else "Exploratory"
    return {
        "reliability": reliability,
        "band": band,
        "probabilities": productivity_probs or {},
        "summary": (
            "Signals are tightly aligned with learned study patterns."
            if band == "High" else
            "Prediction is directionally solid, but small behavior changes can move the outcome."
            if band == "Moderate" else
            "This profile sits near boundary conditions, so treat the prediction as guidance."
        ),
        "score_band": (
            "Elite trajectory" if score >= 85 else
            "Competitive trajectory" if score >= 70 else
            "Recovery trajectory"
        ),
    }


def _behavior_fingerprint(study_hours, attendance, participation, score):
    return [
        {"label": "Focus Load", "value": round((study_hours / 40) * 100), "unit": "%"},
        {"label": "Attendance Sync", "value": round(attendance), "unit": "%"},
        {"label": "Class Signal", "value": round((participation / 10) * 100), "unit": "%"},
        {"label": "Score Outlook", "value": round(score), "unit": "%"},
    ]


def _insight_cards(study_hours, attendance, participation, score, productivity_probs):
    strongest_dimension = max(
        [
            ("Self-study intensity", study_hours / 40),
            ("Attendance discipline", attendance / 100),
            ("Classroom engagement", participation / 10),
        ],
        key=lambda item: item[1],
    )[0]

    productivity_conf = max(productivity_probs.values()) if productivity_probs else 65.0
    return [
        {
            "title": "Strongest Signal",
            "value": strongest_dimension,
            "description": "This is the behavior currently contributing the most structure to your profile.",
        },
        {
            "title": "Score Lift Needed",
            "value": f"{round(max(0, 85 - score), 1)} pts",
            "description": "Estimated gap to reach the premium-performance band.",
        },
        {
            "title": "Classifier Confidence",
            "value": f"{round(productivity_conf, 1)}%",
            "description": "How decisively the productivity classifier separates your current pattern.",
        },
    ]


def _study_profile_summary(study_hours, attendance, participation):
    return {
        "cadence": (
            "High-output cadence" if study_hours >= 22 else
            "Stable cadence" if study_hours >= 14 else
            "Light cadence"
        ),
        "attendance_mode": (
            "Reliable" if attendance >= 90 else
            "Manageable" if attendance >= 75 else
            "At risk"
        ),
        "engagement_mode": (
            "Visible contributor" if participation >= 7 else
            "Steady participant" if participation >= 4 else
            "Quiet signal"
        ),
    }


def _smart_suggestions(study_hours, attendance, participation, score):
    tips = []

    if study_hours < 16:
        extra = round(16 - study_hours, 1)
        tips.append(f"Add {extra} focused study hours per week to move into the efficient output band.")
    if attendance < 85:
        tips.append("Push attendance toward 85% or higher to stabilize the model's score outlook.")
    if participation < 6:
        tips.append("Increase class participation to at least 6 out of 10 to strengthen retention signals.")
    if score >= 80:
        tips.append("Maintain your current operating rhythm and avoid sacrificing attendance for extra hours.")
    if 65 <= score < 80:
        tips.append("You are close to the next tier. Small gains across consistency and attendance should compound well.")
    if score < 65 and not tips:
        tips.append("Your current pattern needs a more disciplined weekly structure across all three inputs.")

    return tips or ["Your study behavior is already aligned with a strong performance corridor."]


def _result_narrative(score, productivity, study_type, benchmark, confidence):
    return (
        f"Predicted score is {score}, with a {productivity.lower()} productivity profile and a "
        f"{study_type.lower()} behavior signature. {benchmark['headline']} {confidence['summary']}"
    )


def _trend_summary(points, attendance, participation):
    scores = [point["score"] for point in points]
    slope = scores[-1] - scores[0]
    direction = "upward" if slope >= 6 else "flat" if slope >= 0 else "downward"
    return {
        "headline": (
            "Additional study hours continue to create value."
            if slope >= 8 else
            "Score lift exists, but the curve begins to taper."
            if slope >= 3 else
            "Increasing hours alone is not enough; attendance and participation are the constraints."
        ),
        "direction": direction,
        "attendance_context": round(attendance, 1),
        "participation_context": round(participation, 1),
    }


if __name__ == "__main__":
    print("Study Behavior Analyzer running at http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
