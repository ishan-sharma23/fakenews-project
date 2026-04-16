"""Evaluate the currently loaded FakeNewsPredictor on WELFake data.

This script uses the same core text construction as training:
combined_text = title + text

Usage examples:
    python model/evaluate_welfake.py
    python model/evaluate_welfake.py --limit 5000
    python model/evaluate_welfake.py --output model/welfake_eval.json
"""

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score

from predictor import FakeNewsPredictor

try:
    from scipy.sparse import hstack, csr_matrix

    SCIPY_AVAILABLE = True
except Exception:
    SCIPY_AVAILABLE = False


def load_welfake_samples(csv_path, min_text_chars=40, limit=0):
    """Load WELFake rows into combined text + numeric labels."""
    df = pd.read_csv(
        csv_path,
        encoding="utf-8",
        encoding_errors="ignore",
        usecols=[0, 1, 2, 3],
        dtype=str,
        low_memory=False,
    )

    if "Unnamed: 0" in df.columns:
        df = df.drop("Unnamed: 0", axis=1)

    required_cols = {"title", "text", "label"}
    missing = required_cols.difference(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")

    labels = df["label"].astype(str).str.strip().map({"0": 0, "1": 1})
    combined = (df["title"].fillna("") + " " + df["text"].fillna("")).astype(str)
    combined = combined.str.replace(r"\s+", " ", regex=True).str.strip()

    mask = labels.notna() & (combined.str.len() >= min_text_chars)
    filtered_texts = combined[mask].tolist()
    filtered_labels = labels[mask].astype(int).tolist()

    if limit and limit > 0:
        filtered_texts = filtered_texts[:limit]
        filtered_labels = filtered_labels[:limit]

    return filtered_texts, filtered_labels


def evaluate(texts, labels):
    predictor = FakeNewsPredictor()
    if not predictor.is_trained:
        raise RuntimeError("No trained model found. Train first with model/train.py.")

    processed = [predictor._preprocess_text(text) for text in texts]
    x_tfidf = predictor.vectorizer.transform(processed)

    if SCIPY_AVAILABLE:
        ling = np.vstack([predictor._extract_linguistic_features(t) for t in processed])
        x_eval = hstack([x_tfidf, csr_matrix(ling)])
    else:
        x_eval = x_tfidf

    preds = predictor.model.predict(x_eval).tolist()

    acc = accuracy_score(labels, preds)
    f1_macro = f1_score(labels, preds, average="macro")
    cm = confusion_matrix(labels, preds, labels=[0, 1]).tolist()
    report = classification_report(
        labels,
        preds,
        labels=[0, 1],
        target_names=["REAL", "FAKE"],
        output_dict=True,
        zero_division=0,
    )

    return {
        "samples": len(labels),
        "metrics": {
            "accuracy": float(acc),
            "f1_macro": float(f1_macro),
            "confusion_matrix": cm,
            "classification_report": report,
        },
    }


def main():
    script_dir = Path(__file__).resolve().parent
    default_data = script_dir.parent / "data" / "WELFake_Dataset.csv"

    parser = argparse.ArgumentParser(description="Evaluate trained model on WELFake dataset")
    parser.add_argument("--data", type=str, default=str(default_data), help="Path to WELFake CSV")
    parser.add_argument("--min-text-chars", type=int, default=40, help="Minimum combined text length")
    parser.add_argument("--limit", type=int, default=0, help="Optional sample cap (0 = all)")
    parser.add_argument("--output", type=str, default="", help="Optional JSON output path")
    args = parser.parse_args()

    texts, labels = load_welfake_samples(
        args.data,
        min_text_chars=args.min_text_chars,
        limit=args.limit,
    )
    if not texts:
        raise RuntimeError("No valid samples found after filtering.")

    result = evaluate(texts, labels)

    print("WELFake evaluation")
    print(f"Samples            | {result['samples']}")
    print(f"Accuracy           | {result['metrics']['accuracy']:.4f}")
    print(f"F1 macro           | {result['metrics']['f1_macro']:.4f}")
    print("Confusion Matrix   | rows=true, cols=pred")
    print(f"REAL row           | {result['metrics']['confusion_matrix'][0]}")
    print(f"FAKE row           | {result['metrics']['confusion_matrix'][1]}")

    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
        print(f"Saved report       | {out_path}")


if __name__ == "__main__":
    main()
