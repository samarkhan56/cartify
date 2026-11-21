import os
import json
import math
import joblib
import numpy as np
import pandas as pd

from scipy.sparse import hstack

# Preserve the existing Smartphone inference exactly as it works now.
from cartify_inference import recommend_price as smartphone_recommend


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

LAPTOP_DIR = os.path.join(
    BASE_DIR,
    "models",
    "laptop"
)

COOKWARE_DIR = os.path.join(
    BASE_DIR,
    "models",
    "cookware"
)

RUNNING_SHOES_DIR = os.path.join(
    BASE_DIR,
    "models",
    "running_shoes"
)


# ============================================================
# LOAD LAPTOP
# ============================================================

LAPTOP_MODEL_PATH = os.path.join(
    LAPTOP_DIR,
    "cartify_laptop_price_model.joblib"
)

LAPTOP_CONFIG_PATH = os.path.join(
    LAPTOP_DIR,
    "cartify_laptop_model_config.json"
)

_laptop_model = joblib.load(
    LAPTOP_MODEL_PATH
)

with open(
    LAPTOP_CONFIG_PATH,
    "r",
    encoding="utf-8"
) as f:

    _laptop_config = json.load(f)


# ============================================================
# LOAD COOKWARE
# ============================================================

COOKWARE_MODEL_PATH = os.path.join(
    COOKWARE_DIR,
    "cartify_cookware_price_model.joblib"
)

COOKWARE_CONFIG_PATH = os.path.join(
    COOKWARE_DIR,
    "cartify_cookware_model_config.json"
)

_cookware_model = joblib.load(
    COOKWARE_MODEL_PATH
)

with open(
    COOKWARE_CONFIG_PATH,
    "r",
    encoding="utf-8"
) as f:

    _cookware_config = json.load(f)


# ============================================================
# LOAD RUNNING SHOES
# ============================================================

RUNNING_MODEL_PATH = os.path.join(
    RUNNING_SHOES_DIR,
    "cartify_running_shoe_price_model.joblib"
)

RUNNING_CONFIG_PATH = os.path.join(
    RUNNING_SHOES_DIR,
    "cartify_running_shoe_model_config.json"
)

_running_artifact = joblib.load(
    RUNNING_MODEL_PATH
)

with open(
    RUNNING_CONFIG_PATH,
    "r",
    encoding="utf-8"
) as f:

    _running_config = json.load(f)


# ============================================================
# COMMON HELPERS
# ============================================================

def _clean_text(value):

    if value is None:
        return ""

    if isinstance(value, dict):

        return " ".join(
            f"{key}: {_clean_text(val)}"
            for key, val in value.items()
            if val is not None
        ).strip()

    if isinstance(value, (list, tuple, set)):

        return " ".join(
            _clean_text(item)
            for item in value
            if item is not None
        ).strip()

    value = str(value).strip()

    if value.lower() in {
        "none",
        "nan",
        "null"
    }:
        return ""

    return value


def _validate_prediction(value):

    value = float(value)

    if not np.isfinite(value):
        raise ValueError(
            "Model returned a non-finite prediction."
        )

    if value < 0:
        raise ValueError(
            "Model returned a negative price prediction."
        )

    return value


def _normalize_category(category):

    category = _clean_text(
        category
    ).lower()

    category = (
        category
        .replace("-", " ")
        .replace("_", " ")
    )

    category = " ".join(
        category.split()
    )

    aliases = {

        "smartphone": "smartphone",
        "smartphones": "smartphone",
        "mobile phone": "smartphone",
        "mobile phones": "smartphone",

        "laptop": "laptop",
        "laptops": "laptop",

        "cookware": "cookware",
        "cookware set": "cookware",
        "cookware sets": "cookware",
        "pots and pans": "cookware",

        "running shoe": "running_shoes",
        "running shoes": "running_shoes",
        "adult running shoes": "running_shoes",
        "performance running shoes": "running_shoes",
        "adult performance running shoes": "running_shoes",
    }

    return aliases.get(
        category
    )


