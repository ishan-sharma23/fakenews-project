# Fake News Detection - ML Service

## Overview
This is the ML microservice for fake news detection using:
- **Voting Classifier** (ensemble of multiple classifiers)
- **NLP** (TF-IDF vectorization)
- **Random Forest (RF)** + Logistic Regression + Naive Bayes

## Project Spec Match
| Requirement | Implementation |
|-------------|----------------|
| Voting Classifier | ✅ RF + LR + NB |
| NLP | ✅ TF-IDF |
| RF | ✅ Random Forest |

## Setup

### 1. Install Dependencies
```bash
cd fakenews-ml
pip install -r requirements.txt
```

### 2. Train the Model (Optional - uses sample data if no dataset provided)
```bash
cd model
python train.py

# Or with your own dataset:
python train.py --data path/to/dataset.csv
```

### 2.1 One-Command Training Profiles

Quick profile (fast, stable, skips heavy eval):
```bash
python model/train.py --data data/WELFake_Dataset.csv --profile quick
```

Full profile (larger sample + CV + evaluation metrics):
```bash
python model/train.py --data data/WELFake_Dataset.csv --profile full
```

Best profile (full dataset + 5-fold CV + full evaluation):
```bash
python model/train.py --data data/WELFake_Dataset.csv --profile best
```

Notes:
- This is the highest-quality preset and can take significantly longer to run.
- It uses the full cleaned dataset (no sample cap), 20% test split, and deduplication.

Custom profile (manual tuning):
```bash
python model/train.py --data data/WELFake_Dataset.csv \
  --max-samples 20000 --min-text-chars 60 --cv-folds 3 --cv-jobs 1
```

### 2.2 Training Outputs

Each run saves:
- Latest model: `<MODEL_PATH>/voting_classifier.pkl` (default local path: `model/voting_classifier.pkl`)
- Latest vectorizer: `<MODEL_PATH>/tfidf_vectorizer.pkl`
- Latest metrics: `<MODEL_PATH>/training_metrics.json`
- Versioned snapshot folder: `<MODEL_PATH>/runs/<UTC_TIMESTAMP>/`

Evaluation output includes:
- Accuracy / F1 / AUC-ROC / MCC
- Confusion matrix
- Per-class classification report (REAL and FAKE)

### 2.3 Evaluate Current Model on WELFake

Run evaluation with the already saved model artifacts:

```bash
python model/evaluate_welfake.py --data data/WELFake_Dataset.csv
```

Optional sampled run and JSON report:

```bash
python model/evaluate_welfake.py --data data/WELFake_Dataset.csv --limit 5000 --output model/welfake_eval.json
```

### 3. Run the Service
```bash
# Development
python app.py

# Production
gunicorn --bind 0.0.0.0:5001 app:app
```

## API Endpoints

### Health Check
```
GET /
Response: { "status": "healthy", "service": "fakenews-ml" }
```

### Predict
```
POST /predict
Content-Type: application/json

Request:
{ "text": "news article content..." }

Response:
{
  "prediction": "FAKE" | "REAL",
  "confidence": 85.5,
  "details": {
    "votes": { "rf": "FAKE", "lr": "REAL", "nb": "FAKE" },
    "probabilities": { "fake": 0.75, "real": 0.25 },
    "flags": ["Clickbait patterns detected"]
  }
}
```

### Model Info
```
GET /model-info
Response: {
  "model_type": "Voting Classifier",
  "estimators": ["Random Forest", "Logistic Regression", "Multinomial Naive Bayes"],
  "nlp": "TF-IDF Vectorizer"
}
```

## Docker

### Build
```bash
docker build -t fakenews-ml .
```

### Run
```bash
docker run -p 5001:5001 fakenews-ml
```

## Model Architecture

```
Input Text
    ↓
NLP Preprocessing (lowercase, remove stopwords, stemming)
    ↓
TF-IDF Vectorizer (max 5000 features, unigrams + bigrams)
    ↓
Voting Classifier (soft voting)
    ├── Random Forest (100 trees)
    ├── Logistic Regression
    └── Multinomial Naive Bayes
    ↓
Prediction (FAKE/REAL) + Confidence Score
```
