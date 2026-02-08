import React, { useState, useCallback } from "react";
import { useAdmin } from "../contexts/AdminContext";

export function AdminGate() {
  const { setToken, supabaseUrl, supabaseAnonKey, theme, productLabel } = useAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async () => {
    const e = email.trim();
    const p = password;
    if (!e || !p) {
      setError("Enter email and password");
      return;
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      setError("Admin login not configured (missing Supabase URL/anon key)");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
        },
        body: JSON.stringify({ email: e, password: p }),
      });
      const data = await res.json();
      if (data.access_token) {
        setToken(data.access_token);
        setEmail("");
        setPassword("");
      } else {
        setError(data.msg || data.error_description || "Invalid email or password");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection error");
    } finally {
      setLoading(false);
    }
  }, [email, password, supabaseUrl, supabaseAnonKey, setToken]);

  const _bgPage = (theme as { backgroundPage?: string }).backgroundPage ?? "#1E293B";
  return (
    <div style={{ maxWidth: 380, margin: "100px auto", padding: 32, background: theme.backgroundCard, borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", border: "1px solid rgba(71, 85, 105, 0.5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <img src="/lpv-logo.svg" alt="Local Password Vault" width={48} height={48} style={{ display: "block" }} />
      </div>
      <h2 style={{ color: theme.textPrimary, marginBottom: 6, fontSize: 20, fontWeight: 600 }}>
        <span style={{ color: theme.accentGold }}>Admin</span>
        <span style={{ color: theme.textMuted, fontWeight: 400, marginLeft: 8 }}>— {productLabel}</span>
      </h2>
      <p style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 20 }}>Sign in with your admin account. Locks after 10 min idle or on restart.</p>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        disabled={loading}
        autoComplete="email"
        style={{
          width: "100%",
          padding: "12px 14px",
          background: theme.inputBackground,
          border: `1px solid ${theme.inputBorder}`,
          borderRadius: theme.radiusInput,
          color: theme.textPrimary,
          fontSize: 14,
          marginBottom: 10,
          boxSizing: "border-box",
        }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        disabled={loading}
        autoComplete="current-password"
        style={{
          width: "100%",
          padding: "12px 14px",
          background: theme.inputBackground,
          border: `1px solid ${theme.inputBorder}`,
          borderRadius: theme.radiusInput,
          color: theme.textPrimary,
          fontSize: 14,
          marginBottom: 12,
          boxSizing: "border-box",
        }}
      />
      {error && <p style={{ color: theme.statusError, fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={loading}
        style={{
          width: "100%",
          padding: "14px 16px",
          background: theme.buttonPrimaryBg,
          color: theme.buttonPrimaryText,
          border: "none",
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 15,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </div>
  );
}
