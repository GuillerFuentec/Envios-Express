"use strict";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRecaptcha } from "../components/ReCaptchaProvider";
import { useRefreshPrompt } from "../contexts/RefreshPromptContext";
import { useAgencyConfig } from "./useAgencyConfig";
import {
  createAgencyOrder,
  requestCheckout,
  requestQuote,
} from "../utils/apiClient";
import { validateContact, validatePreferences, validateShipment } from "../utils/validators";
import { INITIAL_FORM_STATE, GLOBAL_ERROR_MESSAGE } from "../constants/funnel";

const buildQuotePayload = (formData) => {
  const isCash = formData.shipment.contentType === "Dinero en efectivo";
  return {
    weightLbs: isCash ? 0 : Number(formData.shipment.weightLbs) || 0,
    cashAmount: isCash ? Number(formData.shipment.cashAmount) || 0 : undefined,
    pickup: isCash ? false : Boolean(formData.preferences.pickup),
    pickupAddressPlaceId: isCash
      ? ""
      : formData.preferences.pickup
      ? formData.preferences.pickupAddressPlaceId || ""
      : "",
    pickupAddress: isCash
      ? ""
      : formData.preferences.pickup
      ? formData.preferences.pickupAddress || ""
      : "",
    contentType: formData.shipment.contentType,
    paymentMethod: isCash ? "online" : formData.preferences.paymentMethod,
    deliveryDate: formData.shipment.deliveryDate,
    cityCuba: formData.shipment.cityCuba,
    pickupAddress: formData.preferences.pickupAddress || undefined,
  };
};

const storeCheckoutPayload = (sessionId, payload) => {
  if (!sessionId) return;
  try {
    localStorage.setItem(
      `checkout:${sessionId}`,
      JSON.stringify({ sessionId, payload, savedAt: Date.now() })
    );
  } catch (error) {
    console.warn("[checkout] No se pudo persistir payload localmente.", error);
  }
};

