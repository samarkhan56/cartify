import os
import json
import joblib
import numpy as np


# ------------------------------------------------------------
# Artifact directory
# ------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "cartify_price_model.joblib"
)

VECTORIZER_PATH = os.path.join(
    BASE_DIR,
    "cartify_tfidf_vectorizer.joblib"
)

CONFIG_PATH = os.path.join(
    BASE_DIR,
    "cartify_model_config.json"
)


# ------------------------------------------------------------
# Load production artifacts once
# ------------------------------------------------------------

_price_model = joblib.load(MODEL_PATH)
_tfidf_vectorizer = joblib.load(VECTORIZER_PATH)

with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    _model_config = json.load(f)

_metadata_fields = _model_config.get(
    "metadata_fields",
    [
        "title",
        "brand",
        "condition",
        "specifications",
        "features",
        "description"
    ]
)


# ------------------------------------------------------------
# Utility functions
# ------------------------------------------------------------

def _clean_text(value):

    if value is None:
        return ""

    value = str(value).strip()

    if value.lower() in {"none", "nan", "null"}:
        return ""

    return value


def _build_model_text(product):

    parts = []

    for field in _metadata_fields:

        value = _clean_text(
            product.get(field, "")
        )

        if value:
            parts.append(value)

    return " ".join(parts)


# ------------------------------------------------------------
# Public prediction function
# ------------------------------------------------------------

def recommend_price(
    title,
    brand="",
    condition="",
    specifications="",
    features="",
    description=""
):

    title = _clean_text(title)

    if not title:
        raise ValueError(
            "Product title is required."
        )

    product = {
        "title": title,
        "brand": _clean_text(brand),
        "condition": _clean_text(condition),
        "specifications": _clean_text(specifications),
        "features": _clean_text(features),
        "description": _clean_text(description)
    }

    input_text = _build_model_text(product)

    feature_matrix = (
        _tfidf_vectorizer.transform(
            [input_text]
        )
    )

    active_features = int(
        feature_matrix.nnz
    )

    if active_features == 0:
        raise ValueError(
            "No recognized model vocabulary "
            "was found in the supplied product."
        )

    raw_prediction = float(
        _price_model.predict(
            feature_matrix
        )[0]
    )

    if not np.isfinite(
        raw_prediction
    ):
        raise ValueError(
            "Model returned a non-finite prediction."
        )

    if raw_prediction < 0:
        raise ValueError(
            "Model returned a negative price prediction."
        )

    return {
        "recommended_price": round(
            raw_prediction,
            2
        ),
        "raw_prediction": raw_prediction,
        "active_features": active_features
    }


def get_model_info():

    return {
        "model_type":
            type(_price_model).__name__,

        "vectorizer_type":
            type(_tfidf_vectorizer).__name__,

        "vocabulary_size":
            len(
                _tfidf_vectorizer.vocabulary_
            ),

        "metadata_fields":
            list(_metadata_fields)
    }
