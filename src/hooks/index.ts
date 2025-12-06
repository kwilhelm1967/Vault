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
