"""
Training Script for Fake News Voting Classifier

This script trains the model on a dataset.
You can use datasets like:
- LIAR dataset
- ISOT Fake News Dataset
- FakeNewsNet

Usage:
    python train.py --data path/to/dataset.csv
    
CSV Format Expected:
    text,label
    "news article...",0  (0 = REAL, 1 = FAKE)
"""

import argparse
import datetime
import json
import math
import os
import re
import random
import shutil
from urllib.parse import urlparse

import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, roc_auc_score, matthews_corrcoef, f1_score, confusion_matrix, classification_report
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline as SkPipeline
from predictor import FakeNewsPredictor

try:
    import requests as req_lib

    REQUESTS_AVAILABLE = True
except Exception:
    REQUESTS_AVAILABLE = False

try:
    from scipy.sparse import hstack, csr_matrix

    SCIPY_AVAILABLE = True
except Exception:
    SCIPY_AVAILABLE = False


def _read_and_clean_dataset(file_path, max_samples=None, min_text_chars=20, deduplicate=True):
    """Load and normalize dataset into (text, label, row_index) tuples."""
    print(f"Loading dataset from {file_path}...")
    df = pd.read_csv(
        file_path,
        encoding='utf-8',
        encoding_errors='ignore',
        usecols=[0, 1, 2, 3],
        dtype=str,
        low_memory=False,
    )

    print(f"Columns found: {df.columns.tolist()}")
    print(f"Total rows: {len(df)}")

    # Drop unnamed index column if present (WELFake has this)
    if 'Unnamed: 0' in df.columns:
        df = df.drop('Unnamed: 0', axis=1)

    text_col = None
    for col in ['text', 'content', 'news', 'article', 'Text']:
        if col in df.columns:
            text_col = col
            break

    if 'title' in df.columns and 'text' in df.columns:
        print("WELFake format detected: combining 'title' + 'text'")
        df['combined_text'] = df['title'].fillna('') + ' ' + df['text'].fillna('')
        text_col = 'combined_text'

    if text_col is None:
        raise ValueError(f"Could not find text column. Available: {df.columns.tolist()}")

    label_col = None
    for col in ['label', 'Label', 'class', 'target', 'fake']:
        if col in df.columns:
            label_col = col
            break

    if label_col is None:
        raise ValueError(f"Could not find label column. Available: {df.columns.tolist()}")

    print(f"Using '{text_col}' as text column and '{label_col}' as label column")

    initial_len = len(df)
    df = df.dropna(subset=[label_col])
    if text_col != 'combined_text':
        df = df.dropna(subset=[text_col])
    print(f"Removed {initial_len - len(df)} rows with missing values")

    texts = df[text_col].fillna('').astype(str).tolist()
    raw_labels = df[label_col].tolist()
    row_indices = list(df.index)

    valid_label_map = {
        '0': 0,
        '1': 1,
        'real': 0,
        'true': 0,
        'Real': 0,
        'TRUE': 0,
        'fake': 1,
        'false': 1,
        'Fake': 1,
        'FALSE': 1,
    }

    cleaned = []
    seen_keys = set()
    total_rows = len(texts)
    for i, (idx, t, l) in enumerate(zip(row_indices, texts, raw_labels), start=1):
        l_stripped = str(l).strip()
        if l_stripped in valid_label_map:
            # Strip Reuters wire prefix to reduce source-style leakage.
            clean_text = re.sub(r'^Reuters\s*-?\s*', '', t, flags=re.IGNORECASE)
            if deduplicate:
                normalized = re.sub(r'\s+', ' ', clean_text).strip()
                dedup_key = normalized.lower()
                if dedup_key in seen_keys:
                    continue
                seen_keys.add(dedup_key)
            else:
                normalized = clean_text.strip()

            if len(normalized) >= min_text_chars:
                cleaned.append((clean_text, valid_label_map[l_stripped], idx))

        if i % 5000 == 0 or i == total_rows:
            print(f"Cleaning progress: {i}/{total_rows} rows processed, kept={len(cleaned)}")

    if max_samples and len(cleaned) > max_samples:
        real_rows = [row for row in cleaned if row[1] == 0]
        fake_rows = [row for row in cleaned if row[1] == 1]

        total_rows = max(len(cleaned), 1)
        target_real = max(1, int(max_samples * (len(real_rows) / total_rows)))
        target_fake = max(1, max_samples - target_real)

        rng = random.Random(42)
        rng.shuffle(real_rows)
        rng.shuffle(fake_rows)

        sampled = real_rows[:target_real] + fake_rows[:target_fake]
        rng.shuffle(sampled)
        cleaned = sampled
        print(f"Applied sample cap: keeping {len(cleaned)} rows (max_samples={max_samples})")

    print(
        f"Kept {len(cleaned)} rows with valid labels "
        f"(dropped {len(texts) - len(cleaned)} corrupted/short rows)"
    )

    return cleaned


