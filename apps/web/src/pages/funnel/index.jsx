"use strict";

import Head from "next/head";
import Funnel from "../../components/Funnel";
import { FunnelProvider, useFunnel } from "../../contexts/FunnelContext";
import { getTomorrowIso } from "../../utils/dates";
import SiteNavbar from "../../components/layout/SiteNavbar";
import SiteFooter from "../../components/layout/SiteFooter";

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
      title: "Detalles del envío",
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
      title: "Preferencias y verificación",
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
        <h1 style={{ margin: 0 }}>Planificador de envíos</h1>
        <Funnel.ProgressBar currentStep={currentStep} />
      </div>
      <div className="steps-grid">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`step-group ${currentStep === index ? "active" : ""}`}
          >
            <h2 className="step-title">{step.title}</h2>
            {step.component}
          </div>
        ))}
      </div>

      <Funnel.ActionsBar
        currentStep={currentStep}
        onPrev={handlePrev}
        onNext={handleNext}
        onPrimary={handlePrimaryAction}
        actionLoading={actionLoading}
        quoteReady={Boolean(quoteState.data) && !quoteState.loading && !quoteState.error}
        primaryLabel={primaryLabel}
      />

      <Funnel.GlobalErrorBanner show={showGlobalError} message={GLOBAL_ERROR_MESSAGE} />
      <Funnel.StatusMessage message={statusMessage} />
    </Funnel.Layout>
  );
};

export default function FunnelPage() {
  return (
    <>
      <Head>
        <title>Funnel – Envíos a Cuba</title>
      </Head>
      <SiteNavbar />
      <main className="page-shell">
        <FunnelProvider>
          <FunnelView />
        </FunnelProvider>
      </main>
      <SiteFooter />
    </>
  );
}
