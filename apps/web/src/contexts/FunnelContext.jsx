"use strict";

import { createContext, useContext } from "react";
import { useFunnelController } from "../hooks/useFunnelController";

const FunnelContext = createContext(null);

export const FunnelProvider = ({ children }) => {
  const value = useFunnelController();
  return <FunnelContext.Provider value={value}>{children}</FunnelContext.Provider>;
};

export const useFunnel = () => {
  const context = useContext(FunnelContext);
  if (!context) {
    throw new Error("useFunnel debe usarse dentro de FunnelProvider.");
  }
  return context;
};