def _guardrail_result(
    predicted_price,
    seller_original_price,
    min_price=None,
    max_price=None,
    max_deviation=None,
    require_prediction_in_range=False
):

    result = {
        "recommendation_allowed": True,
        "reason": None,
        "deviation_percent": None,
        "original_price_in_supported_range": None,
        "prediction_in_supported_range": None,
    }


    if seller_original_price is None:

        if (
            min_price is not None
            or max_deviation is not None
        ):

            result[
                "recommendation_allowed"
            ] = False

            result[
                "reason"
            ] = "seller_original_price_required"

        return result


    seller_original_price = float(
        seller_original_price
    )


    if seller_original_price <= 0:

        result[
            "recommendation_allowed"
        ] = False

        result[
            "reason"
        ] = "invalid_seller_original_price"

        return result


    if (
        min_price is not None
        and max_price is not None
    ):

        original_in_range = (
            float(min_price)
            <= seller_original_price
            <= float(max_price)
        )

        prediction_in_range = (
            float(min_price)
            <= predicted_price
            <= float(max_price)
        )

        result[
            "original_price_in_supported_range"
        ] = original_in_range

        result[
            "prediction_in_supported_range"
        ] = prediction_in_range


        if not original_in_range:

            result[
                "recommendation_allowed"
            ] = False

            result[
                "reason"
            ] = "seller_price_outside_supported_range"

            return result


        if (
            require_prediction_in_range
            and not prediction_in_range
        ):

            result[
                "recommendation_allowed"
            ] = False

            result[
                "reason"
            ] = "prediction_outside_supported_range"

            return result


    deviation = (
        abs(
            predicted_price
            - seller_original_price
        )
        /
        seller_original_price
        *
        100
    )


    result[
        "deviation_percent"
    ] = round(
        deviation,
        2
    )


    if (
        max_deviation is not None
        and deviation > float(max_deviation)
    ):

        result[
            "recommendation_allowed"
        ] = False

        result[
            "reason"
        ] = "excessive_price_deviation"


    return result


# ============================================================
# SMARTPHONE
# ============================================================

def _recommend_smartphone(product):

    result = smartphone_recommend(

        title=product.get(
            "title",
            ""
        ),

        brand=product.get(
            "brand",
            ""
        ),

        condition=product.get(
            "condition",
            ""
        ),

        specifications=_clean_text(
            product.get(
                "specifications",
                ""
            )
        ),

        features=_clean_text(
            product.get(
                "features",
                ""
            )
        ),

        description=_clean_text(
            product.get(
                "description",
                ""
            )
        )
    )


    return {

        "category":
            "smartphone",

        "recommended_price":
            result[
                "recommended_price"
            ],

        "raw_prediction":
            result[
                "raw_prediction"
            ],

        "active_features":
            result[
                "active_features"
            ],

        "recommendation_allowed":
            True,

        "reason":
            None,

        "currency":
            "USD"
    }


# ============================================================
# LAPTOP
# ============================================================

def _recommend_laptop(product):

    title = _clean_text(
        product.get(
            "title"
        )
    )

    if not title:
        raise ValueError(
            "Laptop title is required."
        )


    input_fields = _laptop_config.get(
        "input_fields",
        [
            "title",
            "brand",
            "condition",
            "specifications",
            "features",
            "description"
        ]
    )


    parts = []

    for field in input_fields:

        value = _clean_text(
            product.get(
                field,
                ""
            )
        )

        if value:
            parts.append(
                value
            )


    input_text = " ".join(
        parts
    ).strip()


    if not input_text:
        raise ValueError(
            "Laptop metadata cannot be empty."
        )


    prediction = float(
        _laptop_model.predict(
            [input_text]
        )[0]
    )


    prediction = _validate_prediction(
        prediction
    )


    # Calculate recognized TF-IDF features
    active_features = None

    try:

        tfidf = (
            _laptop_model
            .regressor_
            .named_steps[
                "tfidf"
            ]
        )

        active_features = int(
            tfidf.transform(
                [input_text]
            ).nnz
        )

    except Exception:
        pass


    # Condition safety check
    supported_conditions = (
        _laptop_config.get(
            "supported_conditions",
            []
        )
    )


    supplied_condition = _clean_text(
        product.get(
            "condition"
        )
    )


    recommendation_allowed = True
    reason = None


    if (
        supplied_condition
        and supported_conditions
    ):

        supported_lower = {
            str(item).lower()
            for item in supported_conditions
        }

        if (
            supplied_condition.lower()
            not in supported_lower
        ):

            recommendation_allowed = False

            reason = (
                "unsupported_condition"
            )


    return {

        "category":
            "laptop",

        "recommended_price":
            round(
                prediction,
                2
            ),

        "raw_prediction":
            prediction,

        "active_features":
            active_features,

        "recommendation_allowed":
            recommendation_allowed,

        "reason":
            reason,

        "currency":
            "USD"
    }


