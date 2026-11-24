"""Real artifact + HTTP regression tests; no MongoDB, datasets, training, or new test dependencies."""
import json
import math
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import mock_open, patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import numpy as np
import uvicorn

import ad_recommendation as ad
import cartify_api as api

PRICE_INPUTS = json.loads(r'''[{"title":"Samsung Galaxy A55 5G","brand":"Samsung","condition":"New","specifications":"Storage: 256GB; RAM: 8GB; Display: 6.6 inch Super AMOLED; Camera: 50MP","features":"","description":"Unlocked Android smartphone with 5G connectivity"},{"category":"laptop","title":"Lenovo ThinkPad E14 Gen 5","brand":"Lenovo","condition":"New","specifications":"Processor: Intel Core i5-1335U; RAM: 16GB; Storage: 512GB SSD; Display: 14 inch FHD","description":"Business laptop with Windows 11 Pro and backlit keyboard"},{"category":"cookware","title":"Cuisinart Multiclad Pro 12 Piece Stainless Steel Cookware Set","brand":"Cuisinart","seller_original_price":199.99,"specifications":"Material: Stainless Steel; Pieces: 12; Compatibility: Induction; Dishwasher Safe: Yes","features":"Tri-ply construction; stainless steel handles; tight fitting lids","description":"Durable cookware set with saucepans skillets and stockpot"},{"category":"running_shoes","title":"Brooks Men's Ghost 15 Neutral Running Shoe","brand":"Brooks","gender":"Men","running_type":"Running","seller_original_price":120,"specifications":"Upper: Engineered mesh; Sole: Rubber; Cushioning: DNA LOFT v2; Drop: 12mm","features":"Neutral support; breathable upper; road running; soft cushioning","description":"Comfortable daily training shoe for adult men"}]''')
PRICE_BASELINES = json.loads(r'''[{"success":true,"recommended_price":488.4,"raw_prediction":488.4030892279218,"active_features":32,"currency":"USD"},{"success":true,"category":"laptop","recommended_price":539.1,"raw_prediction":539.1028042930762,"active_features":47,"recommendation_allowed":true,"reason":null,"currency":"USD"},{"success":true,"category":"cookware","recommended_price":212.14,"raw_prediction":212.13546648849618,"active_features":192,"recommendation_allowed":true,"reason":null,"deviation_percent":6.07,"original_price_in_supported_range":true,"prediction_in_supported_range":true,"currency":"USD"},{"success":true,"category":"running_shoes","recommended_price":114.99,"raw_prediction":114.99120540946286,"active_features":139,"recommendation_allowed":true,"reason":null,"deviation_percent":4.17,"original_price_in_supported_range":true,"prediction_in_supported_range":true,"currency":"USD"}]''')
CONFIG = json.loads((ad.ARTIFACT_DIR / "cartify_ad_model_config.json").read_text(encoding="utf-8"))
COLUMNS = CONFIG["feature_columns"]


def candidate(label="region", name="Lahore, Punjab, Pakistan", multiplier=1):
    return {label: name, **{column: float((index + 1) * multiplier) for index, column in enumerate(COLUMNS)}}


