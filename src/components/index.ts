/**
 * Components Index
 *
 * Centralized exports for all components in the After I'm Gone application.
 * Organized by feature area for cleaner imports.
 *
 * Usage:
 *   import { LoginScreen, Dashboard } from '@/components';
 *   import { ErrorBoundary } from '@/components/ui';
 */

// ==================== Core App Components ====================
export { default as App } from '../App';
export { default as LoginScreen } from './LoginScreen';
export { default as MainLayout } from './MainLayout';
export { default as Dashboard } from './Dashboard';
export { default as Settings } from './Settings';
export { default as Sidebar } from './Sidebar';

// ==================== Onboarding & Tutorial ====================
export { default as OnboardingWizard } from './OnboardingWizard';
export { default as OnboardingStep } from './OnboardingStep';
export { default as OnboardingHighlightCards } from './OnboardingHighlightCards';

// ==================== Form Components ====================
export { default as RecordForm } from './RecordForm';
export { default as RecordCard } from './RecordCard';
export { default as FormComponents } from './FormComponents';
export { default as FormActionButtons } from './FormActionButtons';
export { default as UnifiedError } from './UnifiedError';
export { default as SaveButton } from './SaveButton';
export { default as ConfirmDialog } from './ConfirmDialog';

// ==================== Section Components ====================
export { default as PersonalInfo } from './PersonalInfo';
export { default as PersonalProperty } from './PersonalProperty';
export { default as Financial } from './Financial';
export { default as Business } from './Business';
export { default as Insurance } from './Insurance';
export { default as Household } from './Household';
export { default as Properties } from './Properties';
export { default as Vehicles } from './Vehicles';
export { default as Pets } from './Pets';
export { default as DigitalLife } from './DigitalLife';
export { default as TrustedContacts } from './TrustedContacts';
export { default as FamilyMembers } from './FamilyMembers';
export { default as LegalDocuments } from './LegalDocuments';
export { default as EndOfLife } from './EndOfLife';
export { default as LegacyNotes } from './LegacyNotes';

// ==================== Form Components (Specific) ====================
export { default as AfterImGoneForm } from './AfterImGoneForm';
export { default as BusinessForm } from './BusinessForm';
export { default as DigitalLifeForm } from './DigitalLifeForm';
export { default as HouseholdForm } from './HouseholdForm';
export { default as InsuranceForm } from './InsuranceForm';
export { default as PersonalPropertyForm } from './PersonalPropertyForm';
export { default as PetsForm } from './PetsForm';
export { default as PropertiesForm } from './PropertiesForm';
export { default as VehiclesForm } from './VehiclesForm';

// ==================== Special Forms ====================
export { default as AssetForm } from './AssetForm';
export { default as ContactForm } from './ContactForm';
export { default as DocumentForm } from './DocumentForm';
export { default as InstructionForm } from './InstructionForm';
export { default as NoteForm } from './NoteForm';

// ==================== UI & Feedback ====================
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as ErrorMessage } from './ErrorMessage';
export { default as InlineError } from './InlineError';
export { default as Toast } from './Toast';
export { default as SkeletonLoader } from './SkeletonLoader';
export { default as Tooltip } from './Tooltip';

// ==================== Utility Components ====================
export { default as AdvancedSearch } from './AdvancedSearch';
export { default as AuditTrail } from './AuditTrail';
export { default as BackupSettings } from './BackupSettings';
export { default as BackupStatus } from './BackupStatus';
export { default as BulkOperationsPanel } from './BulkOperationsPanel';
export { default as CategoryHeader } from './CategoryHeader';
export { default as CharacterCount } from './CharacterCount';
export { default as EmergencyAccessGuide } from './EmergencyAccessGuide';
export { default as ExecutorInfoBanner } from './ExecutorInfoBanner';
export { default as ExecutorMode } from './ExecutorMode';
export { default as Export } from './Export';
export { default as MobileAccess } from './MobileAccess';
export { default as PasswordHintDisplay } from './PasswordHintDisplay';
export { default as PrintExportModal } from './PrintExportModal';
export { default as RecoveryKeyManagement } from './RecoveryKeyManagement';
export { default as RecoveryKeySetup } from './RecoveryKeySetup';
export { default as SecurityStatus } from './SecurityStatus';
export { default as TagManager } from './TagManager';
export { default as TagSelector } from './TagSelector';
export { default as TrialStatus } from './TrialStatus';
export { default as VersionHistory } from './VersionHistory';

// ==================== Activation & Purchase ====================
export { default as ActivationScreen } from './ActivationScreen';
export { default as PurchaseScreen } from './PurchaseScreen';
export { default as ForgotPasswordScreen } from './ForgotPasswordScreen';
export { default as LandingPage } from './LandingPage';

// ==================== Accessibility ====================
export * from './accessibility';

// ==================== Re-export commonly used components ====================
// These can be imported directly from @/components for convenience
export { ErrorBoundary as AppErrorBoundary } from './ErrorBoundary';