def load_dataset(file_path, max_samples=None, min_text_chars=20, deduplicate=True):
    """
    Load dataset from CSV file
    
    Supports:
    - WELFake: columns 'title', 'text', 'label' (0=real, 1=fake)
    - ISOT: columns 'title', 'text', 'label'
    - Custom: columns 'text'/'content', 'label'/'class'
    """
    cleaned = _read_and_clean_dataset(
        file_path,
        max_samples=max_samples,
        min_text_chars=min_text_chars,
        deduplicate=deduplicate,
    )

    # Requested deterministic shuffle for random-mode loading.
    random.seed(42)
    random.shuffle(cleaned)

    texts = [t for t, _, _ in cleaned]
    labels = [l for _, l, _ in cleaned]

    real_count = labels.count(0)
    fake_count = labels.count(1)
    total = max(len(labels), 1)
    real_pct = (real_count / total) * 100
    fake_pct = (fake_count / total) * 100
    imbalance = abs(real_pct - fake_pct)

    print("\nDataset loaded successfully!")
    print(f"Total samples: {len(texts)}")
    print(f"Label distribution: REAL={real_count}, FAKE={fake_count}")
    print(f"Balance ratio: {real_pct:.1f}% REAL, {fake_pct:.1f}% FAKE")
    if imbalance > 15:
        print(f"WARNING: Class imbalance detected ({imbalance:.1f}% difference)")

    return texts, labels


def create_sample_dataset():
    """
    Create a sample dataset for demonstration
    In production, replace with real dataset
    """
    print("Creating sample dataset for demonstration...")
    
    # Sample fake news examples
    fake_news = [
        "BREAKING: You won't believe what happens next! Scientists shocked by discovery!",
        "SHOCKING: Secret government documents reveal mind-blowing conspiracy!",
        "Doctors HATE this one weird trick that cures everything overnight!",
        "EXPOSED: What they don't want you to know about vaccines!",
        "URGENT: Share this before they delete it! The truth they're hiding!",
        "BOMBSHELL: Celebrity caught in massive scandal you won't believe!",
        "WARNING: This common food is secretly killing you!",
        "INCREDIBLE: Man discovers ancient secret that changes everything!",
        "ALERT: Your bank account is in danger! Share immediately!",
        "UNBELIEVABLE: What this politician did will shock you!",
    ] * 50  # Repeat for more training data
    
    # Sample real news examples
    real_news = [
        "The Federal Reserve announced today that interest rates will remain unchanged.",
        "Scientists at MIT published a study examining climate change effects on coastal regions.",
        "The stock market closed slightly higher today following positive earnings reports.",
        "Local officials met to discuss infrastructure improvements for the downtown area.",
        "Researchers conducted a peer-reviewed study on the effectiveness of new treatments.",
        "The city council voted to approve the new budget for fiscal year 2026.",
        "According to the Department of Labor, unemployment rates decreased by 0.2%.",
        "A new report from the WHO details global health trends for the past decade.",
        "The university announced new scholarship programs for incoming students.",
        "Traffic authorities reported a decrease in accidents following new safety measures.",
    ] * 50  # Repeat for more training data
    
    texts = fake_news + real_news
    labels = [1] * len(fake_news) + [0] * len(real_news)  # 1 = FAKE, 0 = REAL
    
    # Shuffle
    import random
    combined = list(zip(texts, labels))
    random.shuffle(combined)
    texts, labels = zip(*combined)
    
    print(f"Sample dataset size: {len(texts)}")
    print(f"Label distribution: REAL={labels.count(0)}, FAKE={labels.count(1)}")
    
    return list(texts), list(labels)


