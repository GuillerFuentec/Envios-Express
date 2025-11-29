"use strict";

import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import Funnel from "../../components/Funnel";
import { FunnelProvider, useFunnel } from "../../contexts/FunnelContext";
import { RefreshPromptProvider } from "../../contexts/RefreshPromptContext";
import { getTomorrowIso } from "../../utils/dates";
import SiteNavbar from "../../components/layout/SiteNavbar";
import ReCaptchaCheckbox from "../../components/ReCaptchaCheckbox";
import Footer from "../../components/home/Footer";

const FunnelView = () => {
  const {
    agencyConfig,
    configLoading,
    configError,
    formData,
    currentStep,
    contactErrors,
    shipmentErrors,
    preferenceErrors,
    showGlobalError,
    statusMessage,
    quoteState,
    actionLoading,
    orderResult,
    showPolicyBanner,
    shouldDisableAgency,
    GLOBAL_ERROR_MESSAGE,
    updateField,
    handleNext,
    handlePrev,
    handlePrimaryAction,
    handleQuoteRetry,
    recaptchaReady,
  } = useFunnel();

  const steps = [
    {
      id: 0,
      title: "Datos del remitente",
      component: (
        <Funnel.Steps.Contact
          data={formData.contact}
          errors={contactErrors}
          onChange={updateField}
        />
      ),
    },
    {
      id: 1,
      title: "Detalles del envio",
      component: (
        <Funnel.Steps.Shipment
          data={formData.shipment}
          errors={shipmentErrors}
          agencyConfig={agencyConfig}
          loading={configLoading}
          error={configError}
          onChange={updateField}
          showPolicyBanner={showPolicyBanner}
          minDate={getTomorrowIso()}
        />
      ),
    },
    {
      id: 2,
      title: "Preferencias y verificacion",
      component: (
        <Funnel.Steps.Preferences
          data={formData.preferences}
          errors={preferenceErrors}
          shouldDisableAgency={shouldDisableAgency}
          isCash={formData.shipment.contentType === "Dinero en efectivo"}
          agencyAddress={agencyConfig?.address}
          onFieldChange={updateField}
        />
      ),
    },
    {
      id: 3,
      title: "Resumen final",
      component: (
        <Funnel.Steps.Summary
          quoteState={quoteState}
          paymentMethod={formData.preferences.paymentMethod}
          contactInfo={formData.contact}
          onRetry={handleQuoteRetry}
          orderResult={orderResult}
        />
      ),
    },
  ];

  const primaryLabel =
    formData.preferences.paymentMethod === "online"
      ? "Pagar online"
      : "Confirmar y pagar en agencia";

  return (
    <Funnel.Layout>
      <div className="funnel-header">
        <p className="funnel-eyebrow">Paso {currentStep + 1} de 4</p>
        <h1 style={{ margin: 0 }}>Planificador de envios</h1>
        <Funnel.ProgressBar currentStep={currentStep} />
      </div>
      <div className="steps-grid">
        {steps.map((step, index) => (
          <div key={step.id} className={`step-group ${currentStep === index ? "active" : ""}`}>
            <h2 className="step-title">{step.title}</h2>
            {step.component}
          </div>
        ))}
      </div>

      {currentStep === 3 && (
        <div className="mt-4 mb-6 flex flex-col gap-2 items-end">
          <p className="text-sm text-gray-600 text-right">
            Confirma que no eres un robot para continuar.
          </p>
          <ReCaptchaCheckbox />
        </div>
      )}

      <Funnel.ActionsBar
        currentStep={currentStep}
        onPrev={handlePrev}
        onNext={handleNext}
        onPrimary={handlePrimaryAction}
        actionLoading={actionLoading}
        quoteReady={Boolean(quoteState.data) && !quoteState.loading && !quoteState.error}
        disablePrimary={!recaptchaReady}
        primaryLabel={primaryLabel}
      />

      <Funnel.GlobalErrorBanner show={showGlobalError} message={GLOBAL_ERROR_MESSAGE} />
      <Funnel.StatusMessage message={statusMessage} />
    </Funnel.Layout>
  );
};

export default function FunnelPage() {
  const allowUnloadRef = useRef(false);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (allowUnloadRef.current) {
        return;
      }
      const message =
        "Esta seguro que desea refrescar la pagina. Si lo hace todo el progreso se perdera";
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const confirmExit = () => {
    allowUnloadRef.current = true;
    window.location.reload();
  };

  return (
    <>
      <Head>
        <title>Envios Express</title>
      </Head>
      <RefreshPromptProvider>
        <SiteNavbar />
        <main className="page-shell">
          <FunnelProvider>
            <FunnelView />
          </FunnelProvider>
        </main>
        <Footer />
      </RefreshPromptProvider>
    </>
  );
}
