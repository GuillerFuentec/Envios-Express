"use strict";

const { verificarEstadoTransaccion } = require("../../../../utils/stripe");
const crypto = require("crypto");
const { sendNotificationEmail, sendReceiptEmail } = require("../../../../utils/resend");
const { sendClientThankYouSms } = require("../../../../utils/notification-api");
const { normalizePhoneNumber } = require("../../../../utils/phone");

const escapeHtml = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatCurrency = (amount, currency = "USD") => {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "N/D";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatCents = (cents, currency = "USD") => {
  if (typeof cents !== "number" || Number.isNaN(cents)) {
    return null;
  }
  return formatCurrency(cents / 100, currency);
};

const htmlList = (title, rows = []) => {
  if (!rows.length) {
    return "";
  }
  const items = rows
    .filter(Boolean)
    .map(
      ({ label, value }) =>
        `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(
          value ?? "-"
        )}</li>`
    )
    .join("");
  return `<h2 style="margin:16px 0 8px;">${escapeHtml(
    title
  )}</h2><ul style="padding-left:18px;">${items}</ul>`;
};

const textList = (title, rows = []) => {
  if (!rows.length) {
    return "";
  }
  const items = rows
    .filter(Boolean)
    .map(({ label, value }) => `- ${label}: ${value ?? "-"}`)
    .join("\n");
  return `${title}\n${items}`;
};

const buildSignatureHash = (subject, text) =>
  crypto.createHash("sha1").update(`${subject}|${text}`).digest("hex");

module.exports = {
  async afterCreate(event) {
    const { result } = event;

    const isDraftCreation =
      result?.publishedAt === null ||
      result?.publishedAt === undefined ||
      event.params?.data?.publishedAt === null ||
      event.params?.data?.publishedAt === undefined;

    if (!isDraftCreation) {
      strapi.log.debug(
        "[client-lifecycle] Skip notification (publish action).",
        {
          pid: process.pid,
          id: result?.id ?? "desconocido",
          publishedAt: result?.publishedAt,
        }
      );
      return;
    }

    const payload = result?.client_info ?? {};
    const id = result?.id ?? "desconocido";
    const sessionId = payload.sessionId ?? "";
    let stripeSession = null;
    if (sessionId) {
      try {
        stripeSession = await verificarEstadoTransaccion(sessionId);
      } catch (err) {
        strapi.log.warn('[client-lifecycle] No se pudo verificar la sesion Stripe', { sessionId, error: err.message });
      }
    }
    const contact = payload.contact || {};
    const shipment = payload.shipment || {};
    const preferences = payload.preferences || {};
    const quote = payload.quote || {};
    const billing = payload.billing || {};
    const billingCurrency = billing.currency || quote.currency || "USD";
    const destinationAmount = billing.destinationAmountCents
      ? formatCents(billing.destinationAmountCents, billingCurrency)
      : "N/D";
    const stripeFee = billing.stripeFeeCents
      ? formatCents(billing.stripeFeeCents, billingCurrency)
      : "N/D";
    const platformFee = billing.platformFeeCents
      ? formatCents(billing.platformFeeCents, billingCurrency)
      : "N/D";

    const subject = `Nuevo encargo creado (#${id})`;

    const html = `
      <h1 style="margin:0 0 12px;">Nuevo encargo</h1>
      <p>Se registró un nuevo encargo en la plataforma.</p>
      <p><strong>ID:</strong> ${escapeHtml(String(id))}</p>
      ${htmlList("Datos de contacto", [
        { label: "Nombre", value: contact.name },
        { label: "Correo", value: contact.email },
        { label: "Teléfono", value: contact.phone },
        { label: "SMS consentido", value: contact.smsConsent ? "Sí" : "No" },
      ])}
      ${htmlList("Detalles del pedido", [
        { label: "Contenido", value: shipment.contentType },
        { label: "Ciudad destino", value: shipment.cityCuba },
        { label: "Fecha entrega", value: shipment.deliveryDate },
        { label: "Peso (lb)", value: shipment.weightLbs },
        { label: "Monto efectivo", value: shipment.cashAmount },
        { label: "Pago", value: preferences.paymentMethod },
        {
          label: "Recogida a domicilio",
          value: preferences.pickup ? "Sí" : "No",
        },
        { label: "Dirección de recogida", value: preferences.pickupAddress },
      ])}
      ${htmlList("Cobro / billing", [
        {
          label: "Total pagado",
          value: formatCurrency(quote.total, quote.currency || "USD"),
        },
        { label: "Comisión plataforma", value: platformFee },
        { label: "Fee Stripe (aprox)", value: stripeFee },
        { label: "Monto para agencia", value: destinationAmount },
        { label: "Cuenta destino", value: billing.destinationAccount || "N/D" },
      ])}
    `;

    const textSections = [
      textList("Datos de contacto", [
        { label: "Nombre", value: contact.name },
        { label: "Correo", value: contact.email },
        { label: "Teléfono", value: contact.phone },
        { label: "SMS consentido", value: contact.smsConsent ? "Sí" : "No" },
      ]),
      textList("Detalles del pedido", [
        { label: "Contenido", value: shipment.contentType },
        { label: "Ciudad destino", value: shipment.cityCuba },
        { label: "Fecha entrega", value: shipment.deliveryDate },
        { label: "Peso (lb)", value: shipment.weightLbs },
        { label: "Monto efectivo", value: shipment.cashAmount },
        { label: "Pago", value: preferences.paymentMethod },
        {
          label: "Recogida a domicilio",
          value: preferences.pickup ? "Sí" : "No",
        },
        { label: "Dirección de recogida", value: preferences.pickupAddress },
      ]),
      textList("Cobro / billing", [
        {
          label: "Total pagado",
          value: formatCurrency(quote.total, quote.currency || "USD"),
        },
        { label: "Comisión plataforma", value: platformFee },
        { label: "Fee Stripe (aprox)", value: stripeFee },
        { label: "Monto para agencia", value: destinationAmount },
        { label: "Cuenta destino", value: billing.destinationAccount || "N/D" },
      ]),
    ]
      .filter(Boolean)
      .join("\n\n");

    const text = `Se registró un nuevo encargo (ID: ${id}).\n\n${textSections}`;

    const signature = buildSignatureHash(subject, text);
    strapi.log.debug("[client-lifecycle] Enviando correo de cliente.", {
      pid: process.pid,
      id,
      signature,
    });

    await sendNotificationEmail({ subject, html, text });

    const contactInfo = payload?.contact || {};
    const smsConsent = Boolean(contactInfo.smsConsent);

    strapi.log.debug("[client-lifecycle] Evaluando SMS.", {
      pid: process.pid,
      id,
      smsConsent,
      rawPhone: contactInfo.phone,
    });

    if (!smsConsent) {
      return;
    }

    try {
      const normalizedPhone = normalizePhoneNumber(contactInfo.phone);
      if (normalizedPhone) {
        await sendClientThankYouSms({
          phone: normalizedPhone,
          name: contactInfo.name,
        });
        strapi.log.debug("[client-lifecycle] SMS enviado al cliente.", {
          pid: process.pid,
          id,
          phone: normalizedPhone,
        });
      } else {
        strapi.log.warn("No se pudo enviar SMS: telefono invalido en cliente", {
          id: result.id,
        });
      }
    } catch (error) {
      strapi.log.warn("No se pudo enviar el SMS del cliente", error);
    }

    if (stripeSession) {
      const { estadoPago, estadoSesion, montoTotal, productosComprados, detallesCargo, moneda, fechaCreacion, detallesCliente } = stripeSession;
      if (estadoPago === 'paid') {
        const clienteEmail = (detallesCliente?.email || contact.email || '').trim();
        if (clienteEmail) {
          const receiptSubject = `Recibo de pago #${id}`;
          const productosHtml = htmlList('Productos', productosComprados.map(p => ({ label: `${p.nombre} x${p.cantidad}`, value: formatCurrency(p.precioUnitario * p.cantidad, moneda.toUpperCase()) })));
          const cargoHtml = detallesCargo ? htmlList('Cargo', [
            { label: 'ID Cargo', value: detallesCargo.id },
            { label: 'Estado Cargo', value: detallesCargo.estado },
            { label: 'Metodo pago', value: detallesCargo.metodoPago },
            { label: 'Fecha', value: detallesCargo.fechaCreacion },
          ]) : '';
          const totalHtml = htmlList('Total', [
            { label: 'Monto total', value: formatCurrency(montoTotal, moneda.toUpperCase()) },
            { label: 'Estado pago', value: estadoPago },
            { label: 'Estado sesion', value: estadoSesion },
          ]);
          const receiptHtml = `<h1 style="margin:0 0 12px;">Recibo de pago</h1>${totalHtml}${productosHtml}${cargoHtml}`;
          const productosText = productosComprados.map(p => `  * ${p.nombre} x${p.cantidad} = ${formatCurrency(p.precioUnitario * p.cantidad, moneda.toUpperCase())}`).join('\n');
          const cargoText = detallesCargo ? [
            `ID Cargo: ${detallesCargo.id}`,
            `Estado Cargo: ${detallesCargo.estado}`,
            `Metodo pago: ${detallesCargo.metodoPago}`,
            `Fecha: ${detallesCargo.fechaCreacion}`,
          ].join('\n') : '';
          const receiptText = `Recibo de pago\nMonto total: ${formatCurrency(montoTotal, moneda.toUpperCase())}\nEstado pago: ${estadoPago}\nEstado sesion: ${estadoSesion}\nProductos:\n${productosText}${cargoText ? '\n' + cargoText : ''}`;
          try {
            await sendReceiptEmail({ to: clienteEmail, subject: receiptSubject, html: receiptHtml, text: receiptText });
            strapi.log.info('[client-lifecycle] Recibo enviado al cliente', { id, clienteEmail });
          } catch (err) {
            strapi.log.error('[client-lifecycle] Error al enviar recibo', err);
          }
        } else {
          strapi.log.warn('[client-lifecycle] No hay correo cliente para enviar recibo', { id });
        }
      } else {
        strapi.log.debug('[client-lifecycle] Pago no completado; omitimos recibo', { id, estadoPago });
      }
    }
  },

};