def evaluate_model(predictor, X_test, y_test):
    """Evaluate the trained model"""
    print("\nEvaluating model...")

    processed = [predictor._preprocess_text(t) for t in X_test]
    X_test_tfidf = predictor.vectorizer.transform(processed)
    if SCIPY_AVAILABLE:
        ling = np.vstack([predictor._extract_linguistic_features(t) for t in processed])
        X_test_vec = hstack([X_test_tfidf, csr_matrix(ling)])
    else:
        X_test_vec = X_test_tfidf

    predictions = predictor.model.predict(X_test_vec)
    probabilities = predictor.model.predict_proba(X_test_vec)
    fake_probs = probabilities[:, 1]

    accuracy = accuracy_score(y_test, predictions)
    f1_macro = f1_score(y_test, predictions, average='macro')
    try:
        auc_roc = roc_auc_score(y_test, fake_probs)
    except Exception:
        auc_roc = 0.5
    mcc = matthews_corrcoef(y_test, predictions)

    print("\nMetric       | Score")
    print("----------------------")
    print(f"Accuracy     | {accuracy:.4f}")
    print(f"F1 macro     | {f1_macro:.4f}")
    print(f"AUC-ROC      | {auc_roc:.4f}")
    print(f"MCC          | {mcc:.4f}")

    cm = confusion_matrix(y_test, predictions, labels=[0, 1])
    report = classification_report(
        y_test,
        predictions,
        labels=[0, 1],
        target_names=['REAL', 'FAKE'],
        output_dict=True,
        zero_division=0,
    )

    print("\nConfusion Matrix (rows=true, cols=pred):")
    print("             Pred REAL   Pred FAKE")
    print(f"True REAL     {int(cm[0][0]):8d}   {int(cm[0][1]):8d}")
    print(f"True FAKE     {int(cm[1][0]):8d}   {int(cm[1][1]):8d}")

    print("\nClass Report")
    print("Class | Precision | Recall | F1")
    print("---------------------------------")
    print(f"REAL  | {report['REAL']['precision']:.4f}    | {report['REAL']['recall']:.4f} | {report['REAL']['f1-score']:.4f}")
    print(f"FAKE  | {report['FAKE']['precision']:.4f}    | {report['FAKE']['recall']:.4f} | {report['FAKE']['f1-score']:.4f}")

    return {
        'accuracy': accuracy,
        'f1_macro': f1_macro,
        'auc_roc': auc_roc,
        'mcc': mcc,
        'confusion_matrix': cm.tolist(),
        'classification_report': report,
    }


def _save_artifact_snapshot(model_path, vectorizer_path, metrics_path, snapshot_dir=None):
    base_dir = os.path.dirname(model_path)
    runs_dir = snapshot_dir or os.path.join(base_dir, 'runs')
    ts = datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    out_dir = os.path.join(runs_dir, ts)
    os.makedirs(out_dir, exist_ok=True)

    model_snapshot = os.path.join(out_dir, f'voting_classifier_{ts}.pkl')
    vectorizer_snapshot = os.path.join(out_dir, f'tfidf_vectorizer_{ts}.pkl')
    metrics_snapshot = os.path.join(out_dir, f'training_metrics_{ts}.json')

    shutil.copy2(model_path, model_snapshot)
    shutil.copy2(vectorizer_path, vectorizer_snapshot)
    if os.path.exists(metrics_path):
        shutil.copy2(metrics_path, metrics_snapshot)

    return {
        'directory': out_dir,
        'model': model_snapshot,
        'vectorizer': vectorizer_snapshot,
        'metrics': metrics_snapshot if os.path.exists(metrics_snapshot) else '',
    }


