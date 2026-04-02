# 🧠 Study Behavior Analyzer

A complete end-to-end Machine Learning web application that analyzes student study behavior and predicts academic outcomes using **1,000,000 real student records**.

---

## 🎯 What It Does

| Model | Type | Output |
|-------|------|--------|
| RandomForestRegressor | Regression | Predicts final score (0–100) |
| LogisticRegression | Classification | Classifies productivity: High / Medium / Low |
| KMeans (k=3) | Clustering | Reveals study archetype |

### Study Archetypes
- 🦉 **Night Owl** – High study hours, lower attendance
- 📚 **Consistent Learner** – Balanced study + attendance
- ⏰ **Last-Minute Crammer** – Low weekly hours

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Train models
```bash
python train_model.py
```
*(Takes ~30s on 50K sample from 1M-row dataset)*

### 3. Run the app
```bash
python app.py
```

Open **http://127.0.0.1:5000** in your browser.

---

## 📁 Project Structure

```
study-behavior-analyzer/
├── app.py                  # Flask backend (routes + prediction API)
├── train_model.py          # ML training pipeline
├── student_performance.csv # Dataset (1M rows)
├── requirements.txt
├── model/
│   ├── regression.pkl      # RandomForestRegressor
│   ├── classifier.pkl      # LogisticRegression
│   ├── clustering.pkl      # KMeans
│   ├── scaler.pkl          # StandardScaler
│   ├── label_encoder.pkl   # LabelEncoder for productivity
│   └── meta.json           # Metadata + model metrics
├── static/
│   ├── style.css           # Dark glassmorphism theme
│   └── script.js           # Fetch API + Chart.js logic
└── templates/
    ├── index.html          # Landing page
    └── dashboard.html      # Main dashboard
```

---

## 📊 Dataset Columns

| Column | Description |
|--------|-------------|
| `weekly_self_study_hours` | Hours/week of self-study |
| `attendance_percentage` | % of classes attended |
| `class_participation` | Participation score (0–10) |
| `total_score` | Final exam score (regression target) |
| `grade` | Letter grade (A–F) |

---

## 🧠 ML Pipeline

<!-- 1. Load CSV → sample 50K rows for training speed  
2. Fill missing values with column medians  
3. Create `productivity_label` from `total_score`  
4. Scale features with `StandardScaler`  
5. Train/test split (80/20)  
6. Train + evaluate all 3 models  
7. Save `.pkl` files + `meta.json` -->

---

## 🌐 API

**POST /predict**
```json
{
  "weekly_self_study_hours": 18,
  "attendance_percentage": 85,
  "class_participation": 6.5
}
```

**Response:**
```json
{
  "score": 87.3,
  "productivity": "High",
  "cluster": "Consistent Learner",
  "suggestion": "Great work! Keep up the consistent effort.",
  "cluster_dist": { "Consistent Learner": 43.2, "Night Owl": 30.1, "Last-Minute Crammer": 26.7 },
  "metrics": { "regression": { "rmse": 8.83, "r2": 0.6682 }, "classifier": { "accuracy": 0.841 } }
}
```

---

## 🎨 UI Features

- Dark theme with glassmorphism + neon accents
- Animated slider inputs with live value badges
- Animated score counter
- 3 interactive Chart.js visualizations:
  - Bar chart (inputs vs prediction)
  - Doughnut chart (cluster distribution)
  - Line chart (score trend by study hours)
- Smart AI suggestions
- Fully responsive layout

---

*Built with Flask · Scikit-learn · Chart.js · 1M student records*
