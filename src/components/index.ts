/**
 * Components Index - Local Password Vault
 *
 * Centralized exports for all components.
 * Organized by feature area for cleaner imports.
 *
 * @example
 * ```tsx
 * import { LoginScreen, Dashboard, MainVault } from './components';
 * import { LicenseScreen, LicenseTransferDialog } from './components';
 * ```
 */

// ==================== Core Application Components ====================
export { LoginScreen } from './LoginScreen';
export { MainVault } from './MainVault';
export { Dashboard } from './Dashboard';
export { Settings } from './Settings';
export { EntryForm } from './EntryForm';
export { FAQ } from './FAQ';

// ==================== Authentication & Recovery ====================
export * from './auth';

// ==================== License & Activation ====================
export * from './license';
export { LicenseTransferDialog } from './LicenseTransferDialog';
export { LicenseStatusDashboard } from './LicenseStatusDashboard';
export { DeviceManagementScreen } from './DeviceManagementScreen';

// ==================== Trial Management ====================
export * from './trial';

// ==================== Vault Components ====================
export * from './vault';

// ==================== UI Components & Feedback ====================
export { ErrorBoundary } from './ErrorBoundary';
export { LazyErrorBoundary } from './LazyErrorBoundary';
export { Skeleton, SkeletonCard, SkeletonList } from './Skeleton';
export { LoadingSpinner, LoadingOverlay } from './LoadingSpinner';
export { OfflineIndicator } from './OfflineIndicator';
export { Notification } from './Notification';
export { UndoToast } from './UndoToast';
export { CategoryIcon } from './CategoryIcon';
export { PasswordGenerator } from './PasswordGenerator';
export { LanguageSelector } from './LanguageSelector';
export { PerformanceProfiler } from './PerformanceProfiler';

// ==================== Modals & Overlays ====================
export { KeyboardShortcutsModal, useKeyboardShortcuts } from './KeyboardShortcutsModal';
export { WhatsNewModal, useWhatsNew } from './WhatsNewModal';
export { OnboardingTutorial, useOnboarding } from './OnboardingTutorial';
export { SecurityBriefing, useSecurityBriefing } from './SecurityBriefing';
export { MobileAccess } from './MobileAccess';
export { MobileViewer } from './MobileViewer';
export * from './modals';

// ==================== Floating Panel Components ====================
export { FloatingButton } from './FloatingButton';
export { FloatingPanel } from './FloatingPanel';
export { ElectronFloatingPanel } from './ElectronFloatingPanel';

// ==================== Landing & Download Pages ====================
export { DownloadPage } from './DownloadPage';
export { DownloadInstructions } from './DownloadInstructions';
export { PurchaseSuccessPage } from './PurchaseSuccessPage';

// ==================== Accessibility Components ====================
export * from './accessibility';

// ==================== Settings Components ====================
export * from './settings';
