"""
train.py - Train Random Forest model để phát hiện bot traffic
Input:  dataset.csv (merged from real log + synthetic)
Output: model.pkl
"""

import pandas as pd
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import StandardScaler

FEATURES = [
    "requests_per_minute",
    "session_duration",
    "unique_pages",
    "avg_click_interval",
    "is_headless",
    "user_agent_length",
    "visit_count",
]

LABEL = "label"
MODEL_FILE = "model.pkl"
DATASET_FILE = "dataset.csv"


def load_and_merge_datasets():
    """Load real log data + synthetic data, merge thành 1 dataset"""
    dfs = []

    # 1. Real parsed log data
    if os.path.exists(DATASET_FILE):
        df_real = pd.read_csv(DATASET_FILE)
        # Drop IP column nếu có
        if "ip" in df_real.columns:
            df_real = df_real.drop(columns=["ip"])
        dfs.append(df_real)
        print(f"[OK] Loaded real log data: {len(df_real)} rows")
    else:
        print("[!] dataset.csv not found. Run parse_log.py first.")

    # 2. Synthetic data
    if os.path.exists("synthetic_data.csv"):
        df_syn = pd.read_csv("synthetic_data.csv")
        dfs.append(df_syn)
        print(f"[OK] Loaded synthetic data: {len(df_syn)} rows")
    else:
        print("[!] synthetic_data.csv not found. Run generate_synthetic.py first.")

    if not dfs:
        raise RuntimeError("No data available. Run parse_log.py and generate_synthetic.py first.")

    df = pd.concat(dfs, ignore_index=True)
    df = df.dropna(subset=FEATURES + [LABEL])
    df[LABEL] = df[LABEL].astype(int)
    return df


def train(df: pd.DataFrame):
    X = df[FEATURES].values
    y = df[LABEL].values

    print(f"\n=== Training Dataset ===")
    print(f"Total samples  : {len(y)}")
    print(f"Real users (0) : {(y == 0).sum()}")
    print(f"Bots       (1) : {(y == 1).sum()}")
    print(f"Features       : {FEATURES}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=42,
        class_weight="balanced",  # handle class imbalance
    )

    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    print(f"\n=== Evaluation (Test Set) ===")
    print(f"Accuracy: {acc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["Real User", "Bot"]))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    # Cross-validation
    cv_scores = cross_val_score(model, X, y, cv=5, scoring="accuracy")
    print(f"\n5-Fold CV Accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Feature importance
    print("\nFeature Importance:")
    for name, imp in sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1]):
        print(f"  {name:<25} {imp:.4f}")

    return model


def save_model(model, filepath: str):
    with open(filepath, "wb") as f:
        pickle.dump({"model": model, "features": FEATURES}, f)
    print(f"\n[OK] Model saved to {filepath}")


if __name__ == "__main__":
    df = load_and_merge_datasets()
    model = train(df)
    save_model(model, MODEL_FILE)
