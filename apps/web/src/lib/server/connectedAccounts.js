"use strict";

const { readJson, writeJson, removeJson } = require("./storage");

const FILENAME = "connected-accounts.json";
const TTL_MS =
  Number(process.env.CONNECTED_ACCOUNTS_TTL_MS || process.env.KV_STORAGE_TTL_MS) ||
  7 * 24 * 60 * 60 * 1000;

const load = async () => {
  const data = await readJson(FILENAME, {});
  return new Map(Object.entries(data));
};

const persist = async (map) => {
  const obj = Object.fromEntries(map.entries());
  await writeJson(FILENAME, obj, TTL_MS);
};

const setConnectedAccount = async (serviceId, accountId) => {
  if (!serviceId || !accountId) {
    throw new Error("serviceId y accountId son obligatorios");
  }
  const map = await load();
  map.set(String(serviceId), String(accountId));
  await persist(map);
};

const getConnectedAccount = async (serviceId) => {
  if (!serviceId) return null;
  const map = await load();
  return map.get(String(serviceId)) || null;
};

const deleteConnectedAccount = async (serviceId) => {
  if (!serviceId) return false;
  const map = await load();
  const res = map.delete(String(serviceId));
  if (map.size === 0) {
    await removeJson(FILENAME);
  } else {
    await persist(map);
  }
  return res;
};

const listConnectedAccounts = async () => {
  const map = await load();
  return Array.from(map.entries()).map(([serviceId, accountId]) => ({
    serviceId,
    accountId,
  }));
};

module.exports = {
  setConnectedAccount,
  getConnectedAccount,
  deleteConnectedAccount,
  listConnectedAccounts,
};