def fetch_newsapi_data(api_key, queries, pages=2):
    if not REQUESTS_AVAILABLE or not api_key:
        return [], []

    credible_domains = {'bbc.com', 'reuters.com', 'apnews.com', 'theguardian.com', 'npr.org'}
    low_cred_domains = {'infowars.com', 'naturalnews.com', 'beforeitsnews.com'}

    texts = []
    labels = []

    for query in queries:
        for page in range(1, pages + 1):
            try:
                response = req_lib.get(
                    'https://newsapi.org/v2/everything',
                    params={
                        'q': query,
                        'language': 'en',
                        'sortBy': 'publishedAt',
                        'pageSize': 100,
                        'page': page,
                        'apiKey': api_key,
                    },
                    timeout=20,
                )
            except Exception as e:
                print(f"NewsAPI request failed for '{query}' page {page}: {e}")
                continue

            if response.status_code != 200:
                print(f"NewsAPI error for '{query}' page {page}: status {response.status_code}")
                continue

            payload = response.json()
            for article in payload.get('articles', []):
                url = article.get('url', '')
                domain = urlparse(url).netloc.lower().replace('www.', '')

                label = None
                if any(domain.endswith(d) for d in credible_domains):
                    label = 0
                elif any(domain.endswith(d) for d in low_cred_domains):
                    label = 1
                else:
                    continue

                content = article.get('content') or article.get('description') or article.get('title', '')
                if content and len(content.strip()) > 20:
                    texts.append(content)
                    labels.append(label)

    return texts, labels


def incremental_train(predictor, new_texts, new_labels):
    if not new_texts:
        return False

    processed_new = [predictor._preprocess_text(t) for t in new_texts]
    X_new_tfidf = predictor.vectorizer.transform(processed_new)

    if SCIPY_AVAILABLE:
        ling = np.vstack([predictor._extract_linguistic_features(t) for t in processed_new])
        X_new = hstack([X_new_tfidf, csr_matrix(ling)])
    else:
        X_new = X_new_tfidf

    nb = predictor.model.named_estimators_.get('nb')
    if hasattr(nb, 'partial_fit'):
        nb.partial_fit(X_new, new_labels, classes=[0, 1])
        # Refresh hard-voting wrapper state by re-fitting final voting ensemble on new chunk if possible.
        if hasattr(predictor.model, 'estimators_'):
            pass
    else:
        print("Incremental NB update skipped: estimator does not support partial_fit")
        return False

    joblib.dump(
        {
            'model': predictor.model,
            'tfidf_feature_count': predictor.tfidf_feature_count,
        },
        predictor.model_path,
    )
    print(f"Incremental update applied on {len(new_texts)} new samples")
    return True


