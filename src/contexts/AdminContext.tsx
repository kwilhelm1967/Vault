import React, { createContext, useCallback, useContext, useRef, useState, useEffect } from "react";
import type { AdminThemeColors } from "../styles/adminTheme";

const IDLE_MIN = 5;
const IDLE_MAX = 120;
const IDLE_DEFAULT = 10;
const IDLE_MINUTES = (() => {
  const v = import.meta?.env?.VITE_ADMIN_IDLE_MINUTES;
  const n = typeof v === "string" ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? Math.min(IDLE_MAX, Math.max(IDLE_MIN, n)) : IDLE_DEFAULT;
})();
const IDLE_MS = IDLE_MINUTES * 60 * 1000;

export type AdminContextValue = {
  token: string | null;
  setToken: (t: string | null) => void;
  apiBase: string;
  resetIdleTimer: () => void;
  lock: () => void;
  theme: AdminThemeColors;
  productLabel: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({
  children,
  apiBase,
  theme,
  productLabel,
  supabaseUrl,
  supabaseAnonKey,
}: {
  children: React.ReactNode;
  apiBase: string;
  theme: AdminThemeColors;
  productLabel: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setToken(null), IDLE_MS);
  }, []);

  const lock = useCallback(() => setToken(null), []);

  useEffect(() => {
    if (!token) return;
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [token, resetIdleTimer]);

  const value: AdminContextValue = {
    token,
    setToken,
    apiBase,
    resetIdleTimer,
    lock,
    theme,
    productLabel,
    supabaseUrl,
    supabaseAnonKey,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
