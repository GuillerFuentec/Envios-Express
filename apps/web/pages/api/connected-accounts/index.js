"use strict";

import Stripe from "stripe";
import {
  setConnectedAccount,
  listConnectedAccounts,
  getConnectedAccount,
  deleteConnectedAccount,
} from "../../../lib/server/connectedAccounts";

const stripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Falta STRIPE_SECRET_KEY");
  }
  return new Stripe(key, { apiVersion: "2024-06-20" });
};

const ensureAuth = (req) => {
  // TODO: reemplazar por auth real (API key/admin session)
  const token = req.headers["x-admin-token"];
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected || token !== expected) {
    const err = new Error("No autorizado");
    err.status = 401;
    throw err;
  }
};

export default async function handler(req, res) {
  try {
    ensureAuth(req);
    const client = stripe();

    if (req.method === "GET") {
      const serviceId = req.query.serviceId;
      if (serviceId) {
        const accountId = getConnectedAccount(serviceId);
        return res.status(200).json({ serviceId, accountId });
      }
      return res.status(200).json({ accounts: listConnectedAccounts() });
    }

    if (req.method === "POST") {
      const { serviceId, accountId } = req.body || {};
      if (!serviceId || !accountId) {
        return res
          .status(400)
          .json({ error: "serviceId y accountId son obligatorios" });
      }
      // valida que la cuenta existe
      await client.accounts.retrieve(accountId);
      setConnectedAccount(serviceId, accountId);
      return res
        .status(200)
        .json({ ok: true, serviceId, accountId, message: "Cuenta registrada" });
    }

    if (req.method === "DELETE") {
      const { serviceId } = req.body || {};
      if (!serviceId) {
        return res.status(400).json({ error: "serviceId es obligatorio" });
      }
      const removed = deleteConnectedAccount(serviceId);
      return res
        .status(200)
        .json({ ok: removed, serviceId, message: "Cuenta desvinculada" });
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).json({ error: "Método no permitido" });
  } catch (error) {
    console.error("[api/connected-accounts]", error);
    return res
      .status(error.status || 500)
      .json({ error: error.message || "Error gestionando cuentas conectadas" });
  }
}
