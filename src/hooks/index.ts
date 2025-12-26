/**
 * Hooks Index - Local Password Vault
 *
 * Custom React hooks for the Local Password Vault application.
 *
 * Usage:
 *   import { useElectron, useEntryManagement } from './hooks';
 */

// ==================== Vault State Management ====================
export { useEntryManagement } from './useEntryManagement';
export { useVaultState, DEFAULT_CATEGORIES } from './useVaultState';

// ==================== Electron Integration ====================
export { useElectron } from './useElectron';

// ==================== Performance Monitoring ====================
export {
  useRenderTracking,
  useMeasuredCallback,
  useLogMetrics,
  usePerformanceSummary,
  onRenderCallback,
} from './usePerformance';

// ==================== App State Management ====================
export { useAppStatus } from './useAppStatus';
export { useVaultData } from './useVaultData';
export { useDarkTheme } from './useDarkTheme';
export { useFloatingMode } from './useFloatingMode';
export { useVaultStatusSync } from './useVaultStatusSync';