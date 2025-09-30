// src/context/DebugContext.tsx
import React, { createContext, useContext, useState } from "react";
import { AIDecision } from "@/types/caption";

type DebugInfo = {
  rawTranscript: string;
  aiResponse: AIDecision | null;
  error: string | null;
};

type DebugContextType = {
  debugInfo: DebugInfo;
  setDebugInfo: React.Dispatch<React.SetStateAction<DebugInfo>>;
};

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const DebugProvider = ({ children }: { children: React.ReactNode }) => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    rawTranscript: "",
    aiResponse: null,
    error: null,
  });

  return <DebugContext.Provider value={{ debugInfo, setDebugInfo }}>{children}</DebugContext.Provider>;
};

export const useDebug = () => {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error("useDebug must be used within a DebugProvider");
  }
  return context;
};