def main():
    # Default data path: ../data/WELFake_Dataset.csv (relative to this script)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_data_path = os.path.join(script_dir, '..', 'data', 'WELFake_Dataset.csv')
    
    parser = argparse.ArgumentParser(description='Train Fake News Detection Model')
    parser.add_argument('--data', type=str, default=default_data_path, help='Path to training dataset CSV')
    parser.add_argument('--sample', action='store_true', help='Use sample dataset for demo')
    parser.add_argument('--test-size', type=float, default=0.25, help='Test set size (default: 0.25)')
    parser.add_argument('--split-mode', type=str, default='random', choices=['random', 'temporal'], help='Split strategy: random or temporal')
    parser.add_argument('--newsapi-key', type=str, default='', help='NewsAPI key (falls back to NEWSAPI_KEY env var)')
    parser.add_argument('--newsapi-queries', type=str, default='misinformation,fake news,disinformation', help='Comma-separated NewsAPI queries')
    parser.add_argument('--use-smote', action='store_true', help='Apply SMOTE over vectorized training data')
    parser.add_argument('--max-samples', type=int, default=120000, help='Cap cleaned dataset size for memory-safe training (0 disables cap)')
    parser.add_argument('--min-text-chars', type=int, default=40, help='Minimum cleaned text length to keep a sample')
    parser.add_argument('--metrics-out', type=str, default='', help='Optional path to save JSON training metrics')
    parser.add_argument('--deduplicate', dest='deduplicate', action='store_true', help='Drop duplicate articles during cleaning')
    parser.add_argument('--no-deduplicate', dest='deduplicate', action='store_false', help='Keep duplicates in dataset')
    parser.add_argument('--cv-folds', type=int, default=3, help='Number of cross-validation folds (default: 3)')
    parser.add_argument('--cv-jobs', type=int, default=1, help='Parallel jobs for CV (default: 1 for stability)')
    parser.add_argument('--skip-eval', action='store_true', help='Skip CV/test evaluation for faster training runs')
    parser.add_argument('--profile', type=str, default='custom', choices=['quick', 'full', 'best', 'custom'], help='Training preset profile')
    parser.add_argument('--snapshot-dir', type=str, default='', help='Optional directory for timestamped artifact snapshots')
    parser.set_defaults(deduplicate=True)
    args = parser.parse_args()

    if args.profile == 'quick':
        args.max_samples = 8000
        args.min_text_chars = 60
        args.cv_folds = 2
        args.cv_jobs = 1
        args.skip_eval = True
        print("Using QUICK profile (fast training, skip eval).")
    elif args.profile == 'full':
        args.max_samples = 50000
        args.min_text_chars = 40
        args.cv_folds = 3
        args.cv_jobs = 1
        args.skip_eval = False
        print("Using FULL profile (larger sample + evaluation).")
    elif args.profile == 'best':
        args.max_samples = 0
        args.min_text_chars = 20
        args.cv_folds = 5
        args.cv_jobs = 1
        args.test_size = 0.2
        args.skip_eval = False
        args.deduplicate = True
        print("Using BEST profile (full dataset + stricter evaluation).")

    effective_max_samples = args.max_samples if args.max_samples and args.max_samples > 0 else None
    
    # Load or create dataset
    if args.sample:
        print("Using sample dataset for demo.")
        texts, labels = create_sample_dataset()
    elif os.path.exists(args.data):
        if args.split_mode == 'temporal':
            cleaned = _read_and_clean_dataset(
                args.data,
                max_samples=effective_max_samples,
                min_text_chars=args.min_text_chars,
                deduplicate=args.deduplicate,
            )
            cleaned = sorted(cleaned, key=lambda x: x[2])
            texts = [t for t, _, _ in cleaned]
            labels = [l for _, l, _ in cleaned]

            real_count = labels.count(0)
            fake_count = labels.count(1)
            total = max(len(labels), 1)
            real_pct = (real_count / total) * 100
            fake_pct = (fake_count / total) * 100
            imbalance = abs(real_pct - fake_pct)
            print("\nDataset loaded successfully! (temporal order preserved)")
            print(f"Total samples: {len(texts)}")
            print(f"Label distribution: REAL={real_count}, FAKE={fake_count}")
            print(f"Balance ratio: {real_pct:.1f}% REAL, {fake_pct:.1f}% FAKE")
            if imbalance > 15:
                print(f"WARNING: Class imbalance detected ({imbalance:.1f}% difference)")
        else:
            texts, labels = load_dataset(
                args.data,
                max_samples=effective_max_samples,
                min_text_chars=args.min_text_chars,
                deduplicate=args.deduplicate,
            )
    else:
        print(f"Dataset not found at: {args.data}")
        print("Using sample dataset instead.")
        print("\nFor better results, download a real dataset:")
        print("  - WELFake: https://www.kaggle.com/datasets/saurabhshahane/fake-news-classification")
        texts, labels = create_sample_dataset()
    
    temporal_test_ratio = 0.20
    display_test_size = temporal_test_ratio if args.split_mode == 'temporal' else args.test_size
    print(f"\nSplitting data (mode: {args.split_mode}, test size: {display_test_size})...")
    if args.split_mode == 'temporal':
        split_idx = int(len(texts) * (1 - temporal_test_ratio))
        X_train, X_test = texts[:split_idx], texts[split_idx:]
        y_train, y_test = labels[:split_idx], labels[split_idx:]
    else:
        X_train, X_test, y_train, y_test = train_test_split(
            texts,
            labels,
            test_size=args.test_size,
            random_state=42,
            stratify=labels,
        )
    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")

    predictor = FakeNewsPredictor()

    # Training path with optional SMOTE support.
    processed_train = [predictor._preprocess_text(t) for t in X_train]
    predictor.vectorizer = predictor._create_vectorizer()
    X_train_tfidf = predictor.vectorizer.fit_transform(processed_train)
    predictor.tfidf_feature_count = X_train_tfidf.shape[1]

    if SCIPY_AVAILABLE:
        ling = np.vstack([predictor._extract_linguistic_features(t) for t in processed_train])
        X_train_vec = hstack([X_train_tfidf, csr_matrix(ling)])
    else:
        X_train_vec = X_train_tfidf

    if args.use_smote:
        try:
            from imblearn.over_sampling import SMOTE

            X_train_vec, y_train = SMOTE(random_state=42).fit_resample(X_train_vec, y_train)
            print("Applied SMOTE to training vectors")
        except ImportError:
            print("WARNING: imbalanced-learn not installed; skipping SMOTE")

    predictor.model = predictor._create_model()
    predictor.model.set_params(nb__n_tfidf_cols=predictor.tfidf_feature_count)
    predictor.model.fit(X_train_vec, y_train)
    predictor.is_trained = True

    joblib.dump(
        {
            'model': predictor.model,
            'tfidf_feature_count': predictor.tfidf_feature_count,
        },
        predictor.model_path,
    )
    joblib.dump(predictor.vectorizer, predictor.vectorizer_path)
    
    cv_scores = np.array([])
    test_metrics = {
        'accuracy': math.nan,
        'f1_macro': math.nan,
        'auc_roc': math.nan,
        'mcc': math.nan,
    }
    train_metrics = {
        'accuracy': math.nan,
        'f1_macro': math.nan,
        'auc_roc': math.nan,
        'mcc': math.nan,
    }
    gap = math.nan

    if args.skip_eval:
        print("\nSkipping CV and evaluation (--skip-eval enabled).")
    else:
        # Cross-validation to detect overfitting
        print("\n" + "="*50)
        print(f"Cross-Validation ({args.cv_folds}-fold) to detect overfitting:")
        print("="*50)

        cv_pipe = SkPipeline(
            [
                (
                    'tfidf',
                    TfidfVectorizer(
                        max_features=50000,
                        ngram_range=(1, 2),
                        min_df=2,
                        max_df=0.95,
                        sublinear_tf=True,
                        stop_words='english',
                    ),
                ),
                ('clf', predictor.model),
            ]
        )
        try:
            cv_scores = cross_val_score(
                cv_pipe,
                X_train,
                y_train,
                cv=max(2, args.cv_folds),
                scoring='accuracy',
                n_jobs=max(1, args.cv_jobs),
            )
            print(f"CV Scores: {[f'{s:.4f}' for s in cv_scores]}")
            print(f"CV Mean: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
        except KeyboardInterrupt:
            print("CV interrupted by user. Continuing with train/test metrics.")
        except Exception as cv_error:
            print(f"WARNING: CV failed ({cv_error}). Continuing with train/test metrics.")

        # Evaluate on test set
        test_metrics = evaluate_model(predictor, X_test, y_test)

        # Check for overfitting
        print("\n" + "="*50)
        print("OVERFITTING CHECK:")
        print("="*50)
        train_metrics = evaluate_model(predictor, X_train[:200], y_train[:200])
        gap = train_metrics['accuracy'] - test_metrics['accuracy']
        
        if gap > 0.10:
            print(f"⚠️  WARNING: Possible overfitting detected!")
            print(f"   Train accuracy: {train_metrics['accuracy']:.4f}")
            print(f"   Test accuracy:  {test_metrics['accuracy']:.4f}")
            print(f"   Gap: {gap:.4f} (>10%)")
        else:
            print(f"✅ Model appears well-generalized")
            print(f"   Train accuracy: {train_metrics['accuracy']:.4f}")
            print(f"   Test accuracy:  {test_metrics['accuracy']:.4f}")
            print(f"   Gap: {gap:.4f}")

    newsapi_key = args.newsapi_key or os.environ.get('NEWSAPI_KEY', '')
    queries = [q.strip() for q in args.newsapi_queries.split(',') if q.strip()]
    incremental_applied = False
    incremental_count = 0
    if newsapi_key:
        print("\nFetching NewsAPI data for incremental update...")
        new_texts, new_labels = fetch_newsapi_data(newsapi_key, queries)
        incremental_count = len(new_texts)
        if new_texts:
            incremental_applied = incremental_train(predictor, new_texts, new_labels)
        else:
            print("No labelled NewsAPI samples found for incremental training")
    
    print("\n" + "="*50)
    print("Training Complete!")
    print(f"Model saved to: {predictor.model_path}")
    print(f"Vectorizer saved to: {predictor.vectorizer_path}")
    print("\nFinal Summary")
    print("Metric            | Value")
    print("--------------------------")
    print(f"Accuracy          | {test_metrics['accuracy']:.4f}")
    print(f"F1 macro          | {test_metrics['f1_macro']:.4f}")
    print(f"AUC-ROC           | {test_metrics['auc_roc']:.4f}")
    print(f"MCC               | {test_metrics['mcc']:.4f}")
    if cv_scores.size > 0:
        print(f"CV mean accuracy  | {cv_scores.mean():.4f}")
        print(f"CV std (x2)       | {(cv_scores.std() * 2):.4f}")
    else:
        print("CV mean accuracy  | n/a")
        print("CV std (x2)       | n/a")
    print(f"Incremental rows  | {incremental_count}")
    print(f"Incremental done  | {incremental_applied}")
    print("="*50)

    metrics_path = args.metrics_out or os.path.join(os.path.dirname(predictor.model_path), 'training_metrics.json')
    metrics_payload = {
        'dataset': {
            'path': args.data,
            'split_mode': args.split_mode,
            'max_samples': effective_max_samples,
            'min_text_chars': args.min_text_chars,
            'deduplicate': args.deduplicate,
            'train_size': len(X_train),
            'test_size': len(X_test),
            'label_distribution': {
                'real': int(sum(1 for y in labels if y == 0)),
                'fake': int(sum(1 for y in labels if y == 1)),
            },
        },
        'metrics': {
            'test': test_metrics,
            'train_probe': train_metrics,
            'gap': float(gap),
            'cv_scores': [float(s) for s in cv_scores],
            'cv_mean': float(cv_scores.mean()) if cv_scores.size > 0 else math.nan,
            'cv_std_x2': float(cv_scores.std() * 2) if cv_scores.size > 0 else math.nan,
        },
        'incremental': {
            'rows': int(incremental_count),
            'applied': bool(incremental_applied),
        },
    }

    os.makedirs(os.path.dirname(metrics_path), exist_ok=True)
    with open(metrics_path, 'w', encoding='utf-8') as f:
        json.dump(metrics_payload, f, indent=2)

    snapshot_info = _save_artifact_snapshot(
        predictor.model_path,
        predictor.vectorizer_path,
        metrics_path,
        snapshot_dir=args.snapshot_dir.strip() or None,
    )

    metrics_payload['snapshot'] = snapshot_info
    with open(metrics_path, 'w', encoding='utf-8') as f:
        json.dump(metrics_payload, f, indent=2)

    print(f"Metrics saved to: {metrics_path}")
    print(f"Snapshot saved to: {snapshot_info['directory']}")


if __name__ == '__main__':
    main()
