const parseOrigins = (value) =>
  (value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const getAllowedOrigins = () => {
  const configuredOrigins = parseOrigins(process.env.CLIENT_ORIGINS);

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  return ["http://localhost:3000"];
};

const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  next();
};

const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = "Too many requests. Please try again later.",
} = {}) => {
  const hits = new Map();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();

    hits.forEach((entry, key) => {
      if (entry.resetAt <= now) {
        hits.delete(key);
      }
    });
  }, windowMs);

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const current = hits.get(key);
    const entry =
      current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + windowMs };

    entry.count += 1;
    hits.set(key, entry);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(max - entry.count, 0));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      return res.status(429).json({
        success: false,
        message,
      });
    }

    next();
  };
};

const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT || 300),
});

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT || 20),
  message: "Too many login attempts. Please wait and try again.",
});

const paymentRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: Number(process.env.PAYMENT_RATE_LIMIT || 30),
  message: "Too many payment attempts. Please wait and try again.",
});

module.exports = {
  apiRateLimiter,
  authRateLimiter,
  getAllowedOrigins,
  paymentRateLimiter,
  securityHeaders,
};
