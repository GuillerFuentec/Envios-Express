import { normalizePhoneNumber } from "./phone";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateContact = (contact) => {
  const errors = {};
  const name = (contact.name || "").trim();
  const email = (contact.email || "").trim();
  const phone = (contact.phone || "").trim();
  const normalizedPhone = normalizePhoneNumber(phone);

  if (name.length < 3) {
    errors.name = "Ingrese un nombre válido.";
  }

  if (!emailRegex.test(email)) {
    errors.email = "Ingrese un correo válido.";
  }

  if (!normalizedPhone) {
    errors.phone = "Ingrese un teléfono válido (10 dígitos de EE.UU.).";
  }

  if (!contact.smsConsent) {
    errors.smsConsent = "Debe autorizar mensajes SMS.";
  }

  return { errors, normalizedPhone };
};

export const validateShipment = ({
  weightLbs,
  deliveryDate,
  cityCuba,
  contentType,
  cashAmount,
}) => {
  const errors = {};
  const isCash = contentType === "Dinero en efectivo";
  const weight = Number(weightLbs);
  const cashValue = Number(cashAmount);

  if (isCash) {
    if (!Number.isFinite(cashValue) || cashValue < 20) {
      errors.cashAmount = "Ingrese un monto mayor o igual a $20.";
    }
  } else if (!Number.isFinite(weight) || weight <= 0) {
    errors.weightLbs = "Ingrese un peso mayor a 0.";
  }

  if (!cityCuba) {
    errors.cityCuba = "Seleccione una ciudad de destino.";
  }

  if (!contentType) {
    errors.contentType = "Seleccione el contenido principal.";
  }

  if (!deliveryDate) {
    errors.deliveryDate = "Seleccione una fecha estimada.";
  } else {
    const parsed = new Date(deliveryDate);
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (Number.isNaN(parsed.getTime()) || parsed < tomorrow) {
      errors.deliveryDate = "La fecha mínima es mañana.";
    }
  }

  return { errors };
};

export const validatePreferences = ({
  pickup,
  pickupAddressPlaceId,
  pickupAddress,
  paymentMethod,
  contentType,
}) => {
  const errors = {};
  const isCash = contentType === "Dinero en efectivo";
  const hasPlaceId = Boolean(pickupAddressPlaceId);
  const hasManualAddress =
    Boolean(pickupAddress && pickupAddress.trim().length > 5);

  if (pickup && !isCash && !hasPlaceId && !hasManualAddress) {
    errors.pickupAddress = "Ingrese una dirección válida para la recogida.";
  }

  if (!paymentMethod) {
    errors.paymentMethod = "Seleccione un método de pago.";
  } else if (isCash && paymentMethod !== "online") {
    errors.paymentMethod = "Para dinero en efectivo, solo se permite pago online.";
  }

  return { errors };
};
