"use strict";

const { incrementWithTtl, cacheBackend } = require("./cache");

const getClientIp = (req) => {
  const xfwd = req.headers["x-forwarded-for"];
  if (typeof xfwd === "string" && xfwd.length) {
    return xfwd.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
};

const enforceRateLimit = async ({ req, key = "global", windowMs = 60_000, max = 60, identifier }) => {
  const id = identifier || getClientIp(req);
  const cacheKey = `${key}:${id}`;
  const hits = await incrementWithTtl(cacheKey, windowMs);

  if (hits > max) {
    const error = new Error("Too many requests");
    error.status = 429;
    error.retryAfter = Math.ceil(windowMs / 1000);
    throw error;
  }
  return hits;
};

module.exports = {
  enforceRateLimit,
  getClientIp,
  rateLimitBackend: cacheBackend,
};
