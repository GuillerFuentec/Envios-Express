"use strict";

// Small cache helper with optional Redis backend and in-memory fallback.

let redisClient;
let redisStatus = "unknown";
const memoryStore = new Map();

const getLogger = () => (global.strapi?.log || console);

const connectRedis = () => {
  if (redisStatus !== "unknown") {
    return redisClient;
  }
  const url = process.env.REDIS_URL || process.env.CACHE_REDIS_URL;
  if (!url) {
    redisStatus = "disabled";
    return null;
  }

  try {
    // Lazy load to avoid breaking if dependency is missing at runtime.
    // eslint-disable-next-line import/no-extraneous-dependencies
    const Redis = require("ioredis");
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    redisStatus = "ready";
    redisClient.on("error", (err) => {
      redisStatus = "error";
      getLogger().warn("[cache] Redis error, falling back to memory", { error: err.message });
    });
    redisClient.on("end", () => {
      redisStatus = "ended";
      getLogger().warn("[cache] Redis connection ended, using memory fallback");
    });
  } catch (error) {
    redisStatus = "error";
    getLogger().warn("[cache] Redis client not available, using in-memory cache", {
      error: error.message,
    });
    redisClient = null;
  }
  return redisClient;
};

const cleanupMemory = () => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.expiresAt && entry.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
};

const getCache = async (key) => {
  const redis = connectRedis();
  if (redis) {
    const value = await redis.get(key);
    try {
      return value ? JSON.parse(value) : null;
    } catch (err) {
      return null;
    }
  }
  cleanupMemory();
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
};

const setCache = async (key, value, ttlMs = 60000) => {
  const redis = connectRedis();
  const payload = JSON.stringify(value);
  if (redis) {
    await redis.set(key, payload, "PX", ttlMs);
    return;
  }
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const deleteCache = async (key) => {
  const redis = connectRedis();
  if (redis) {
    await redis.del(key);
    return;
  }
  memoryStore.delete(key);
};

const incrementWithTtl = async (key, ttlMs) => {
  const redis = connectRedis();
  if (redis) {
    const [count] = await redis
      .multi()
      .incr(key)
      .pexpire(key, ttlMs)
      .exec();
    return count?.[1] || 0;
  }

  cleanupMemory();
  const existing = memoryStore.get(key);
  const now = Date.now();
  if (!existing || (existing.expiresAt && existing.expiresAt <= now)) {
    const entry = { value: 1, expiresAt: now + ttlMs };
    memoryStore.set(key, entry);
    return 1;
  }
  existing.value += 1;
  memoryStore.set(key, existing);
  return existing.value;
};

const cacheBackend = () => (connectRedis() ? "redis" : "memory");

module.exports = {
  getCache,
  setCache,
  deleteCache,
  incrementWithTtl,
  cacheBackend,
};
