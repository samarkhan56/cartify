const http = require("http");
const https = require("https");
const { modelConfig } = require("../config/advertising");

const unavailable = () => new Error("AD_ML_UNAVAILABLE");
const nonnegative = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;

function requestBatch(endpointPath, contextField, labelField, context, candidates) {
  return new Promise((resolve, reject) => {
    let endpoint;
    const timeout = Number(process.env.ML_SERVICE_TIMEOUT_MS || 5000);
    try {
      endpoint = new URL(`${process.env.ML_SERVICE_URL.replace(/\/+$/, "")}${endpointPath}`);
      if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password ||
          endpoint.search || endpoint.hash || !Number.isInteger(timeout) || timeout < 1 || timeout > 30000 || !modelConfig) throw unavailable();
    } catch { reject(unavailable()); return; }
    const body = JSON.stringify({ [contextField]: context, candidates, top_n: 5 });
    const known = new Set(candidates.map((row) => row[labelField]));
    let settled = false;
    let timer;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(result);
    };
    const request = (endpoint.protocol === "https:" ? https : http).request(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, (response) => {
      if (response.statusCode !== 200) { finish(unavailable()); response.destroy(); return; }
      const chunks = [];
      let size = 0;
      response.on("data", (chunk) => {
        size += chunk.length;
        if (size > 65536) { finish(unavailable()); response.destroy(); return; }
        chunks.push(chunk);
      });
      response.on("error", () => finish(unavailable()));
      response.on("aborted", () => finish(unavailable()));
      response.on("end", () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          const rows = data?.recommendations;
          if (data?.[contextField] !== context || !Array.isArray(rows) ||
              rows.length !== Math.min(5, candidates.length)) throw unavailable();
          const seen = new Set();
          rows.forEach((row, index) => {
            if (!known.has(row[labelField]) || seen.has(row[labelField]) || row.rank !== index + 1 ||
                !nonnegative(row.demand_probability) || row.demand_probability > 1 ||
                !nonnegative(row.predicted_volume) || !nonnegative(row.expected_demand_score) ||
                row.confidence !== (row.demand_probability >= modelConfig.classificationThreshold ? "High" : "Low") ||
                (index && rows[index - 1].expected_demand_score < row.expected_demand_score)) throw unavailable();
            const score = row.demand_probability * row.predicted_volume;
            if (Math.abs(score - row.expected_demand_score) > Math.max(1, score) * 1e-9) throw unavailable();
            seen.add(row[labelField]);
          });
          finish(null, rows);
        } catch { finish(unavailable()); }
      });
    });
    request.on("error", () => finish(unavailable()));
    timer = setTimeout(() => { finish(unavailable()); request.destroy(); }, timeout);
    request.end(body);
  });
}

async function scoreCandidates(direction, context, candidates) {
  const isRegions = direction === "regions";
  const contextField = isRegions ? "category" : "region";
  const labelField = isRegions ? "region" : "category";
  const rows = [];
  // Top 5 from every batch is sufficient to find the global Top 5 without dropping candidates.
  for (let offset = 0; offset < candidates.length; offset += 1000) {
    rows.push(...await requestBatch(`/ads/recommend-${isRegions ? "regions" : "categories"}`,
      contextField, labelField, context, candidates.slice(offset, offset + 1000)));
  }
  rows.sort((a, b) => b.expected_demand_score - a.expected_demand_score);
  return rows.slice(0, 5).map((row, index) => ({ ...row, rank: index + 1 }));
}

module.exports = { scoreCandidates };
