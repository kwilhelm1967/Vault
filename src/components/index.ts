/**
 * Components Index
 * 
 * Centralized exports for all components.
 * 
 * Usage:
 *   import { LoginScreen, Dashboard, EntryForm } from '@/components';
 *   import { Skeleton, UndoToast } from '@/components/ui';
 *   import { TrialStatusBanner } from '@/components/trial';
 */

// ==================== Core App Components ====================
export { default as App } from '../App';
export { default as MainVault } from './MainVault';
export { default as Dashboard } from './Dashboard';
export { default as Settings } from './Settings';

// ==================== Auth ====================
export * from './auth';

// ==================== Trial ====================
export * from './trial';

// ==================== License ====================
export * from './license';

// ==================== UI ====================
export * from './ui';

// ==================== Modals ====================
export * from './modals';

// ==================== Vault Components ====================
export * from './vault';

// ==================== Accessibility ====================
export * from './accessibility';

// ==================== Pages ====================
export { default as LandingPage } from './LandingPage';
export { default as DownloadPage } from './DownloadPage';
export { default as DownloadInstructions } from './DownloadInstructions';
export { default as PurchaseSuccessPage } from './PurchaseSuccessPage';

// ==================== Floating (Electron) ====================
export { default as FloatingButton } from './FloatingButton';
export { default as FloatingPanel } from './FloatingPanel';
export { default as ElectronFloatingPanel } from './ElectronFloatingPanel';