# ============================================================
# COOKWARE
# ============================================================

def _build_cookware_text(product):

    fields = [
        ("Title", "title"),
        ("Brand", "brand"),
        ("Material", "material"),
        ("Color", "color"),
        ("Size", "size"),
        ("Handle Material", "handle_material"),
        ("Dishwasher Safe", "dishwasher_safe"),
        ("Compatibility", "compatibility"),
        ("Closure Material", "closure_material"),
        ("Included Components", "included_components"),
        ("Finish", "finish"),
        ("Special Features", "special_features"),
        ("Product Dimensions", "product_dimensions"),
        ("Item Weight", "item_weight"),
        ("Features", "features"),
        ("Description", "description"),
    ]


    parts = []

    for label, field in fields:

        value = _clean_text(
            product.get(
                field,
                ""
            )
        )

        if value:

            parts.append(
                f"{label}: {value}"
            )


    # Generic specifications are also accepted from Cartify.
    specifications = _clean_text(
        product.get(
            "specifications",
            ""
        )
    )

    if specifications:

        parts.append(
            f"Specifications: {specifications}"
        )


    return " ".join(
        parts
    ).strip()


def _recommend_cookware(
    product,
    seller_original_price=None
):

    title = _clean_text(
        product.get(
            "title"
        )
    )

    brand = _clean_text(
        product.get(
            "brand"
        )
    )


    if not title:
        raise ValueError(
            "Cookware title is required."
        )


    model_text = _build_cookware_text(
        product
    )


    input_df = pd.DataFrame(
        [
            {
                "model_text":
                    model_text,

                "title":
                    title,

                "brand":
                    brand or "Unknown"
            }
        ]
    )


    prediction = float(
        _cookware_model.predict(
            input_df
        )[0]
    )


    prediction = _validate_prediction(
        prediction
    )


    active_features = None

    try:

        transformer = (
            _cookware_model
            .regressor_
            .named_steps[
                "features"
            ]
        )

        transformed = transformer.transform(
            input_df
        )

        active_features = int(
            transformed.nnz
        )

    except Exception:
        pass


    guardrails = (
        _cookware_config.get(
            "phase_1_guardrails",
            {}
        )
    )


    guardrail = _guardrail_result(

        predicted_price=
            prediction,

        seller_original_price=
            seller_original_price,

        min_price=
            guardrails.get(
                "recommended_original_price_min_usd"
            ),

        max_price=
            guardrails.get(
                "recommended_original_price_max_usd"
            ),

        max_deviation=
            guardrails.get(
                "maximum_recommendation_deviation_from_original_price_percent"
            ),

        require_prediction_in_range=False
    )


    return {

        "category":
            "cookware",

        "recommended_price":
            round(
                prediction,
                2
            ),

        "raw_prediction":
            prediction,

        "active_features":
            active_features,

        "recommendation_allowed":
            guardrail[
                "recommendation_allowed"
            ],

        "reason":
            guardrail[
                "reason"
            ],

        "deviation_percent":
            guardrail[
                "deviation_percent"
            ],

        "original_price_in_supported_range":
            guardrail[
                "original_price_in_supported_range"
            ],

        "prediction_in_supported_range":
            guardrail[
                "prediction_in_supported_range"
            ],

        "currency":
            "USD"
    }


# ============================================================
# RUNNING SHOES
# ============================================================

def _build_running_shoe_text(
    product
):

    title = _clean_text(
        product.get(
            "title"
        )
    )

    brand = _clean_text(
        product.get(
            "brand"
        )
    )

    gender = _clean_text(
        product.get(
            "gender"
        )
    )

    running_type = _clean_text(
        product.get(
            "running_type"
        )
    )


    parts = [
        f"Title: {title}",
        f"Brand: {brand}",
        f"Gender: {gender}",
        f"Running Type: {running_type}",
    ]


    specifications = _clean_text(
        product.get(
            "specifications",
            ""
        )
    )

    if specifications:

        parts.append(
            specifications
        )


    features = _clean_text(
        product.get(
            "features",
            ""
        )
    )

    if features:

        parts.append(
            f"Features: {features}"
        )


    return " ".join(
        part
        for part in parts
        if part.strip()
    )


