"""
train_model.py - Study Behavior Analyzer
Trains regression, classification, and clustering models
on the student_performance.csv dataset.
"""

import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "student_performance.csv")
MODEL_DIR = os.path.join(BASE_DIR, "model")
os.makedirs(MODEL_DIR, exist_ok=True)

FEATURE_COLS = [
    "weekly_self_study_hours",
    "attendance_percentage",
    "class_participation",
]
TARGET_REG = "total_score"
TARGET_CLF = "productivity_label"
MAX_ROWS = 50_000


def make_label(score):
    if score >= 75:
        return "High"
    if score >= 50:
        return "Medium"
    return "Low"


print("=" * 60)
print("  STUDY BEHAVIOR ANALYZER - Model Training")
print("=" * 60)

df_full = pd.read_csv(DATA_PATH)
print(f"\nLoaded dataset -> {len(df_full):,} rows, {df_full.shape[1]} columns")

if len(df_full) > MAX_ROWS:
    df = df_full.sample(n=MAX_ROWS, random_state=42).reset_index(drop=True)
    print(f"Sampled {MAX_ROWS:,} rows for faster training")
else:
    df = df_full.copy()

missing_before = int(df.isnull().sum().sum())
df[FEATURE_COLS] = df[FEATURE_COLS].fillna(df[FEATURE_COLS].median())
df[TARGET_REG] = df[TARGET_REG].fillna(df[TARGET_REG].median())
df[TARGET_CLF] = df[TARGET_REG].apply(make_label)
print(f"Missing values filled -> {missing_before} cells imputed")

le = LabelEncoder()
y_clf = le.fit_transform(df[TARGET_CLF])
joblib.dump(le, os.path.join(MODEL_DIR, "label_encoder.pkl"))

X = df[FEATURE_COLS].values
y_reg = df[TARGET_REG].values

X_train_raw, X_test_raw, yr_train, yr_test, yc_train, yc_test = train_test_split(
    X, y_reg, y_clf, test_size=0.2, random_state=42
)

scaler = StandardScaler()
X_train = scaler.fit_transform(X_train_raw)
X_test = scaler.transform(X_test_raw)
X_scaled = scaler.transform(X)
joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.pkl"))

print("\nTraining regression model (GradientBoostingRegressor)...")
reg = GradientBoostingRegressor(random_state=42)
reg.fit(X_train, yr_train)
yr_pred = reg.predict(X_test)
rmse = float(np.sqrt(mean_squared_error(yr_test, yr_pred)))
r2 = float(r2_score(yr_test, yr_pred))
joblib.dump(reg, os.path.join(MODEL_DIR, "regression.pkl"))
print(f"Regression metrics -> RMSE: {rmse:.2f}  R2: {r2:.4f}")

print("\nTraining classifier (LogisticRegression)...")
clf = LogisticRegression(max_iter=1000, random_state=42)
clf.fit(X_train, yc_train)
yc_pred = clf.predict(X_test)
acc = float(accuracy_score(yc_test, yc_pred))
joblib.dump(clf, os.path.join(MODEL_DIR, "classifier.pkl"))
print(f"Classifier accuracy -> {acc:.4f}")

print("\nTraining clustering model (KMeans, k=3)...")
km = KMeans(n_clusters=3, random_state=42, n_init=10)
km.fit(X_scaled)
joblib.dump(km, os.path.join(MODEL_DIR, "clustering.pkl"))

centers = scaler.inverse_transform(km.cluster_centers_)
centers_df = pd.DataFrame(centers, columns=FEATURE_COLS)
centers_df["cluster_id"] = range(3)


def name_cluster(row):
    study = row["weekly_self_study_hours"]
    attend = row["attendance_percentage"]
    if study >= centers_df["weekly_self_study_hours"].median():
        if attend >= centers_df["attendance_percentage"].median():
            return "Consistent Learner"
        return "Night Owl"
    return "Last-Minute Crammer"


cluster_names = {
    int(row["cluster_id"]): name_cluster(row)
    for _, row in centers_df.iterrows()
}

if len(set(cluster_names.values())) < 3:
    sorted_ids = centers_df.sort_values(
        "weekly_self_study_hours", ascending=False
    )["cluster_id"].tolist()
    labels = ["Consistent Learner", "Night Owl", "Last-Minute Crammer"]
    cluster_names = {int(sorted_ids[i]): labels[i] for i in range(3)}

meta = {
    "feature_cols": FEATURE_COLS,
    "target_reg": TARGET_REG,
    "target_clf": TARGET_CLF,
    "cluster_names": cluster_names,
    "label_classes": list(le.classes_),
    "metrics": {
        "regression": {"rmse": round(rmse, 4), "r2": round(r2, 4)},
        "classifier": {"accuracy": round(acc, 4)},
    },
    "cluster_centers": centers_df.to_dict(orient="records"),
}

with open(os.path.join(MODEL_DIR, "meta.json"), "w", encoding="utf-8") as f:
    json.dump(meta, f, indent=2)

print("\nArtifacts saved to /model")
print("=" * 60)
