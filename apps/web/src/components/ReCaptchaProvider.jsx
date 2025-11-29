"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const RecaptchaContext = createContext({
  token: "",
  setToken: () => {},
  reset: () => {},
  refreshKey: 0,
});

export const useRecaptcha = () => useContext(RecaptchaContext);

export function ReCaptchaProvider({ children }) {
  const [token, setToken] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSetToken = useCallback((value) => {
    setToken(value || "");
  }, []);

  const reset = useCallback(() => {
    setToken("");
    setRefreshKey((prev) => prev + 1);
  }, []);

  const value = useMemo(
    () => ({
      token,
      setToken: handleSetToken,
      reset,
      refreshKey,
    }),
    [token, reset, refreshKey, handleSetToken]
  );

  return <RecaptchaContext.Provider value={value}>{children}</RecaptchaContext.Provider>;
}
