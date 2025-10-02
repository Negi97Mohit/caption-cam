import React, { createContext, useContext, useState, useCallback } from "react";

export interface LogEntry {
  timestamp: string;
  type: 'INFO' | 'ERROR' | 'AI_REQUEST' | 'AI_RESPONSE' | 'TRANSCRIPT';
  message: string;
  data?: any;
}

type LogContextType = {
  logEntries: LogEntry[];
  log: (type: LogEntry['type'], message: string, data?: any) => void;
};

const LogContext = createContext<LogContextType | undefined>(undefined);

export const LogProvider = ({ children }: { children: React.ReactNode }) => {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  const log = useCallback((type: LogEntry['type'], message: string, data?: any) => {
    const newEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data,
    };
    console.log(`[${type}] ${message}`, data || '');
    setLogEntries(prev => [...prev, newEntry]);
  }, []);

  return <LogContext.Provider value={{ logEntries, log }}>{children}</LogContext.Provider>;
};

export const useLog = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error("useLog must be used within a LogProvider");
  }
  return context;
};