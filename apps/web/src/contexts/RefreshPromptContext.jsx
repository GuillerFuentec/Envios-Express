"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const RefreshPromptContext = createContext({
  allowUnload: () => {},
});

export const useRefreshPrompt = () => useContext(RefreshPromptContext);

export function RefreshPromptProvider({ children }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const allowRef = useRef(false);

  const allowUnload = useCallback(() => {
    allowRef.current = true;
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (allowRef.current) {
        return;
      }
      event.preventDefault();
      event.returnValue =
        "Esta seguro que desea refrescar la pagina. Si lo hace todo el progreso se perdera";
      setShowPrompt(true);
      return event.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const confirmExit = () => {
    allowRef.current = true;
    setShowPrompt(false);
    window.location.reload();
  };

  const cancelExit = () => {
    setShowPrompt(false);
  };

  return (
    <RefreshPromptContext.Provider value={{ allowUnload }}>
      {children}
      {showPrompt && (
        <div className="exit-overlay">
          <div className="exit-modal">
            <p className="exit-text">
              Esta seguro que desea refrescar la pagina. Si lo hace todo el progreso se perdera.
            </p>
            <div className="exit-actions">
              <button type="button" className="btn-danger" onClick={confirmExit}>
                Si
              </button>
              <button type="button" className="btn-safe" onClick={cancelExit}>
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </RefreshPromptContext.Provider>
  );
}
