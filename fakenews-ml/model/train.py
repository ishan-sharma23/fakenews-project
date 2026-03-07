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
import os
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from predictor import FakeNewsPredictor


def load_dataset(file_path):
    """
    Load dataset from CSV file
    
    Supports:
    - WELFake: columns 'title', 'text', 'label' (0=real, 1=fake)
    - ISOT: columns 'title', 'text', 'label'
    - Custom: columns 'text'/'content', 'label'/'class'
    """
    print(f"Loading dataset from {file_path}...")
    df = pd.read_csv(file_path)
    
    print(f"Columns found: {df.columns.tolist()}")
    print(f"Total rows: {len(df)}")
    
    # Drop unnamed index column if present (WELFake has this)
    if 'Unnamed: 0' in df.columns:
        df = df.drop('Unnamed: 0', axis=1)
    
    # Find text column
    text_col = None
    for col in ['text', 'content', 'news', 'article', 'Text']:
        if col in df.columns:
            text_col = col
            break
    
    # For WELFake, combine title + text for better context
    if 'title' in df.columns and 'text' in df.columns:
        print("WELFake format detected: combining 'title' + 'text'")
        df['combined_text'] = df['title'].fillna('') + ' ' + df['text'].fillna('')
        text_col = 'combined_text'
    
    if text_col is None:
        raise ValueError(f"Could not find text column. Available: {df.columns.tolist()}")
    
    # Find label column
    label_col = None
    for col in ['label', 'Label', 'class', 'target', 'fake']:
        if col in df.columns:
            label_col = col
            break
    
    if label_col is None:
        raise ValueError(f"Could not find label column. Available: {df.columns.tolist()}")
    
    print(f"Using '{text_col}' as text column and '{label_col}' as label column")
    
    # Remove rows with NaN in text or label
    initial_len = len(df)
    df = df.dropna(subset=[label_col])
    if text_col != 'combined_text':
        df = df.dropna(subset=[text_col])
    print(f"Removed {initial_len - len(df)} rows with missing values")
    
    # Get texts and labels
    texts = df[text_col].fillna('').astype(str).tolist()
    labels = df[label_col].tolist()
    
    # Convert string labels to numeric if needed
    if len(labels) > 0 and isinstance(labels[0], str):
        label_map = {'real': 0, 'true': 0, 'Real': 0, 'TRUE': 0,
                     'fake': 1, 'false': 1, 'Fake': 1, 'FALSE': 1}
        labels = [label_map.get(str(l).strip(), 0) for l in labels]
    
    labels = [int(l) for l in labels]
    
    # Filter out empty texts
    filtered = [(t, l) for t, l in zip(texts, labels) if len(t.strip()) > 20]
    texts, labels = zip(*filtered) if filtered else ([], [])
    texts, labels = list(texts), list(labels)
    
    print(f"\nDataset loaded successfully!")
    print(f"Total samples: {len(texts)}")
    print(f"Label distribution: REAL={labels.count(0)}, FAKE={labels.count(1)}")
    print(f"Balance ratio: {labels.count(0)/len(labels)*100:.1f}% REAL, {labels.count(1)/len(labels)*100:.1f}% FAKE")
    
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
    
    predictions = []
    for text in X_test:
        result = predictor.predict(text)
        pred = 1 if result['prediction'] == 'FAKE' else 0
        predictions.append(pred)
    
    accuracy = accuracy_score(y_test, predictions)
    print(f"\nAccuracy: {accuracy:.4f}")
    
    print("\nClassification Report:")
    print(classification_report(y_test, predictions, target_names=['REAL', 'FAKE']))
    
    print("\nConfusion Matrix:")
    cm = confusion_matrix(y_test, predictions)
    print(f"                Predicted")
    print(f"              REAL    FAKE")
    print(f"Actual REAL   {cm[0][0]:4}    {cm[0][1]:4}")
    print(f"       FAKE   {cm[1][0]:4}    {cm[1][1]:4}")
    
    return accuracy


def main():
    # Default data path: ../data/WELFake_Dataset.csv (relative to this script)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_data_path = os.path.join(script_dir, '..', 'data', 'WELFake_Dataset.csv')
    
    parser = argparse.ArgumentParser(description='Train Fake News Detection Model')
    parser.add_argument('--data', type=str, default=default_data_path, help='Path to training dataset CSV')
    parser.add_argument('--sample', action='store_true', help='Use sample dataset for demo')
    parser.add_argument('--test-size', type=float, default=0.25, help='Test set size (default: 0.25)')
    args = parser.parse_args()
    
    # Load or create dataset
    if args.sample:
        print("Using sample dataset for demo.")
        texts, labels = create_sample_dataset()
    elif os.path.exists(args.data):
        texts, labels = load_dataset(args.data)
    else:
        print(f"Dataset not found at: {args.data}")
        print("Using sample dataset instead.")
        print("\nFor better results, download a real dataset:")
        print("  - WELFake: https://www.kaggle.com/datasets/saurabhshahane/fake-news-classification")
        texts, labels = create_sample_dataset()
    
    # Split data (increased test size to 25% for better validation)
    print(f"\nSplitting data (test size: {args.test_size})...")
    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, 
        test_size=args.test_size, 
        random_state=42,
        stratify=labels
    )
    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")
    
    # Train model
    predictor = FakeNewsPredictor()
    predictor.train(X_train, y_train)
    
    # Cross-validation to detect overfitting
    print("\n" + "="*50)
    print("Cross-Validation (5-fold) to detect overfitting:")
    print("="*50)
    from sklearn.model_selection import cross_val_score
    
    # Preprocess and vectorize for CV
    processed_train = [predictor._preprocess_text(t) for t in X_train]
    X_train_vec = predictor.vectorizer.transform(processed_train)
    
    cv_scores = cross_val_score(predictor.model, X_train_vec, y_train, cv=5, scoring='accuracy')
    print(f"CV Scores: {[f'{s:.4f}' for s in cv_scores]}")
    print(f"CV Mean: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
    
    # Evaluate on test set
    test_accuracy = evaluate_model(predictor, X_test, y_test)
    
    # Check for overfitting
    print("\n" + "="*50)
    print("OVERFITTING CHECK:")
    print("="*50)
    train_accuracy = evaluate_model(predictor, X_train[:200], y_train[:200])  # Sample of training
    gap = train_accuracy - test_accuracy
    
    if gap > 0.10:
        print(f"⚠️  WARNING: Possible overfitting detected!")
        print(f"   Train accuracy: {train_accuracy:.4f}")
        print(f"   Test accuracy:  {test_accuracy:.4f}")
        print(f"   Gap: {gap:.4f} (>10%)")
    else:
        print(f"✅ Model appears well-generalized")
        print(f"   Train accuracy: {train_accuracy:.4f}")
        print(f"   Test accuracy:  {test_accuracy:.4f}")
        print(f"   Gap: {gap:.4f}")
    
    print("\n" + "="*50)
    print("Training Complete!")
    print(f"Model saved to: {predictor.model_path}")
    print(f"Vectorizer saved to: {predictor.vectorizer_path}")
    print(f"Final Test Accuracy: {test_accuracy:.4f}")
    print(f"Cross-Validation Accuracy: {cv_scores.mean():.4f}")
    print("="*50)


if __name__ == '__main__':
    main()
