"use strict";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAgencyConfig } from "./useAgencyConfig";
import { useRecaptcha } from "./useRecaptcha";
import {
  createAgencyOrder,
  requestCheckout,
  requestQuote,
  verifyRecaptchaToken,
} from "../utils/apiClient";
import { validateContact, validatePreferences, validateShipment } from "../utils/validators";
import { INITIAL_FORM_STATE, GLOBAL_ERROR_MESSAGE } from "../constants/funnel";

const siteKey =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
  process.env.NEXT_PUBLIC_RECAPTCHA_SITEKEY ||
  "";

const buildQuotePayload = (formData) => ({
  weightLbs: Number(formData.shipment.weightLbs) || 0,
  pickup: Boolean(formData.preferences.pickup),
  pickupAddressPlaceId: formData.preferences.pickup
    ? formData.preferences.pickupAddressPlaceId || ""
    : "",
  pickupAddress: formData.preferences.pickup ? formData.preferences.pickupAddress || "" : "",
  contentType: formData.shipment.contentType,
  paymentMethod: formData.preferences.paymentMethod,
  deliveryDate: formData.shipment.deliveryDate,
  cityCuba: formData.shipment.cityCuba,
});

export const useFunnelController = () => {
  const { data: agencyConfig, loading: configLoading, error: configError } = useAgencyConfig();
  const { ready: recaptchaReady, execute: executeRecaptcha } = useRecaptcha(siteKey);

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
  const [verifyingCaptcha, setVerifyingCaptcha] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [recaptchaVerifiedAt, setRecaptchaVerifiedAt] = useState(0);
  const [orderResult, setOrderResult] = useState(null);

  const quotePayload = useMemo(() => buildQuotePayload(formData), [formData]);
  const quotePayloadKey = useMemo(() => JSON.stringify(quotePayload), [quotePayload]);

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
        if (section === "preferences" && field === "pickup" && value === false) {
          nextSection.pickupAddress = "";
          nextSection.pickupAddressPlaceId = "";
        }
        return {
          ...prev,
          [section]: nextSection,
        };
      });
      setShowGlobalError(false);
      clearFieldError(section, field);
    },
    [clearFieldError]
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
    });
    setPreferenceErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.preferences]);

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
    if (
      formData.shipment.contentType === "Dinero en efectivo" &&
      formData.preferences.pickup &&
      formData.preferences.paymentMethod !== "online"
    ) {
      setFormData((prev) => ({
        ...prev,
        preferences: { ...prev.preferences, paymentMethod: "online" },
      }));
    }
  }, [formData.preferences.pickup, formData.preferences.paymentMethod, formData.shipment.contentType]);

  useEffect(() => {
    if (currentStep !== 3) {
      return;
    }
    let active = true;
    setQuoteState((prev) => ({ ...prev, loading: true, error: "", data: null }));
    requestQuote(quotePayload)
      .then((data) => {
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
      })
      .catch((error) => {
        if (active) {
          setQuoteState({ loading: false, data: null, error: error.message });
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, quotePayloadKey, quoteRefreshIndex]);

  const runRecaptchaVerification = useCallback(async () => {
    if (!siteKey) {
      setStatusMessage({
        text: "Falta NEXT_PUBLIC_RECAPTCHA_SITE_KEY. Configura la variable de entorno.",
        variant: "error",
      });
      return null;
    }
    if (!recaptchaReady) {
      setStatusMessage({
        text: "reCAPTCHA se está inicializando. Intenta nuevamente en unos segundos.",
        variant: "error",
      });
      return null;
    }
    setVerifyingCaptcha(true);
    try {
      const token = await executeRecaptcha("funnel");
      const result = await verifyRecaptchaToken(token);
      if (!result?.ok) {
        setStatusMessage({
          text: "No pudimos verificar reCAPTCHA. Intenta de nuevo.",
          variant: "error",
        });
        return null;
      }
      setRecaptchaToken(token);
      setRecaptchaVerifiedAt(Date.now());
      setStatusMessage({ text: "Captcha verificado correctamente.", variant: "success" });
      return token;
    } catch (error) {
      setStatusMessage({
        text: error.message || "No se pudo verificar reCAPTCHA.",
        variant: "error",
      });
      return null;
    } finally {
      setVerifyingCaptcha(false);
    }
  }, [executeRecaptcha, recaptchaReady]);

  const ensureRecentRecaptcha = useCallback(async () => {
    const now = Date.now();
    if (recaptchaToken && now - recaptchaVerifiedAt < 1000 * 100) {
      return recaptchaToken;
    }
    return runRecaptchaVerification();
  }, [recaptchaToken, recaptchaVerifiedAt, runRecaptchaVerification]);

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
      const token = await runRecaptchaVerification();
      if (!token) {
        setShowGlobalError(true);
        return;
      }
    }
    setShowGlobalError(false);
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  }, [
    currentStep,
    runContactValidation,
    runShipmentValidation,
    runPreferenceValidation,
    runRecaptchaVerification,
  ]);

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
    const token = await ensureRecentRecaptcha();
    if (!token) {
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
      recaptchaToken: token,
    };

    try {
      if (formData.preferences.paymentMethod === "online") {
        const data = await requestCheckout(payload);
        window.location.assign(data.url);
        return;
      }
      const data = await createAgencyOrder(payload);
      setOrderResult({ ok: true, orderId: data.orderId });
      setStatusMessage({
        text: "Orden confirmada. Te esperamos en la agencia.",
        variant: "success",
      });
    } catch (error) {
      setStatusMessage({
        text: error.message || "No pudimos completar la acción.",
        variant: "error",
      });
    } finally {
      setActionLoading(false);
    }
  }, [ensureRecentRecaptcha, formData, quotePayload, quoteState.data]);

  const showPolicyBanner = formData.shipment.contentType === "Dinero en efectivo";
  const shouldDisableAgency =
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
    verifyingCaptcha,
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
  };
};
