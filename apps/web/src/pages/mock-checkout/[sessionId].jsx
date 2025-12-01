"use strict";

// Mock checkout page for load tests (used when MOCK_STRIPE/LOAD_TEST_MODE are enabled).
// It simply confirms the mock session and redirects to the success status page.

import { useEffect } from "react";
import { useRouter } from "next/router";

const MockCheckout = () => {
  const router = useRouter();
  const { sessionId } = router.query || {};

  useEffect(() => {
    if (!sessionId) return;
    // Notify any listeners (e.g., funnel) that checkout succeeded.
    try {
      const channel = new BroadcastChannel("checkout-status");
      channel.postMessage({ sessionId, status: "success" });
      channel.close();
    } catch (_) {
      // ignore broadcast errors
    }
    // Redirect to success page to mimic Stripe flow.
    router.replace(`/funnel/status/success?session_id=${encodeURIComponent(sessionId)}`);
  }, [sessionId, router]);

  return (
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Mock checkout en progreso</h1>
      <p>Session: {sessionId || "cargando..."}</p>
      <p>Redirigiendo al estado de éxito...</p>
    </main>
  );
};

export default MockCheckout;