class AdvertisementInferenceTests(unittest.TestCase):
    def test_artifacts_config_and_saved_feature_order_match(self):
        self.assertIsNotNone(ad._models)
        self.assertEqual(type(ad._models.classifier).__name__, "HistGradientBoostingClassifier")
        self.assertEqual(type(ad._models.regressor).__name__, "HistGradientBoostingRegressor")
        self.assertEqual(len(COLUMNS), 17)
        self.assertEqual(list(ad._models.feature_columns), COLUMNS)
        self.assertEqual(list(ad._models.classifier.feature_names_in_), COLUMNS)
        self.assertEqual(list(ad._models.regressor.feature_names_in_), COLUMNS)
        self.assertEqual(ad._models.threshold, CONFIG["classification_threshold"])
        self.assertEqual(ad.get_ad_model_status()["status"], "healthy")

    def test_request_key_order_does_not_change_feature_order_and_each_stage_is_batched(self):
        rows = [dict(reversed(list(candidate().items()))), candidate(name="Karachi, Sindh, Pakistan", multiplier=2)]
        with patch.object(ad._models.classifier, "predict_proba", wraps=ad._models.classifier.predict_proba) as classify:
            with patch.object(ad._models.regressor, "predict", wraps=ad._models.regressor.predict) as regress:
                ad.recommend_regions("Smartphones", rows)
        self.assertEqual(classify.call_count, 1)
        self.assertEqual(regress.call_count, 1)
        frame = classify.call_args.args[0]
        self.assertEqual(list(frame.columns), COLUMNS)
        self.assertEqual(frame.shape, (2, 17))
        self.assertEqual(frame.iloc[0].tolist(), list(range(1, 18)))
        self.assertIs(frame, regress.call_args.args[0])

    def test_each_required_feature_is_rejected_when_missing(self):
        for column in COLUMNS:
            with self.subTest(feature=column):
                row = candidate()
                del row[column]
                with self.assertRaisesRegex(ad.AdInputError, column):
                    ad.recommend_regions("Smartphones", [row])

    def test_null_strings_booleans_objects_nonfinite_and_overflowing_inputs_are_rejected(self):
        for value in [None, "3.5", True, {}, [], float("nan"), float("inf"), -float("inf"), 10 ** 400]:
            with self.subTest(value_type=type(value).__name__):
                row = candidate()
                row[COLUMNS[0]] = value
                with self.assertRaises(ad.AdInputError):
                    ad.recommend_regions("Smartphones", [row])

    def test_zero_features_are_valid_and_not_confused_with_missing_data(self):
        result = ad.recommend_regions("Smartphones", [candidate(multiplier=0)])
        self.assertEqual(len(result["recommendations"]), 1)
        self.assertTrue(math.isfinite(result["recommendations"][0]["expected_demand_score"]))

    def test_unknown_features_and_empty_labels_are_rejected(self):
        for row in [{**candidate(), "misspelled_feature": 1}, {**candidate(), "region": "  "}]:
            with self.assertRaises(ad.AdInputError):
                ad.recommend_regions("Smartphones", [row])
        with self.assertRaises(ad.AdInputError):
            ad.recommend_categories(" ", [candidate("category", "Laptops")])

    def test_invalid_batch_and_top_n_values_are_rejected(self):
        for top_n in [0, -1, True, 1.5, "5", ad.MAX_CANDIDATES + 1]:
            with self.subTest(top_n=top_n):
                with self.assertRaises(ad.AdInputError):
                    ad.recommend_regions("Smartphones", [candidate()], top_n)
        for rows in [[], None, [None], [candidate()] * (ad.MAX_CANDIDATES + 1)]:
            with self.assertRaises(ad.AdInputError):
                ad.recommend_regions("Smartphones", rows)

    def _assert_real_ranking(self, function, context, label):
        rows = [candidate(label, name, multiplier) for name, multiplier in [
            ("Lahore" if label == "region" else "Smartphones", 1),
            ("Karachi" if label == "region" else "Laptops", 4),
            ("Toronto" if label == "region" else "Cookware", 0),
            ("Islamabad" if label == "region" else "Running Shoes", 2)]]
        full = function(context, rows, 4)["recommendations"]
        top = function(context, rows, 2)["recommendations"]
        self.assertEqual(top, full[:2])
        self.assertEqual([row["rank"] for row in full], [1, 2, 3, 4])
        scores = [row["expected_demand_score"] for row in full]
        self.assertEqual(scores, sorted(scores, reverse=True))
        self.assertEqual({row[label] for row in full}, {row[label] for row in rows})
        for row in full:
            self.assertGreaterEqual(row["predicted_volume"], 0)
            self.assertAlmostEqual(row["expected_demand_score"], row["demand_probability"] * row["predicted_volume"])

    def test_real_region_ranking_sorted_top_n(self):
        self._assert_real_ranking(ad.recommend_regions, "Smartphones", "region")

    def test_real_category_ranking_sorted_top_n(self):
        self._assert_real_ranking(ad.recommend_categories, "Lahore, Punjab, Pakistan", "category")

    def test_raw_probability_times_expm1_volume_ranks_even_low_confidence_candidates(self):
        with patch.object(ad._models.classifier, "predict_proba", return_value=np.array([[0.1, 0.9], [0.8, 0.2]])):
            with patch.object(ad._models.regressor, "predict", return_value=np.log1p([1.0, 100.0])):
                result = ad.recommend_regions("Any category", [candidate(name="A"), candidate(name="B")], 2)
        first, second = result["recommendations"]
        self.assertEqual(first["region"], "B")
        self.assertEqual(first["confidence"], "Low")
        self.assertAlmostEqual(first["predicted_volume"], 100)
        self.assertAlmostEqual(first["expected_demand_score"], 20)
        self.assertEqual(second["confidence"], "High")
        self.assertAlmostEqual(second["expected_demand_score"], 0.9)

    def test_negative_log_volume_is_clamped_to_zero(self):
        with patch.object(ad._models.regressor, "predict", return_value=np.array([-2.0])):
            row = ad.recommend_regions("Smartphones", [candidate()])["recommendations"][0]
        self.assertEqual(row["predicted_volume"], 0)
        self.assertEqual(row["expected_demand_score"], 0)

    def test_configured_threshold_boundary_and_stable_ties(self):
        threshold = ad._models.threshold
        probabilities = np.array([[1 - threshold, threshold], [1 - threshold, threshold]])
        with patch.object(ad._models.classifier, "predict_proba", return_value=probabilities):
            with patch.object(ad._models.regressor, "predict", return_value=np.log1p([2.0, 2.0])):
                rows = ad.recommend_regions("Any category", [candidate(name="First"), candidate(name="Second")])["recommendations"]
        self.assertEqual([row["region"] for row in rows], ["First", "Second"])
        self.assertTrue(all(row["confidence"] == "High" for row in rows))

    def test_bad_model_shapes_and_probabilities_fail_instead_of_returning_invalid_json(self):
        for outputs in [np.array([[float("nan"), 0.5]]), np.array([[0, 1.1]]), np.array([0.5])]:
            with patch.object(ad._models.classifier, "predict_proba", return_value=outputs):
                with self.assertRaises(RuntimeError):
                    ad.recommend_regions("Smartphones", [candidate()])

    def test_nonfinite_or_overflowing_volume_predictions_fail_safely(self):
        for prediction in [float("nan"), float("inf"), 1000.0]:
            with patch.object(ad._models.regressor, "predict", return_value=np.array([prediction])):
                with self.assertRaises((RuntimeError, FloatingPointError)):
                    ad.recommend_regions("Smartphones", [candidate()])

    def test_models_are_reused_without_loading_artifacts_per_request(self):
        with patch.object(ad.joblib, "load", side_effect=AssertionError("Unexpected reload")):
            ad.recommend_regions("Smartphones", [candidate()])
            ad.recommend_categories("Any region", [candidate("category", "Cookware")])

    def test_config_feature_count_order_and_threshold_mismatches_are_detected(self):
        for changed in [
            {**CONFIG, "feature_columns": COLUMNS[:-1]},
            {**CONFIG, "feature_columns": list(reversed(COLUMNS))},
            {**CONFIG, "feature_columns": COLUMNS + [COLUMNS[0]]},
            {**CONFIG, "classification_threshold": 1.5},
        ]:
            with self.subTest(config=changed["feature_columns"]):
                with patch.object(Path, "open", mock_open(read_data=json.dumps(changed))):
                    with patch.object(ad.joblib, "load", side_effect=[ad._models.classifier, ad._models.regressor]):
                        with self.assertRaises(ValueError):
                            ad._load_models()

    def test_unavailable_ad_models_do_not_attempt_inference(self):
        with patch.object(ad, "_models", None):
            self.assertEqual(ad.get_ad_model_status()["status"], "unavailable")
            with self.assertRaises(ad.AdModelUnavailableError):
                ad.recommend_regions("Smartphones", [candidate()])


class AdvertisementHttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Real HTTP/ASGI validation without adding httpx/TestClient dependencies.
        cls.server = uvicorn.Server(uvicorn.Config(api.app, host="127.0.0.1", port=0,
                                                   log_level="critical", access_log=False))
        cls.server.config.load()
        cls.thread = threading.Thread(target=cls.server.run, daemon=True)
        cls.thread.start()
        deadline = time.monotonic() + 15
        while not cls.server.started:
            if not cls.thread.is_alive() or time.monotonic() > deadline:
                cls.server.should_exit = True
                raise RuntimeError("Test ASGI server failed to start")
            time.sleep(0.02)
        cls.url = "http://127.0.0.1:" + str(cls.server.servers[0].sockets[0].getsockname()[1])

    @classmethod
    def tearDownClass(cls):
        cls.server.should_exit = True
        cls.thread.join(10)
        if cls.thread.is_alive():
            raise RuntimeError("Test ASGI server failed to stop")

    def request(self, route, payload=None, raw=None):
        body = raw if raw is not None else (json.dumps(payload).encode() if payload is not None else None)
        request = Request(self.url + route, data=body, headers={"Content-Type": "application/json"},
                          method="POST" if body is not None else "GET")
        try:
            response = urlopen(request, timeout=10)
        except HTTPError as error:
            response = error
        with response:
            return response.status, json.loads(response.read())

    def test_health_and_price_model_status_keep_their_existing_contracts(self):
        self.assertEqual(self.request("/health"), (200, {"status": "healthy"}))
        status, body = self.request("/models")
        self.assertEqual(status, 200)
        self.assertEqual(body, {"status": "healthy", "models": {
            "smartphone": "loaded", "laptop": "loaded", "cookware": "loaded", "running_shoes": "loaded"}})

    def test_ad_metadata_reports_both_loaded_models_config_features_and_threshold(self):
        status, body = self.request("/ads/models")
        self.assertEqual(status, 200)
        self.assertEqual(body["models"], {"demand_classifier": "loaded", "volume_regressor": "loaded"})
        self.assertEqual(body["feature_columns"], COLUMNS)
        self.assertEqual(body["feature_count"], 17)
        self.assertEqual(body["classification_threshold"], CONFIG["classification_threshold"])

    def test_recommend_regions_http_response_schema_and_top_n(self):
        status, body = self.request("/ads/recommend-regions", {"category": "Smartphones",
            "candidates": [candidate(), candidate(name="Karachi, Sindh, Pakistan", multiplier=4)], "top_n": 1})
        self.assertEqual(status, 200)
        self.assertEqual(body["category"], "Smartphones")
        self.assertEqual(len(body["recommendations"]), 1)
        self.assertEqual(set(body["recommendations"][0]), {"rank", "region", "demand_probability",
            "predicted_volume", "expected_demand_score", "confidence"})

    def test_recommend_categories_http_response_schema(self):
        status, body = self.request("/ads/recommend-categories", {"region": "Lahore, Punjab, Pakistan",
            "candidates": [candidate("category", "Smartphones"), candidate("category", "Laptops", 2)]})
        self.assertEqual(status, 200)
        self.assertEqual(body["region"], "Lahore, Punjab, Pakistan")
        self.assertEqual(len(body["recommendations"]), 2)
        self.assertIn("category", body["recommendations"][0])
        self.assertNotIn("region", body["recommendations"][0])

    def test_invalid_features_return_400_including_null_and_nonfinite_values(self):
        missing = candidate()
        del missing[COLUMNS[0]]
        for row in [missing, {**candidate(), COLUMNS[0]: None}, {**candidate(), COLUMNS[0]: "10"},
                    {**candidate(), COLUMNS[0]: True}, {**candidate(), COLUMNS[0]: float("nan")},
                    {**candidate(), COLUMNS[0]: float("inf")}, {**candidate(), "typo": 1}]:
            with self.subTest(row=row):
                status, body = self.request("/ads/recommend-regions", {"category": "Smartphones", "candidates": [row]})
                self.assertEqual(status, 400)
                self.assertIn("detail", body)

    def test_invalid_outer_payloads_return_422(self):
        base = {"category": "Smartphones", "candidates": [candidate()]}
        for payload in [{}, {**base, "category": " "}, {**base, "candidates": []},
                        {**base, "top_n": 0}, {**base, "top_n": True},
                        {**base, "top_n": 1.5}, {**base, "top_n": "5"},
                        {**base, "extra": "unexpected"}]:
            with self.subTest(payload=payload):
                self.assertEqual(self.request("/ads/recommend-regions", payload)[0], 422)
        self.assertEqual(self.request("/ads/recommend-regions", raw=b"{not-json")[0], 422)

    def test_ad_unavailability_returns_503_without_disabling_health_or_legacy_prediction(self):
        with patch.object(ad, "_models", None):
            status, body = self.request("/ads/recommend-regions", {"category": "Smartphones", "candidates": [candidate()]})
            self.assertEqual(status, 503)
            self.assertEqual(body["detail"], "Advertisement models are unavailable.")
            self.assertEqual(self.request("/health")[0], 200)
            self.assertEqual(self.request("/predict", PRICE_INPUTS[0])[0], 200)

    def test_unexpected_inference_failure_returns_500_without_internal_details(self):
        with patch.object(api, "recommend_regions", side_effect=RuntimeError("private model details")):
            with patch.object(api.logging.getLogger(api.__name__), "exception"):
                status, body = self.request("/ads/recommend-regions", {"category": "Smartphones", "candidates": [candidate()]})
        self.assertEqual(status, 500)
        self.assertEqual(body, {"detail": "Advertisement recommendation failed."})

    def test_all_four_price_predictions_match_pre_change_baselines(self):
        for index, (payload, baseline) in enumerate(zip(PRICE_INPUTS, PRICE_BASELINES)):
            with self.subTest(model=payload.get("category", "smartphone")):
                status, body = self.request("/predict" if index == 0 else "/predict/v2", payload)
                self.assertEqual(status, 200)
                self.assertEqual(set(body), set(baseline))
                self.assertAlmostEqual(body["raw_prediction"], baseline["raw_prediction"], places=9)
                self.assertEqual({key: value for key, value in body.items() if key != "raw_prediction"},
                                 {key: value for key, value in baseline.items() if key != "raw_prediction"})


if __name__ == "__main__":
    unittest.main()
