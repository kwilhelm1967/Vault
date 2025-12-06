/**
 * Components Index - Local Password Vault
 *
 * Centralized exports for all components.
 * Organized by feature area for cleaner imports.
 *
 * Usage:
 *   import { LoginScreen, Dashboard, MainVault } from './components';
 */

// ==================== Core App Components ====================
export { LoginScreen } from './LoginScreen';
export { MainVault } from './MainVault';
export { Dashboard } from './Dashboard';
export { Settings } from './Settings';
export { EntryForm } from './EntryForm';
export { FAQ } from './FAQ';

// ==================== Authentication ====================
export { ForgotPassword } from './ForgotPassword';
export { RecoveryPhraseSetup } from './RecoveryPhraseSetup';
export { RecoveryOptionsScreen } from './RecoveryOptionsScreen';

// ==================== License & Activation ====================
export { LicenseScreen } from './LicenseScreen';
export { KeyActivationScreen } from './KeyActivationScreen';
export { LicenseKeyDisplay } from './LicenseKeyDisplay';
export { LicenseTransferDialog } from './LicenseTransferDialog';
export { EulaAgreement } from './EulaAgreement';

// ==================== Trial ====================
export { TrialStatusBanner } from './TrialStatusBanner';
export { TrialExpirationBanner } from './TrialExpirationBanner';
export { TrialWarningPopup } from './TrialWarningPopup';
export { ExpiredTrialScreen } from './ExpiredTrialScreen';
export { TrialTestingTools } from './TrialTestingTools';

// ==================== Vault Components ====================
export * from './vault';

// ==================== UI Components ====================
export { ErrorBoundary } from './ErrorBoundary';
export { Skeleton, SkeletonCard, SkeletonList } from './Skeleton';
export { OfflineIndicator } from './OfflineIndicator';
export { UndoToast } from './UndoToast';
export { CategoryIcon } from './CategoryIcon';
export { PasswordGenerator } from './PasswordGenerator';
export { LanguageSelector } from './LanguageSelector';

// ==================== Modals ====================
export { KeyboardShortcutsModal, useKeyboardShortcuts } from './KeyboardShortcutsModal';
export { WhatsNewModal, useWhatsNew } from './WhatsNewModal';
export { OnboardingTutorial, useOnboarding } from './OnboardingTutorial';
export { MobileAccess } from './MobileAccess';

// ==================== Floating Panel (Electron) ====================
export { FloatingButton } from './FloatingButton';
export { FloatingPanel } from './FloatingPanel';
export { ElectronFloatingPanel } from './ElectronFloatingPanel';

// ==================== Landing & Download Pages ====================
export { LandingPage } from './LandingPage';
export { DownloadPage } from './DownloadPage';
export { DownloadInstructions } from './DownloadInstructions';
export { PurchaseSuccessPage } from './PurchaseSuccessPage';

// ==================== Accessibility ====================
export * from './accessibility';

// ==================== Settings Modals ====================
export * from './settings';
