"use strict";

// concurrency: async, stateless storage backed by Redis or in-memory fallback
const { getCache, setCache, deleteCache } = require("./cache");

const DEFAULT_STORAGE_TTL_MS =
  Number(process.env.KV_STORAGE_TTL_MS || process.env.CONNECTED_ACCOUNTS_TTL_MS) ||
  7 * 24 * 60 * 60 * 1000; // 7 days

const readJson = async (key, fallback = {}) => {
  try {
    const value = await getCache(key);
    if (value !== null && value !== undefined) {
      return value;
    }
    return fallback;
  } catch (err) {
    console.error("[storage] readJson error", err);
    return fallback;
  }
};

const writeJson = async (key, data, ttlMs = DEFAULT_STORAGE_TTL_MS) => {
  try {
    await setCache(key, data, ttlMs);
  } catch (err) {
    console.error("[storage] writeJson error", err);
  }
};

const removeJson = async (key) => {
  try {
    await deleteCache(key);
  } catch (err) {
    console.error("[storage] removeJson error", err);
  }
};

module.exports = {
  readJson,
  writeJson,
  removeJson,
};