def _recommend_running_shoes(
    product,
    seller_original_price=None
):

    title = _clean_text(
        product.get(
            "title"
        )
    )

    brand = _clean_text(
        product.get(
            "brand"
        )
    )

    gender = _clean_text(
        product.get(
            "gender"
        )
    )

    running_type = _clean_text(
        product.get(
            "running_type"
        )
    )


    if not title:
        raise ValueError(
            "Running shoe title is required."
        )


    if not brand:
        raise ValueError(
            "Running shoe brand is required."
        )


    if not gender:
        raise ValueError(
            "Running shoe gender is required."
        )


    if not running_type:
        raise ValueError(
            "Running shoe running_type is required."
        )


    model_text = (
        _build_running_shoe_text(
            product
        )
    )


    word_vectorizer = (
        _running_artifact[
            "word_vectorizer"
        ]
    )

    char_vectorizer = (
        _running_artifact[
            "char_vectorizer"
        ]
    )

    encoder = (
        _running_artifact[
            "encoder"
        ]
    )

    model = (
        _running_artifact[
            "model"
        ]
    )


    X_word = (
        word_vectorizer.transform(
            [model_text]
        )
    )


    X_char = (
        char_vectorizer.transform(
            [title]
        )
    )


    structured_input = pd.DataFrame(
        [
            {
                "brand":
                    brand,

                "gender":
                    gender,

                "running_type":
                    running_type
            }
        ]
    )


    X_struct = encoder.transform(
        structured_input
    )


    X = hstack(
        [
            X_word,
            X_char,
            X_struct
        ],
        format="csr"
    )


    log_prediction = float(
        model.predict(
            X
        )[0]
    )


    prediction = float(
        np.expm1(
            log_prediction
        )
    )


    prediction = _validate_prediction(
        prediction
    )


    guardrails = (
        _running_config.get(
            "guardrails",
            {}
        )
    )


    guardrail = _guardrail_result(

        predicted_price=
            prediction,

        seller_original_price=
            seller_original_price,

        min_price=
            guardrails.get(
                "recommended_original_price_min_usd"
            ),

        max_price=
            guardrails.get(
                "recommended_original_price_max_usd"
            ),

        max_deviation=
            guardrails.get(
                "maximum_recommendation_deviation_percent"
            ),

        require_prediction_in_range=
            guardrails.get(
                "require_prediction_inside_supported_range",
                True
            )
    )


    return {

        "category":
            "running_shoes",

        "recommended_price":
            round(
                prediction,
                2
            ),

        "raw_prediction":
            prediction,

        "active_features":
            int(X.nnz),

        "recommendation_allowed":
            guardrail[
                "recommendation_allowed"
            ],

        "reason":
            guardrail[
                "reason"
            ],

        "deviation_percent":
            guardrail[
                "deviation_percent"
            ],

        "original_price_in_supported_range":
            guardrail[
                "original_price_in_supported_range"
            ],

        "prediction_in_supported_range":
            guardrail[
                "prediction_in_supported_range"
            ],

        "currency":
            "USD"
    }


# ============================================================
# PUBLIC ROUTER
# ============================================================

def recommend_price(
    category,
    product,
    seller_original_price=None
):

    normalized_category = (
        _normalize_category(
            category
        )
    )


    if normalized_category is None:

        return {
            "category":
                category,

            "recommended_price":
                None,

            "recommendation_allowed":
                False,

            "reason":
                "unsupported_category",

            "currency":
                "USD"
        }


    if normalized_category == "smartphone":

        return _recommend_smartphone(
            product
        )


    if normalized_category == "laptop":

        return _recommend_laptop(
            product
        )


    if normalized_category == "cookware":

        return _recommend_cookware(
            product,
            seller_original_price
        )


    if normalized_category == "running_shoes":

        return _recommend_running_shoes(
            product,
            seller_original_price
        )


    raise ValueError(
        "Unexpected category routing error."
    )


# ============================================================
# STATUS
# ============================================================

def get_model_status():

    return {

        "smartphone":
            "loaded",

        "laptop":
            "loaded",

        "cookware":
            "loaded",

        "running_shoes":
            "loaded"
    }