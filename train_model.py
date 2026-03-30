"""
train_model.py  –  Study Behavior Analyzer
Trains Regression, Classification, and Clustering models
on the student_performance.csv dataset.
"""

import os
import json
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    mean_squared_error, r2_score,
    accuracy_score, classification_report,
)

# ── paths ──────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_PATH  = os.path.join(BASE_DIR, "student_performance.csv")
MODEL_DIR  = os.path.join(BASE_DIR, "model")
os.makedirs(MODEL_DIR, exist_ok=True)

# ── 1. Load & inspect ──────────────────────────────────────────────────────────
print("=" * 60)
print("  STUDY BEHAVIOR ANALYZER  –  Model Training")
print("=" * 60)

# Use only a sample for speed when the file is very large
df_full = pd.read_csv(DATA_PATH)
print(f"\n✅ Loaded dataset  →  {len(df_full):,} rows, {df_full.shape[1]} columns")
print(f"   Columns: {list(df_full.columns)}")

# Sample for training (keeps quality while being fast on 1M-row files)
MAX_ROWS = 50_000
if len(df_full) > MAX_ROWS:
    df = df_full.sample(n=MAX_ROWS, random_state=42).reset_index(drop=True)
    print(f"   (Sampled {MAX_ROWS:,} rows for training speed)")
else:
    df = df_full.copy()

# ── 2. Column mapping ──────────────────────────────────────────────────────────
# Expected schema: student_id, weekly_self_study_hours, attendance_percentage,
#                  class_participation, total_score, grade
FEATURE_COLS = ["weekly_self_study_hours", "attendance_percentage", "class_participation"]
TARGET_REG   = "total_score"
TARGET_CLF   = "productivity_label"   # will be created below

# ── 3. Handle missing values ───────────────────────────────────────────────────
missing_before = df.isnull().sum().sum()
df[FEATURE_COLS] = df[FEATURE_COLS].fillna(df[FEATURE_COLS].median())
df[TARGET_REG]   = df[TARGET_REG].fillna(df[TARGET_REG].median())
print(f"\n✅ Missing values filled  →  {missing_before} cells imputed")

# ── 4. Create productivity label ───────────────────────────────────────────────
def make_label(score):
    if score >= 75:
        return "High"
    elif score >= 50:
        return "Medium"
    else:
        return "Low"

df[TARGET_CLF] = df[TARGET_REG].apply(make_label)
dist = df[TARGET_CLF].value_counts().to_dict()
print(f"\n✅ Productivity labels created  →  {dist}")

# ── 5. Encode classification target ───────────────────────────────────────────
le = LabelEncoder()
y_clf_encoded = le.fit_transform(df[TARGET_CLF])
joblib.dump(le, os.path.join(MODEL_DIR, "label_encoder.pkl"))
print(f"   Label order: {list(le.classes_)}")

# ── 6. Feature matrix ─────────────────────────────────────────────────────────
X = df[FEATURE_COLS].values
y_reg = df[TARGET_REG].values
y_clf = y_clf_encoded

# ── 7. Train / test split ──────────────────────────────────────────────────────
X_train_raw, X_test_raw, yr_train, yr_test, yc_train, yc_test = train_test_split(
    X, y_reg, y_clf, test_size=0.2, random_state=42
)
print(f"   Train: {len(X_train_raw):,}  |  Test: {len(X_test_raw):,}")

scaler = StandardScaler()
X_train = scaler.fit_transform(X_train_raw)
X_test = scaler.transform(X_test_raw)
X_scaled = scaler.transform(X)
joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.pkl"))
print("\n✅ StandardScaler fitted on training split and saved")

# ── 8. Regression Model ────────────────────────────────────────────────────────
print("\n── Training Regression (RandomForestRegressor) …")
reg = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=1)
reg.fit(X_train, yr_train)
yr_pred  = reg.predict(X_test)
rmse     = np.sqrt(mean_squared_error(yr_test, yr_pred))
r2       = r2_score(yr_test, yr_pred)
print(f"   RMSE: {rmse:.2f}   R²: {r2:.4f}")
joblib.dump(reg, os.path.join(MODEL_DIR, "regression.pkl"))
print("   ✅ regression.pkl saved")

# ── 9. Classification Model ────────────────────────────────────────────────────
print("\n── Training Classifier (LogisticRegression) …")
clf = LogisticRegression(max_iter=1000, random_state=42)
clf.fit(X_train, yc_train)
yc_pred  = clf.predict(X_test)
acc      = accuracy_score(yc_test, yc_pred)
print(f"   Accuracy: {acc:.4f}")
print(classification_report(yc_test, yc_pred, target_names=le.classes_))
joblib.dump(clf, os.path.join(MODEL_DIR, "classifier.pkl"))
print("   ✅ classifier.pkl saved")

# ── 10. Clustering Model ───────────────────────────────────────────────────────
print("\n── Training Clustering (KMeans, k=3) …")
km = KMeans(n_clusters=3, random_state=42, n_init=10)
km.fit(X_scaled)

# Assign meaningful cluster names based on centroid feature values
# Feature order: [weekly_self_study_hours, attendance_percentage, class_participation]
centers = scaler.inverse_transform(km.cluster_centers_)
centers_df = pd.DataFrame(centers, columns=FEATURE_COLS)
centers_df["cluster_id"] = range(3)
print("\n   Cluster centroids (original scale):")
print(centers_df.to_string(index=False))

# Heuristic naming
def name_cluster(row):
    study  = row["weekly_self_study_hours"]
    attend = row["attendance_percentage"]
    partic = row["class_participation"]
    if study >= centers_df["weekly_self_study_hours"].median():
        if attend >= centers_df["attendance_percentage"].median():
            return "Consistent Learner"
        else:
            return "Night Owl"
    else:
        return "Last-Minute Crammer"

cluster_names = {int(r["cluster_id"]): name_cluster(r)
                 for _, r in centers_df.iterrows()}
# Guarantee unique names (resolve ties by centroid study hours rank)
if len(set(cluster_names.values())) < 3:
    sorted_ids = centers_df.sort_values("weekly_self_study_hours", ascending=False)["cluster_id"].tolist()
    labels = ["Consistent Learner", "Night Owl", "Last-Minute Crammer"]
    cluster_names = {int(sorted_ids[i]): labels[i] for i in range(3)}

print(f"\n   Cluster name mapping: {cluster_names}")
joblib.dump(km, os.path.join(MODEL_DIR, "clustering.pkl"))
print("   ✅ clustering.pkl saved")

# ── 11. Save metadata for the Flask app ───────────────────────────────────────
meta = {
    "feature_cols"   : FEATURE_COLS,
    "target_reg"     : TARGET_REG,
    "target_clf"     : TARGET_CLF,
    "cluster_names"  : cluster_names,
    "label_classes"  : list(le.classes_),
    "metrics": {
        "regression": {"rmse": round(rmse, 4), "r2": round(r2, 4)},
        "classifier": {"accuracy": round(acc, 4)},
    },
    "cluster_centers": centers_df.to_dict(orient="records"),
}
with open(os.path.join(MODEL_DIR, "meta.json"), "w") as f:
    json.dump(meta, f, indent=2)
print("\n✅ meta.json saved")

print("\n" + "=" * 60)
print("  Training complete!  All models saved to /model/")
print("  Run:  python app.py")
print("=" * 60)