const consumeCheckoutPayload = (sessionId) => {
  if (!sessionId) return null;
  try {
    const raw = localStorage.getItem(`checkout:${sessionId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    localStorage.removeItem(`checkout:${sessionId}`);
    return parsed;
  } catch (error) {
    console.warn("[checkout] No se pudo leer payload persistido.", error);
    return null;
  }
};

export const useFunnelController = () => {
  const { data: agencyConfig, loading: configLoading, error: configError } = useAgencyConfig();
  const { markDirty } = useRefreshPrompt();

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [currentStep, setCurrentStep] = useState(0);
  const [contactErrors, setContactErrors] = useState({});
  const [shipmentErrors, setShipmentErrors] = useState({});
  const [preferenceErrors, setPreferenceErrors] = useState({});
  const [showGlobalError, setShowGlobalError] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: "", variant: "" });
  const [quoteState, setQuoteState] = useState({ loading: false, data: null, error: "" });
  const [quoteRefreshIndex, setQuoteRefreshIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [pendingSessionId, setPendingSessionId] = useState("");
  const checkoutChannelRef = useRef(null);

  const quotePayload = useMemo(() => buildQuotePayload(formData), [formData]);
  const quotePayloadKey = useMemo(() => JSON.stringify(quotePayload), [quotePayload]);
  const { token: recaptchaToken } = useRecaptcha();
  const recaptchaReady = Boolean(recaptchaToken);

  const getRecaptchaToken = useCallback(
    async (action) => {
      if (!recaptchaToken) {
        console.warn("[recaptcha-client] token faltante", { action });
        throw new Error("Confirma el reCAPTCHA antes de continuar.");
      }
      return recaptchaToken;
    },
    [recaptchaToken]
  );

  const clearFieldError = useCallback((section, field) => {
    const setters = {
      contact: setContactErrors,
      shipment: setShipmentErrors,
      preferences: setPreferenceErrors,
    };
    const setter = setters[section];
    if (!setter) {
      return;
    }
    setter((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const updateField = useCallback(
    (section, field, value) => {
      setFormData((prev) => {
        const nextSection = { ...prev[section], [field]: value };
        if (section === "shipment" && field === "contentType") {
          const isCash = value === "Dinero en efectivo";
          nextSection.weightLbs = isCash ? "" : nextSection.weightLbs;
          nextSection.cashAmount = isCash ? nextSection.cashAmount : "";
          return {
            ...prev,
            shipment: nextSection,
            preferences: {
              ...prev.preferences,
              pickup: isCash ? false : prev.preferences.pickup,
              pickupAddress: isCash ? "" : prev.preferences.pickupAddress,
              pickupAddressPlaceId: isCash ? "" : prev.preferences.pickupAddressPlaceId,
              paymentMethod: isCash ? "online" : prev.preferences.paymentMethod,
            },
          };
        }
        if (section === "preferences" && field === "pickup" && value === false) {
          nextSection.pickupAddress = "";
          nextSection.pickupAddressPlaceId = "";
        }
        return {
          ...prev,
          [section]: nextSection,
        };
      });
      markDirty();
      setShowGlobalError(false);
      clearFieldError(section, field);
    },
    [clearFieldError, markDirty]
  );

  const runContactValidation = useCallback(() => {
    const { errors, normalizedPhone } = validateContact(formData.contact);
    if (normalizedPhone) {
      setFormData((prev) => ({
        ...prev,
        contact: { ...prev.contact, phone: normalizedPhone },
      }));
    }
    setContactErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.contact]);

  const runShipmentValidation = useCallback(() => {
    const { errors } = validateShipment(formData.shipment);
    setShipmentErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.shipment]);

  const runPreferenceValidation = useCallback(() => {
    const { errors } = validatePreferences({
      pickup: formData.preferences.pickup,
      pickupAddressPlaceId: formData.preferences.pickupAddressPlaceId,
      pickupAddress: formData.preferences.pickupAddress,
      paymentMethod: formData.preferences.paymentMethod,
      contentType: formData.shipment.contentType,
    });
    setPreferenceErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.preferences, formData.shipment.contentType]);

  useEffect(() => {
    if (!agencyConfig) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      shipment: {
        ...prev.shipment,
        cityCuba: prev.shipment.cityCuba || agencyConfig.ciudades_de_destino_cuba?.[0] || "",
        contentType: prev.shipment.contentType || agencyConfig.contenido_principal?.[0] || "",
      },
    }));
  }, [agencyConfig]);

  useEffect(() => {
    if (formData.shipment.contentType !== "Dinero en efectivo") {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        pickup: false,
        pickupAddress: "",
        pickupAddressPlaceId: "",
        pickupLocation: null,
        paymentMethod: "online",
      },
    }));
  }, [formData.shipment.contentType]);

  useEffect(() => {
    if (currentStep !== 3) {
      return undefined;
    }
    let active = true;
    setQuoteState({ loading: true, data: null, error: "" });

    const fetchQuote = async () => {
      try {
        const recaptchaToken = await getRecaptchaToken("quote");
        const data = await requestQuote({
          ...quotePayload,
          recaptchaToken,
        });
        if (!active) {
          return;
        }
        setQuoteState({ loading: false, data, error: "" });
        if (data?.policy?.mustPayOnlineForCash && formData.preferences.paymentMethod !== "online") {
          setFormData((prev) => ({
            ...prev,
            preferences: { ...prev.preferences, paymentMethod: "online" },
          }));
        }
      } catch (error) {
        if (active) {
          setQuoteState({
            loading: false,
            data: null,
            error: error.message || "No pudimos generar el desglose.",
          });
        }
      }
    };

    fetchQuote();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, quotePayloadKey, quoteRefreshIndex]);

  useEffect(() => {
    const channel = new BroadcastChannel("checkout-status");
    checkoutChannelRef.current = channel;

    const handleMessage = (event) => {
      const { sessionId, status } = event.data || {};
      if (!sessionId || sessionId !== pendingSessionId) {
        return;
      }
      const target = status === "success" ? "success" : status === "cancel" ? "cancel" : "error";
      window.location.assign(`/funnel/status/${target}?session_id=${encodeURIComponent(sessionId)}`);
    };

    channel.addEventListener("message", handleMessage);
    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [pendingSessionId]);

  const handleNext = useCallback(async () => {
    setOrderResult(null);
    if (currentStep === 0 && !runContactValidation()) {
      setShowGlobalError(true);
      return;
    }
    if (currentStep === 1 && !runShipmentValidation()) {
      setShowGlobalError(true);
      return;
    }
    if (currentStep === 2) {
      if (!runPreferenceValidation()) {
        setShowGlobalError(true);
        return;
      }
    }
    setShowGlobalError(false);
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  }, [currentStep, runContactValidation, runShipmentValidation, runPreferenceValidation]);

  const handlePrev = useCallback(() => {
    setOrderResult(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    setShowGlobalError(false);
  }, []);

  const handlePrimaryAction = useCallback(async () => {
    if (!quoteState.data) {
      setStatusMessage({ text: "Aún no tenemos el desglose listo.", variant: "error" });
      return;
    }
    setActionLoading(true);
    setStatusMessage({ text: "Procesando...", variant: "info" });
    setOrderResult(null);

    const payload = {
      contact: formData.contact,
      shipment: formData.shipment,
      preferences: formData.preferences,
      quoteRequest: quotePayload,
      quote: quoteState.data,
    };

    const prefersOnline = formData.preferences.paymentMethod === "online";
    const recaptchaAction = prefersOnline ? "checkout" : "order";

    try {
      const recaptchaToken = await getRecaptchaToken(recaptchaAction);
      if (prefersOnline) {
        const data = await requestCheckout({
          ...payload,
          recaptchaToken,
        });
        const sessionId = data.sessionId || "";
        const checkoutUrl = data.url || "";
        if (!checkoutUrl) {
          throw new Error("No pudimos iniciar el pago. Intenta de nuevo.");
        }
        setPendingSessionId(sessionId);
        storeCheckoutPayload(sessionId, payload);
        window.location.assign(checkoutUrl);
        setStatusMessage({
          text: "Te redirigimos al checkout para completar el pago...",
          variant: "info",
        });
        return;
      }
      const data = await createAgencyOrder({
        ...payload,
        recaptchaToken,
      });
      setOrderResult({ ok: true, orderId: data.orderId });
      const targetPath = `/funnel/status/success?mode=agency${
        data.orderId ? `&orderId=${encodeURIComponent(data.orderId)}` : ""
      }`;
      const currentPath =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "";
      if (currentPath !== targetPath) {
        window.location.assign(targetPath);
      }
    } catch (error) {
      setStatusMessage({
        text: error.message || "No pudimos completar la acción.",
        variant: "error",
      });
      window.location.assign("/funnel/status/error");
    } finally {
      setActionLoading(false);
    }
  }, [formData, quotePayload, quoteState.data, getRecaptchaToken]);

  const showPolicyBanner = formData.shipment.contentType === "Dinero en efectivo";
  const shouldDisableAgency =
    formData.shipment.contentType === "Dinero en efectivo" ||
    (showPolicyBanner && formData.preferences.pickup) ||
    quoteState.data?.policy?.mustPayOnlineForCash;

  const showGlobalBanner =
    showGlobalError &&
    (Object.keys(contactErrors).length ||
      Object.keys(shipmentErrors).length ||
      Object.keys(preferenceErrors).length);

  const handleQuoteRetry = useCallback(() => {
    setQuoteRefreshIndex((prev) => prev + 1);
  }, []);

  return {
    agencyConfig,
    configLoading,
    configError,
    formData,
    currentStep,
    contactErrors,
    shipmentErrors,
    preferenceErrors,
    showGlobalError: showGlobalBanner,
    statusMessage,
    quoteState,
    actionLoading,
    orderResult,
    showPolicyBanner,
    shouldDisableAgency,
    GLOBAL_ERROR_MESSAGE,
    setStatusMessage,
    updateField,
    handleNext,
    handlePrev,
    handlePrimaryAction,
    handleQuoteRetry,
    consumeCheckoutPayload,
    recaptchaReady,
  };
};
