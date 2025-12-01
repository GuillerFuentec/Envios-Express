"use strict";

const { incrementWithTtl, cacheBackend } = require("../../utils/cache");

const DEFAULT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const DEFAULT_MAX = Number(process.env.RATE_LIMIT_MAX || 240);

const defaultRoutes = [
  { name: "contact", matcher: /^\/api\/contacts/i, windowMs: 60_000, max: 20 },
  { name: "client", matcher: /^\/api\/clients/i, windowMs: 60_000, max: 40 },
  {
    name: "payments",
    matcher: /^\/api\/payments\/create-intent/i,
    windowMs: 60_000,
    max: 50,
  },
  {
    name: "transfer",
    matcher: /^\/api\/payments\/process-transfer/i,
    windowMs: 60_000,
    max: 25,
  },
  {
    name: "webhook",
    matcher: /^\/api\/stripe\/webhook/i,
    windowMs: 300_000,
    max: 500,
  },
];

const getClientIp = (ctx) => {
  const xfwd = ctx.request.headers["x-forwarded-for"];
  if (typeof xfwd === "string" && xfwd.length) {
    return xfwd.split(",")[0].trim();
  }
  return ctx.request.ip || ctx.ip || ctx.req?.socket?.remoteAddress || "unknown";
};

const pickRule = (path, rules = []) => {
  for (const rule of rules) {
    if (rule.matcher && rule.matcher.test(path)) {
      return rule;
    }
  }
  return null;
};

const rateLimitMiddleware = (userConfig = {}, { strapi }) => {
  const logger = strapi.log;
  const routes = Array.isArray(userConfig.routes) ? userConfig.routes : defaultRoutes;
  const windowMs = Number(userConfig.windowMs || DEFAULT_WINDOW_MS);
  const max = Number(userConfig.max || DEFAULT_MAX);

  logger.info(
    `[rate-limit] Enabled using ${cacheBackend()} backend (default ${max} req/${windowMs}ms)`
  );

  return async (ctx, next) => {
    if (process.env.SKIP_RATE_LIMIT === "true" || ctx.path.startsWith("/admin")) {
      return next();
    }

    const rule = pickRule(ctx.path, routes) || { name: "global", windowMs, max };
    const key = `${rule.name || "global"}:${getClientIp(ctx)}`;
    const windowMsToUse = Number(rule.windowMs || windowMs) || DEFAULT_WINDOW_MS;
    const maxToUse = Number(rule.max || max) || DEFAULT_MAX;

    try {
      const hits = await incrementWithTtl(key, windowMsToUse);
      if (hits > maxToUse) {
        ctx.set("Retry-After", Math.ceil(windowMsToUse / 1000));
        ctx.status = 429;
        ctx.body = { error: "Too many requests" };
        return;
      }
    } catch (error) {
      logger.warn("[rate-limit] Error incrementing counter; allowing request", {
        error: error.message,
      });
    }

    await next();
  };
};

module.exports = rateLimitMiddleware;
module.exports.default = rateLimitMiddleware;
