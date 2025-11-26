"use strict";

const fs = require("fs");
const path = require("path");

const dataDir = path.join(process.cwd(), "data");

const ensureDir = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

const readJson = (filename, fallback = {}) => {
  try {
    ensureDir();
    const full = path.join(dataDir, filename);
    if (!fs.existsSync(full)) return fallback;
    const raw = fs.readFileSync(full, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[storage] readJson error", err);
    return fallback;
  }
};

const writeJson = (filename, data) => {
  ensureDir();
  const full = path.join(dataDir, filename);
  fs.writeFileSync(full, JSON.stringify(data, null, 2), "utf8");
};

module.exports = {
  readJson,
  writeJson,
};
