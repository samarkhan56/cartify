"""Batch advertisement inference using only the saved models and their config."""
import json
import logging
import math
from dataclasses import dataclass
from numbers import Real
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor


MAX_CANDIDATES = 1000
ARTIFACT_DIR = Path(__file__).resolve().parent / "models" / "ad_recommendation"
logger = logging.getLogger(__name__)


class AdInputError(ValueError):
    """The caller supplied an invalid inference request."""


class AdModelUnavailableError(RuntimeError):
    """Advertisement artifacts were unavailable or incompatible at startup."""


@dataclass(frozen=True)
class AdModels:
    classifier: HistGradientBoostingClassifier
    regressor: HistGradientBoostingRegressor
    feature_columns: tuple[str, ...]
    threshold: float
    model_name: str
    version: str


def _load_models(directory=ARTIFACT_DIR):
    with (directory / "cartify_ad_model_config.json").open(encoding="utf-8") as handle:
        config = json.load(handle)
    columns = config.get("feature_columns")
    if (not isinstance(columns, list) or not columns
            or any(not isinstance(column, str) or not column.strip() for column in columns)
            or len(set(columns)) != len(columns)):
        raise ValueError("Invalid advertisement feature_columns configuration.")
    threshold = config.get("classification_threshold")
    if (isinstance(threshold, bool) or not isinstance(threshold, Real)
            or not math.isfinite(threshold) or not 0 <= threshold <= 1):
        raise ValueError("Invalid advertisement classification threshold.")

    classifier = joblib.load(directory / "cartify_ad_demand_classifier.joblib")
    regressor = joblib.load(directory / "cartify_ad_volume_regressor.joblib")
    if not isinstance(classifier, HistGradientBoostingClassifier):
        raise ValueError("Unexpected advertisement classifier type.")
    if not isinstance(regressor, HistGradientBoostingRegressor):
        raise ValueError("Unexpected advertisement regressor type.")
    for model in (classifier, regressor):
        if model.n_features_in_ != len(columns):
            raise ValueError("Advertisement model/config feature count mismatch.")
        if hasattr(model, "feature_names_in_") and list(model.feature_names_in_) != columns:
            raise ValueError("Advertisement model/config feature order mismatch.")
    if not np.array_equal(classifier.classes_, [0, 1]):
        raise ValueError("Advertisement classifier must predict classes [0, 1].")
    return AdModels(classifier, regressor, tuple(columns), float(threshold),
                    str(config.get("model_name", "Cartify Advertisement Recommendation")),
                    str(config.get("version", "unknown")))


# Load once. A new optional module must not disable the existing pricing routes.
try:
    _models = _load_models()
except Exception:
    logger.exception("Advertisement model initialization failed; pricing remains available.")
    _models = None


def get_ad_model_status():
    ready = _models is not None
    return {
        "status": "healthy" if ready else "unavailable",
        "model_name": _models.model_name if ready else None,
        "version": _models.version if ready else None,
        "models": {"demand_classifier": "loaded" if ready else "unavailable",
                   "volume_regressor": "loaded" if ready else "unavailable"},
        "feature_columns": list(_models.feature_columns) if ready else [],
        "feature_count": len(_models.feature_columns) if ready else 0,
        "classification_threshold": _models.threshold if ready else None,
    }


def _label(value, field):
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > 200:
        raise AdInputError(f"{field} must be a non-empty string of at most 200 characters.")
    return value.strip()


def _rank_candidates(candidates, label_field, top_n):
    models = _models
    if models is None:
        raise AdModelUnavailableError("Advertisement models are unavailable.")
    if isinstance(top_n, bool) or not isinstance(top_n, int) or not 1 <= top_n <= MAX_CANDIDATES:
        raise AdInputError(f"top_n must be an integer between 1 and {MAX_CANDIDATES}.")
    if not isinstance(candidates, list) or not 1 <= len(candidates) <= MAX_CANDIDATES:
        raise AdInputError(f"candidates must contain between 1 and {MAX_CANDIDATES} items.")

    labels, rows = [], []
    allowed = set(models.feature_columns) | {label_field}
    for index, candidate in enumerate(candidates, 1):
        if not isinstance(candidate, dict):
            raise AdInputError(f"Candidate {index} must be an object.")
        labels.append(_label(candidate.get(label_field), f"Candidate {index} {label_field}"))
        missing = [column for column in models.feature_columns if column not in candidate]
        if missing:
            raise AdInputError(f"Candidate {index} is missing features: {', '.join(missing)}.")
        unknown = set(candidate) - allowed
        if unknown:
            raise AdInputError(f"Candidate {index} has unknown fields: {', '.join(sorted(map(str, unknown)))}.")
        row = []
        for column in models.feature_columns:
            value = candidate[column]
            if isinstance(value, bool) or not isinstance(value, Real):
                raise AdInputError(f"Candidate {index} feature {column} must be a finite number; null is not imputed.")
            try:
                numeric = float(value)
            except (OverflowError, ValueError):
                raise AdInputError(f"Candidate {index} feature {column} must be a finite number.") from None
            if not math.isfinite(numeric):
                raise AdInputError(f"Candidate {index} feature {column} must be a finite number.")
            row.append(numeric)
        rows.append(row)

    # Config order, never request-dictionary order. One prediction call per batch/stage.
    frame = pd.DataFrame(rows, columns=models.feature_columns, dtype=np.float64)
    probabilities = np.asarray(models.classifier.predict_proba(frame), dtype=np.float64)
    log_volumes = np.asarray(models.regressor.predict(frame), dtype=np.float64)
    if probabilities.shape != (len(rows), 2) or log_volumes.shape != (len(rows),):
        raise RuntimeError("Unexpected advertisement model output shape.")
    demand = probabilities[:, 1]
    if (not np.isfinite(probabilities).all() or not np.isfinite(log_volumes).all()
            or (probabilities < 0).any() or (probabilities > 1).any()):
        raise RuntimeError("Invalid advertisement model predictions.")
    with np.errstate(over="raise", invalid="raise"):
        volumes = np.maximum(0.0, np.expm1(log_volumes))
        scores = demand * volumes
    if not np.isfinite(volumes).all() or not np.isfinite(scores).all():
        raise RuntimeError("Non-finite advertisement scores.")

    results = [{label_field: label, "demand_probability": float(probability),
                "predicted_volume": float(volume), "expected_demand_score": float(score),
                "confidence": "High" if probability >= models.threshold else "Low"}
               for label, probability, volume, score in zip(labels, demand, volumes, scores)]
    results.sort(key=lambda result: result["expected_demand_score"], reverse=True)
    return [{"rank": rank, **result} for rank, result in enumerate(results[:top_n], 1)]


def recommend_regions(category, candidates, top_n=5):
    """Rank caller-provided regions for a product category, without database access."""
    return {"category": _label(category, "category"),
            "recommendations": _rank_candidates(candidates, "region", top_n)}


def recommend_categories(region, candidates, top_n=5):
    """Rank caller-provided categories for a region, without database access."""
    return {"region": _label(region, "region"),
            "recommendations": _rank_candidates(candidates, "category", top_n)}
