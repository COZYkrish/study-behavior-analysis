# 🪐 Study Behavior Analyzer

An immersive, ML-powered web application that acts as a **Futuristic Academic Intelligence Engine**. It analyzes individual student behavior patterns and leverages machine learning models trained on **1,000,000 real student records** to predict academic performance, output productivity insights, and classify learners into distinct behavioral archetypes.

---

## 🎯 What is this?

The **Study Behavior Analyzer** goes beyond simple statistics by utilizing cutting-edge machine learning. It takes three fundamental behavioral vectors—your weekly self-study hours, your class attendance percentage, and your classroom participation scale—and feeds them into an advanced, pre-trained multi-model pipeline. 

By comparing your data against a million historical students, the platform accurately projects your final exam performance, gauges how efficiently you convert effort into grades, and assigns you a unique "Study Archetype" profile. 

This happens entirely inside a visually stunning, cinematic frontend featuring interactive 3D elements, dynamic scroll-driven storytelling, and data-rich animated dashboards.

---

## 💡 Key Features

- **🔮 Precision Score Prediction** – Uses a `RandomForestRegressor` to predict your raw academic outcome (0-100) based on your behavioral inputs.
- **⚡ Productivity Classification** – A `LogisticRegression` classifier evaluates whether your current routine is generating High, Medium, or Low productivity.
- **🧬 Behavioral Archetyping** – A trained `K-Means (k=3)` model places your individual data point in a vector space to align you with one of three fundamental study patterns:
  - 🦉 **Night Owl** – Extensive study bursts with softer attendance discipline.
  - ⬡ **Consistent Learner** – A perfectly balanced combination of study hours, strict attendance, and strong classroom follow-through.
  - ⚡ **Last-Minute Crammer** – Heavy reliance on late-stage acceleration with compressed effort.
- **🎨 Cinematic Aesthetic** – Built with a premium "Glassmorphism" UI, smooth WebGL 3D orbital scenes, custom CSS scroll-progress mechanics, and data-driven radial gauges.
- **📊 Intelligence Dashboard** – Live charts, responsive data rings, SVG alignment gauges, and historical persistence right in your browser.

---

## ⚙️ The Machine Learning Pipeline

The intelligence engine relies on a robust data preprocessing and training pipeline (`train_model.py`):

1. **Massive Scale Ingestion**: Loads the massive 1M-row `student_performance.csv` dataset, using a representative 50,000 row random sample for rapid local training.
2. **Data Imputation**: Gracefully handles any missing dataset values by calculating and applying column medians.
3. **Feature Engineering**: Generates the categorical `productivity_label` logic dynamically derived from the `total_score` to provide the classifier with a distinct target.
4. **Feature Normalization**: Subjects all raw numeric inputs to a `StandardScaler`, ensuring distance-based algorithms (like K-Means) evaluate all behavioral vectors equally.
5. **Model Fitting**: Fits the Random Forest, Logistic Classifier, and K-Means algorithms against an 80/20 train/test data split.
6. **Artifact Export**: Serializes the resulting models into `.pkl` binaries and exports critical metadata into a `meta.json` file for the Flask backend to ingest.

---

## 📊 Dataset Attributes

The models are trained over these specific behavioral and result-oriented columns:

| Column | Description |
|--------|-------------|
| 🕒 `weekly_self_study_hours` | The raw number of hours dedicated to independent study per week (0–40). |
| 📅 `attendance_percentage` | The percentage of scheduled classes successfully attended (0–100). |
| 🙋 `class_participation` | A subjective rating of engagement and activity during class sessions (0–10). |
| 🏆 `total_score` | The final academic outcome/exam score (Used as the Regression Target). |
| 🎓 `grade` | Final evaluated Letter grade (A–F). |

---

## 🚀 Quick Start Guide

Want to run this intelligence engine locally? It only takes a few commands:

### 1. Install Project Dependencies
Ensure you have Python installed, then install the required packages:
```bash
pip install -r requirements.txt
```

### 2. Train the AI Models
Execute the training pipeline to generate your local `model/` binaries. *(This typically only takes ~15 to 30 seconds processing a 50K sample of the data).*
```bash
python train_model.py
```

### 3. Ignite the Engine
Launch the Flask backend server:
```bash
python app.py
```

🌍 **Access the App:** Open your browser and navigate to **http://127.0.0.1:5000** to experience the cinematic interface.

---

## 🌐 API Endpoint Specifications

The Flask backend exposes a highly optimized REST API serving JSON predictions to the frontend.

**`POST /predict`**
```json
{
  "weekly_self_study_hours": 18,
  "attendance_percentage": 85,
  "class_participation": 6.5
}
```

**Response Payload:**
```json
{
  "score": 87.3,
  "productivity": "High",
  "cluster": "Consistent Learner",
  "narrative": "Based on the input vectors, your behavioral signature closely matches the 'Consistent Learner' archetype...",
  "comparison": {
    "alignment": "Strong",
    "distance": 1.2
  }
}
```

---

## 📁 Project Structure

Here is exactly how the codebase is organized to separate concerns between Data Science, Backend Routing, and Frontend Aesthetics:

```text
study-behavior-analyzer/
├── 🐍 app.py                  # Core Flask backend server (Routes & Prediction API)
├── 🧠 train_model.py          # Machine learning data processing & training pipeline
├── 📄 student_performance.csv # Massive base dataset (1M rows)
├── 📦 requirements.txt        # Python dependency manifest
├── 📂 model/                  # Generated ML artifacts (Do not manually edit)
│   ├── regression.pkl         # Trained RandomForestRegressor binary
│   ├── classifier.pkl         # Trained LogisticRegression binary
│   ├── clustering.pkl         # Trained KMeans clustering binary
│   ├── scaler.pkl             # Trained StandardScaler binary
│   ├── label_encoder.pkl      # Encoder for productivity tiers
│   └── meta.json              # Extracted metadata, names, & model metrics
├── 📂 static/                 # Static frontend assets
│   ├── style.css              # Global custom CSS Design System & Keyframe animations
│   ├── script.js              # Fetch APIs, dashboard logic, IntersectionObservers
│   ├── history.js             # Client-side localStorage logic for persistence
│   └── three-scene.js         # WebGL/Three.js render logic for 3D orbital scenes
└── 📂 templates/              # Jinja2 HTML Templates
    ├── base.html              # Shared structural layout and navigation shell
    ├── index.html             # The cinematic Hero Landing Page
    ├── about.html             # About the Engine page
    ├── how_it_works.html      # Scroll-driven storytelling pipeline explanation
    ├── study_types.html       # Behavioral Archetype reference cards
    ├── insights.html          # Deep-dive actionable academic insights
    ├── history.html           # Historical log of previous prediction runs
    └── dashboard.html         # The main interactive prediction interface
```
