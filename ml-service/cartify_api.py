import os
import json
import joblib
import logging

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any, Literal

from ad_recommendation import (
    AdInputError, AdModelUnavailableError, MAX_CANDIDATES,
    recommend_regions, recommend_categories, get_ad_model_status,
)

from model_router import (
    recommend_price as routed_recommend_price,
    get_model_status
)


# ============================================================
# PATHS
# ============================================================

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


# ============================================================
# LOAD EXISTING SMARTPHONE PRODUCTION ARTIFACTS
# ============================================================

model = joblib.load(
    MODEL_PATH
)

vectorizer = joblib.load(
    VECTORIZER_PATH
)

with open(
    CONFIG_PATH,
    "r",
    encoding="utf-8"
) as f:

    config = json.load(f)


METADATA_FIELDS = config.get(
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


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Cartify Price Recommendation API",
    description=(
        "Machine-learning API for Cartify product "
        "price recommendations across supported categories."
    ),
    version="2.0.0"
)


# ============================================================
# EXISTING SMARTPHONE REQUEST SCHEMA
# ============================================================

class SmartphoneRequest(BaseModel):

    title: str = Field(
        ...,
        min_length=1
    )

    brand: str = Field(
        ...,
        min_length=1
    )

    condition: Optional[str] = ""

    specifications: Optional[str] = ""

    features: Optional[str] = ""

    description: Optional[str] = ""


# ============================================================
# MULTI-MODEL REQUEST SCHEMA
# ============================================================

class MultiModelRequest(BaseModel):

    # --------------------------------------------------------
    # COMMON
    # --------------------------------------------------------

    category: str = Field(
        ...,
        min_length=1
    )

    title: str = Field(
        ...,
        min_length=1
    )

    brand: Optional[str] = ""

    condition: Optional[str] = ""

    specifications: Optional[Any] = ""

    features: Optional[Any] = ""

    description: Optional[Any] = ""


    # --------------------------------------------------------
    # COOKWARE-SPECIFIC
    # --------------------------------------------------------

    material: Optional[str] = ""

    color: Optional[str] = ""

    size: Optional[str] = ""

    handle_material: Optional[str] = ""

    dishwasher_safe: Optional[str] = ""

    compatibility: Optional[str] = ""

    closure_material: Optional[str] = ""

    included_components: Optional[str] = ""

    finish: Optional[str] = ""

    special_features: Optional[str] = ""

    product_dimensions: Optional[str] = ""

    item_weight: Optional[str] = ""


    # --------------------------------------------------------
    # RUNNING-SHOE-SPECIFIC
    # --------------------------------------------------------

    gender: Optional[str] = ""

    running_type: Optional[str] = ""


    # --------------------------------------------------------
    # GUARDRAIL INPUT
    # --------------------------------------------------------

    seller_original_price: Optional[float] = Field(
        default=None,
        gt=0
    )


# ============================================================
# EXISTING SMARTPHONE HELPER
# ============================================================

def build_metadata_text(
    product: SmartphoneRequest
):

    product_dict = (
        product.model_dump()
    )

    values = []

    for field in METADATA_FIELDS:

        value = product_dict.get(
            field,
            ""
        )

        if value is None:
            value = ""

        values.append(
            str(value).strip()
        )

    return " ".join(
        values
    ).strip()


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():

    return {

        "service":
            "Cartify Price Recommendation API",

        "status":
            "online",

        "version":
            "2.0.0",

        "supported_models":
            get_model_status(),

        "legacy_smartphone_model_type":
            type(model).__name__,

        "legacy_smartphone_vectorizer_type":
            type(vectorizer).__name__,

        "legacy_smartphone_vocabulary_size":
            len(
                vectorizer.vocabulary_
            )
    }


# ============================================================
# HEALTH ENDPOINT
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


# ============================================================
# MODEL STATUS ENDPOINT
# ============================================================

@app.get("/models")
def models_status():

    return {

        "status":
            "healthy",

        "models":
            get_model_status()
    }


