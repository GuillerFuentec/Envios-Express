"use strict";

const toBool = (value) => {
  if (typeof value !== "string") return false;
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
};

const breakFlag = toBool(process.env.BREAK);

const mockFlag = (name) => {
  if (breakFlag) return false;
  const raw = process.env[name];
  if (raw === undefined) return true; // si el freno está en false, default a true
  return toBool(raw);
};

module.exports = {
  mockFlag,
  toBool,
};
