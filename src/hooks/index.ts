/**
 * Hooks Index
 *
 * Custom React hooks for the After I'm Gone application.
 *
 * Usage:
 *   import { useAuth, useAutoLock } from '@/hooks';
 */

// ==================== Authentication & Security ====================
export { useAuth } from './useAuth';
export { useAutoLock } from './useAutoLock';
export { useSecureClipboard } from './useSecureClipboard';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';

// ==================== UI & Navigation ====================
export { useToast } from './useToast';
export { useOnboarding } from './useOnboarding';
export { usePersonalInfo } from './usePersonalInfo';
export { useRecordSelection } from './useRecordSelection';
export { useVersionHistory } from './useVersionHistory';

// ==================== Data Management ====================
export { useCategoryPage } from './useCategoryPage';
export { useBackupReminders } from './useBackupReminders';
export { useExecutorMode } from './useExecutorMode';

// ==================== Electron Integration ====================
export { useElectron } from './useElectron';

// ==================== Re-export commonly used hooks ====================
export { useAuth as useAuthentication } from './useAuth';
export { useToast as useNotifications } from './useToast';