# ============================================================
# EXISTING SMARTPHONE PREDICTION ENDPOINT
# KEEP THIS FOR BACKWARD COMPATIBILITY
# ============================================================

@app.post("/predict")
def predict_price(
    product: SmartphoneRequest
):

    try:

        input_text = (
            build_metadata_text(
                product
            )
        )


        if not input_text:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Product metadata "
                    "cannot be empty."
                )
            )


        X = vectorizer.transform(
            [
                input_text
            ]
        )


        raw_prediction = float(
            model.predict(
                X
            )[0]
        )


        # Prevent impossible negative price
        recommended_price = max(
            0.0,
            raw_prediction
        )


        return {

            "success":
                True,

            "recommended_price":
                round(
                    recommended_price,
                    2
                ),

            "raw_prediction":
                raw_prediction,

            "active_features":
                int(
                    X.nnz
                ),

            "currency":
                "USD"
        }


    except HTTPException:
        raise


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Prediction failed: "
                f"{str(e)}"
            )
        )


# ============================================================
# MULTI-MODEL PREDICTION ENDPOINT
# ============================================================

@app.post("/predict/v2")
def predict_price_v2(
    request: MultiModelRequest
):

    try:

        # Convert request object to dictionary
        data = request.model_dump()


        # Extract routing / guardrail fields
        category = data.pop(
            "category"
        )

        seller_original_price = data.pop(
            "seller_original_price"
        )


        # Route to correct ML model
        result = routed_recommend_price(

            category=
                category,

            product=
                data,

            seller_original_price=
                seller_original_price
        )


        return {

            "success":
                True,

            **result
        }


    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


    except HTTPException:
        raise


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Prediction failed: "
                f"{str(e)}"
            )
        )


# Advertisement inference only. Express will supply precomputed numerical features.
class AdBatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    candidates: list[dict[str, Any]] = Field(
        ..., min_length=1, max_length=MAX_CANDIDATES,
        description="Flat candidate objects: region/category plus every numerical feature from GET /ads/models.",
    )
    top_n: int = Field(default=5, strict=True, ge=1, le=MAX_CANDIDATES)


class RecommendRegionsRequest(AdBatchRequest):
    category: str = Field(..., strict=True, min_length=1, max_length=200)


class RecommendCategoriesRequest(AdBatchRequest):
    region: str = Field(..., strict=True, min_length=1, max_length=200)


class AdScore(BaseModel):
    rank: int = Field(..., ge=1)
    demand_probability: float = Field(..., ge=0, le=1, allow_inf_nan=False)
    predicted_volume: float = Field(..., ge=0, allow_inf_nan=False)
    expected_demand_score: float = Field(..., ge=0, allow_inf_nan=False)
    confidence: Literal["High", "Low"]


class RegionRecommendation(AdScore):
    region: str


class CategoryRecommendation(AdScore):
    category: str


class RegionsRecommendationResponse(BaseModel):
    category: str
    recommendations: list[RegionRecommendation]


class CategoriesRecommendationResponse(BaseModel):
    region: str
    recommendations: list[CategoryRecommendation]


def _run_ad_recommender(recommender, context, request):
    try:
        return recommender(context, request.candidates, request.top_n)
    except AdInputError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except AdModelUnavailableError as error:
        raise HTTPException(status_code=503, detail="Advertisement models are unavailable.") from error
    except Exception as error:
        logging.getLogger(__name__).exception("Advertisement inference failed.")
        raise HTTPException(status_code=500, detail="Advertisement recommendation failed.") from error


@app.get("/ads/models")
def advertisement_model_status():
    return get_ad_model_status()


@app.post("/ads/recommend-regions", response_model=RegionsRecommendationResponse)
def advertisement_regions(request: RecommendRegionsRequest):
    return _run_ad_recommender(recommend_regions, request.category, request)


@app.post("/ads/recommend-categories", response_model=CategoriesRecommendationResponse)
def advertisement_categories(request: RecommendCategoriesRequest):
    return _run_ad_recommender(recommend_categories, request.region, request)
