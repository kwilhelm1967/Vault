/**
 * Admin portal theme for Local Password Vault.
 * LPV color scheme: navy, slate, cyan/blue accents (from theme.ts and index.css).
 */

export const ADMIN_THEME = {
  // LPV backgrounds — deep navy, slate
  background: '#0F172A',
  backgroundGradient: 'linear-gradient(to bottom, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
  backgroundSidebar: '#1E293B',
  backgroundCard: 'rgba(30, 41, 59, 0.8)',
  backgroundCardHover: '#334155',
  backgroundPage: '#1E293B',

  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: 'rgba(255, 255, 255, 0.35)',

  iconPrimary: '#94A3B8',
  iconSecondary: '#64748B',

  // LPV accent — cyan (matches loading spinner, favicon, vault-lock-icon)
  accentGold: '#06b6d4',
  accentGoldHover: '#22d3ee',

  statusSuccess: '#10B981',
  statusWarning: '#F59E0B',
  statusError: '#EF4444',

  inputBackground: 'rgba(30, 41, 59, 0.8)',
  inputBorder: 'rgba(71, 85, 105, 0.5)',
  inputText: '#FFFFFF',
  inputPlaceholder: 'rgba(148, 163, 184, 0.7)',

  buttonPrimaryBg: '#06b6d4',
  buttonPrimaryBgHover: '#22d3ee',
  buttonPrimaryText: '#0F172A',

  borderSubtle: 'rgba(71, 85, 105, 0.5)',
  borderCard: 'rgba(71, 85, 105, 0.4)',

  radiusCard: '12px',
  radiusInput: '10px',
  radiusButton: '10px',

  shadowCard: '0px 2px 6px rgba(0, 0, 0, 0.25)',
} as const;

export type AdminThemeColors = typeof ADMIN_THEME;
