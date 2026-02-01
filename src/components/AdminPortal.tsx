import React from "react";
import { AdminProvider, useAdmin } from "../contexts/AdminContext";
import { AdminGate } from "./AdminGate";
import { AdminDashboard } from "./AdminDashboard";
import { ADMIN_THEME } from "../styles/adminTheme";

const LPV_CONFIG = {
  apiBase: ((import.meta.env.VITE_SUPABASE_URL_LPV || import.meta.env.VITE_SUPABASE_URL || "") as string).replace(/\/$/, "") + "/functions/v1",
  supabaseUrl: ((import.meta.env.VITE_SUPABASE_URL_LPV || import.meta.env.VITE_SUPABASE_URL || "") as string).replace(/\/$/, ""),
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY_LPV || import.meta.env.VITE_SUPABASE_ANON_KEY || "") as string,
  theme: ADMIN_THEME,
  productLabel: "Local Password Vault",
};

function AdminPortalContent({ onClose }: { onClose: () => void }) {
  const { token } = useAdmin();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "linear-gradient(180deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {token ? <AdminDashboard onClose={onClose} /> : <AdminGate />}
    </div>
  );
}

export function AdminPortal({ onClose }: { onClose: () => void }) {
  return (
    <AdminProvider
      apiBase={LPV_CONFIG.apiBase}
      theme={LPV_CONFIG.theme}
      productLabel={LPV_CONFIG.productLabel}
      supabaseUrl={LPV_CONFIG.supabaseUrl}
      supabaseAnonKey={LPV_CONFIG.supabaseAnonKey}
    >
      <AdminPortalContent onClose={onClose} />
    </AdminProvider>
  );
}
