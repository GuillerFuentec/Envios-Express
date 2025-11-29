"use client";

import { useRouter } from "next/router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const RefreshPromptContext = createContext({
  isDirty: false,
  markDirty: () => {},
  clearDirty: () => {},
  requestNavigation: () => {},
});

export const useRefreshPrompt = () => useContext(RefreshPromptContext);

export function RefreshPromptProvider({ children }) {
  const router = useRouter();
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const dirtyRef = useRef(false);
  const allowNextNavigationRef = useRef(false);

  const setDirty = useCallback((dirty) => {
    dirtyRef.current = dirty;
    setIsDirty(dirty);
  }, []);

  const markDirty = useCallback(() => setDirty(true), [setDirty]);
  const clearDirty = useCallback(() => setDirty(false), [setDirty]);

  const requestNavigation = useCallback(
    (nextPath) => {
      if (!dirtyRef.current) {
        router.push(nextPath);
        return;
      }
      setPendingRoute(nextPath);
      setShowPrompt(true);
    },
    [router]
  );

  useEffect(() => {
    const handleRouteChangeStart = (url) => {
      if (allowNextNavigationRef.current) {
        allowNextNavigationRef.current = false;
        return;
      }
      if (!dirtyRef.current) {
        return;
      }
      if (url === router.asPath) {
        return;
      }
      setPendingRoute(url);
      setShowPrompt(true);
      router.events.emit("routeChangeError");
      throw "Navigation blocked to show unsaved changes prompt.";
    };

    router.events.on("routeChangeStart", handleRouteChangeStart);
    return () => router.events.off("routeChangeStart", handleRouteChangeStart);
  }, [router]);

  const confirmNavigation = useCallback(() => {
    if (!pendingRoute) {
      setShowPrompt(false);
      return;
    }
    allowNextNavigationRef.current = true;
    clearDirty();
    setShowPrompt(false);
    setPendingRoute(null);
    router.push(pendingRoute);
  }, [clearDirty, pendingRoute, router]);

  const cancelNavigation = useCallback(() => {
    setPendingRoute(null);
    setShowPrompt(false);
  }, []);

  const contextValue = useMemo(
    () => ({
      isDirty,
      markDirty,
      clearDirty,
      requestNavigation,
    }),
    [clearDirty, isDirty, markDirty, requestNavigation]
  );

  return (
    <RefreshPromptContext.Provider value={contextValue}>
      {children}
      {showPrompt && (
        <div className="exit-overlay" role="dialog" aria-modal="true">
          <div className="exit-modal">
            <h3 className="exit-title">Perderás tu progreso</h3>
            <p className="exit-text">
              Tienes cambios sin guardar. Si abandonas esta página los datos se perderán.
            </p>
            <div className="exit-actions">
              <button type="button " className="btn-safe bg-[#0c5e58]" onClick={cancelNavigation}>
                Seguir aquí
              </button>
              <button type="button" className="btn-danger" onClick={confirmNavigation}>
                Salir de todos modos
              </button>
            </div>
          </div>
        </div>
      )}
    </RefreshPromptContext.Provider>
  );
}
