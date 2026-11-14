const http = require("http");
const https = require("https");
const ErrorHandler = require("./ErrorHandler");

const unavailable = (statusCode = 503) => {
  const error = new ErrorHandler(
    "AI price recommendation is temporarily unavailable. You can still enter the price manually.",
    statusCode
  );
  error.code = "AI_PRICE_UNAVAILABLE";
  return error;
};

const isValidPrice = (price) => typeof price === "number" && Number.isFinite(price) &&
  price >= 0 && price <= Number.MAX_SAFE_INTEGER / 100;
const roundPrice = (price) => Math.round(price * 100) / 100;

const requestPrediction = (endpointPath, payload, readRecommendation) => new Promise((resolve, reject) => {
  let endpoint;
  try {
    endpoint = new URL(`${process.env.ML_SERVICE_URL.replace(/\/+$/, "")}${endpointPath}`);
    if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
      throw new Error("Invalid service URL");
    }
  } catch {
    reject(unavailable());
    return;
  }
  const configuredTimeout = Number(process.env.ML_SERVICE_TIMEOUT_MS || 5000);
  if (!Number.isInteger(configuredTimeout) || configuredTimeout < 1 || configuredTimeout > 30000) {
    reject(unavailable());
    return;
  }

  const body = JSON.stringify(payload);
  const transport = endpoint.protocol === "https:" ? https : http;
  let settled = false;
  let timer;
  const finish = (error, result) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (error) reject(error);
    else resolve(result);
  };
  const request = transport.request(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
  }, (response) => {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      finish(unavailable(502));
      response.destroy();
      return;
    }
    const chunks = [];
    let size = 0;
    response.on("data", (chunk) => {
      size += chunk.length;
      if (size > 65536) {
        finish(unavailable(502));
        response.destroy();
        return;
      }
      chunks.push(chunk);
    });
    response.on("error", () => finish(unavailable(502)));
    response.on("aborted", () => finish(unavailable(502)));
    response.on("end", () => {
      try {
        const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!data || data.success !== true || data.currency !== "USD") {
          throw new Error("Invalid recommendation");
        }
        finish(null, readRecommendation(data));
      } catch {
        finish(unavailable(502));
      }
    });
  });
  request.on("error", () => finish(unavailable()));
  // A wall-clock deadline covers connection, headers, and the entire response body.
  timer = setTimeout(() => {
    finish(unavailable(504));
    request.destroy();
  }, configuredTimeout);
  request.end(body);
});

// Keep the legacy Smartphone endpoint, payload, and result shape unchanged.
const predictSmartphonePrice = (payload) => requestPrediction("/predict", payload, (data) => {
  if (!isValidPrice(data.recommended_price)) throw new Error("Invalid recommendation price");
  return { price: roundPrice(data.recommended_price), currency: "USD" };
});

const predictMultiCategoryPrice = (category, payload) => requestPrediction(
  "/predict/v2", { ...payload, category }, (data) => {
    if (data.category !== category ||
      (data.recommendation_allowed !== undefined && typeof data.recommendation_allowed !== "boolean") ||
      (data.reason !== null && typeof data.reason !== "string")) {
      throw new Error("Invalid recommendation metadata");
    }
    const recommendationAllowed = data.recommendation_allowed !== false;
    const hasPrice = data.recommended_price !== undefined && data.recommended_price !== null;
    if ((hasPrice && !isValidPrice(data.recommended_price)) || (recommendationAllowed && !hasPrice)) {
      throw new Error("Invalid recommendation price");
    }
    const result = {
      recommendedPrice: hasPrice ? roundPrice(data.recommended_price) : null,
      recommendationAllowed,
      reason: data.reason,
      currency: "USD",
    };
    if (data.deviation_percent !== undefined) {
      if (data.deviation_percent !== null &&
        (typeof data.deviation_percent !== "number" || !Number.isFinite(data.deviation_percent) || data.deviation_percent < 0)) {
        throw new Error("Invalid recommendation deviation");
      }
      result.deviationPercent = data.deviation_percent;
    }
    for (const [source, target] of [
      ["original_price_in_supported_range", "originalPriceInSupportedRange"],
      ["prediction_in_supported_range", "predictionInSupportedRange"],
    ]) {
      if (data[source] !== undefined) {
        if (data[source] !== null && typeof data[source] !== "boolean") {
          throw new Error("Invalid recommendation range flag");
        }
        result[target] = data[source];
      }
    }
    return result;
  }
);

module.exports = { predictSmartphonePrice, predictMultiCategoryPrice };
