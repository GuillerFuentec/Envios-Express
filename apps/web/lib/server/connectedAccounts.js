"use strict";

const { readJson, writeJson } = require("./storage");

const FILENAME = "connected-accounts.json";

const load = () => {
  const data = readJson(FILENAME, {});
  return new Map(Object.entries(data));
};

const persist = (map) => {
  const obj = Object.fromEntries(map.entries());
  writeJson(FILENAME, obj);
};

const setConnectedAccount = (serviceId, accountId) => {
  if (!serviceId || !accountId) {
    throw new Error("serviceId y accountId son obligatorios");
  }
  const map = load();
  map.set(String(serviceId), String(accountId));
  persist(map);
};

const getConnectedAccount = (serviceId) => {
  if (!serviceId) return null;
  const map = load();
  return map.get(String(serviceId)) || null;
};

const deleteConnectedAccount = (serviceId) => {
  if (!serviceId) return false;
  const map = load();
  const res = map.delete(String(serviceId));
  persist(map);
  return res;
};

const listConnectedAccounts = () => {
  const map = load();
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
