"use strict";

const { getAgencyProfile } = require("./agency");
const { getDistanceMatrix } = require("./distance");

const PLATFORM_FEE_RATE = 0.023;
const PICKUP_BASE_FEE = 10;
const PICKUP_PER_MILE = 0.99;
const CASH_FEE_ONLINE = 0.089;
const CASH_FEE_AGENCY = 0.1;

const roundCurrency = (value) => {
  const amount = Number(value) || 0;
  return Math.round(amount * 100) / 100;
};

const ensureDateAtLeastTomorrow = (dateString) => {
  if (!dateString) {
    return false;
  }
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return parsed >= tomorrow;
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }
  return value === "true" || value === "1";
};

const logContext = (label, data) => {
  console.log(`[quote-engine] ${label}`, data);
};

const calculateQuote = async (payload = {}) => {
  const {
    weightLbs,
    pickup,
    pickupAddressPlaceId,
    pickupAddress,
    contentType,
    paymentMethod,
    deliveryDate,
    cityCuba,
    cashAmount,
  } = payload;

  const isCash =
    typeof contentType === "string" &&
    contentType.toLowerCase() === "dinero en efectivo";

  const normalizedWeight = Number(weightLbs);
  const normalizedCash = Number(cashAmount);

  if (isCash) {
    if (!Number.isFinite(normalizedCash) || normalizedCash < 20) {
      const error = new Error("El monto en efectivo debe ser mayor o igual a $20.");
      error.status = 400;
      throw error;
    }
  } else if (!Number.isFinite(normalizedWeight) || normalizedWeight <= 0) {
    const error = new Error("El peso debe ser mayor a 0.");
    error.status = 400;
    throw error;
  }

  if (!cityCuba) {
    const error = new Error("Seleccione una ciudad de destino en Cuba.");
    error.status = 400;
    throw error;
  }

  logContext("Incoming payload", {
    weightLbs,
    cashAmount,
    pickup,
    hasPickupPlaceId: Boolean(pickupAddressPlaceId),
    hasPickupAddress: Boolean(pickupAddress),
    contentType,
    paymentMethod,
    deliveryDate,
    cityCuba,
  });

  if (!deliveryDate || !ensureDateAtLeastTomorrow(deliveryDate)) {
    const error = new Error("La fecha mínima de entrega es mañana.");
    error.status = 400;
    throw error;
  }

  if (!paymentMethod || !["online", "agency"].includes(paymentMethod)) {
    const error = new Error("Seleccione un método de pago válido.");
    error.status = 400;
    throw error;
  }
  if (isCash && paymentMethod !== "online") {
    const error = new Error("Para dinero en efectivo solo se permite pago online.");
    error.status = 400;
    throw error;
  }

  const normalizedPaymentMethod = isCash ? "online" : paymentMethod;
  const pickupEnabled = isCash ? false : parseBoolean(pickup);
  if (pickupEnabled) {
    const hasPlaceId = Boolean(pickupAddressPlaceId);
    const hasAddress = Boolean(
      pickupAddress && String(pickupAddress).trim().length > 5
    );
    if (!hasPlaceId && !hasAddress) {
      const error = new Error("La dirección de recogida es obligatoria.");
      error.status = 400;
      throw error;
    }
  }

  const agencyProfile = await getAgencyProfile();
  const pricePerLb =
    Number(agencyProfile.Price_lb) ||
    Number(process.env.DEFAULT_PRICE_PER_LB || 0);

  const baseAmount = isCash
    ? roundCurrency(normalizedCash)
    : roundCurrency(normalizedWeight * pricePerLb);

  let pickupAmount = 0;
  let pickupDetails = null;

  if (pickupEnabled) {
    const originPlaceId =
      agencyProfile.place_id || process.env.AGENCY_PLACE_ID || "";
    if (!originPlaceId) {
      const configError = new Error(
        "No se configuró el place_id de la agencia para calcular la recogida."
      );
      configError.status = 500;
      throw configError;
    }
    const distance = await getDistanceMatrix({
      originPlaceId,
      destinationPlaceId: pickupAddressPlaceId,
      destinationAddress: pickupAddress,
    });
    logContext("Pickup distance", distance);
    pickupAmount = roundCurrency(
      PICKUP_BASE_FEE + distance.distanceMiles * PICKUP_PER_MILE
    );
    pickupDetails = distance;
  }

  const cashRate =
    normalizedPaymentMethod === "agency" ? CASH_FEE_AGENCY : CASH_FEE_ONLINE;
  const cashFee = isCash ? roundCurrency(baseAmount * cashRate) : 0;

  const subtotal = baseAmount + pickupAmount + cashFee;
  const platformFeeAmount =
    normalizedPaymentMethod === "online" ? subtotal * PLATFORM_FEE_RATE : 0;

  const stripePercent =
    typeof agencyProfile.stripe_processing_percent === "number"
      ? agencyProfile.stripe_processing_percent
      : Number(process.env.STRIPE_PROCESSING_PERCENT || 0.029);
  const stripeFixed =
    typeof agencyProfile.stripe_processing_fixed === "number"
      ? agencyProfile.stripe_processing_fixed
      : Number(process.env.STRIPE_PROCESSING_FIXED || 0.3);

  const stripeFeeAmount =
    normalizedPaymentMethod === "online"
      ? subtotal * stripePercent + stripeFixed
      : 0;

  const processingFee =
    normalizedPaymentMethod === "online"
      ? roundCurrency(platformFeeAmount + stripeFeeAmount)
      : 0;

  const total = roundCurrency(subtotal + processingFee);
  const mustPayOnlineForCash = isCash ? true : false;

  const response = {
    ok: true,
    currency: "USD",
    pricePerLb,
    inputs: {
      weightLbs: normalizedWeight,
      cashAmount: isCash ? normalizedCash : undefined,
      pickup: pickupEnabled,
      cityCuba,
      contentType,
      paymentMethod: normalizedPaymentMethod,
      deliveryDate,
    },
    breakdown: {
      weight: {
        amount: baseAmount,
        label: isCash
          ? `Monto en efectivo ($${baseAmount.toFixed(2)})`
          : `Peso (${normalizedWeight} lb x ${pricePerLb.toFixed(2)})`,
      },
      pickup: pickupEnabled
        ? {
            amount: pickupAmount,
            label: `Pick-up ($${PICKUP_BASE_FEE} + $${PICKUP_PER_MILE}/mi * ${
              pickupDetails?.distanceMiles ?? 0
            }mi)`,
            ...pickupDetails,
          }
        : {
            amount: 0,
            distanceMiles: 0,
          },
      cashFee: {
        amount: cashFee,
        label: "Fee (Dinero en efectivo)",
      },
      processingFee: {
        amount: processingFee,
        label: "Tarifa de procesamiento",
      },
    },
    policy: {
      mustPayOnlineForCash,
      payAtAgencyAllowed: !mustPayOnlineForCash,
    },
    pickupDetails,
    total,
  };

  logContext("Quote response", {
    total,
    breakdown: response.breakdown,
    policy: response.policy,
  });

  return response;
};

module.exports = {
  calculateQuote,
};
