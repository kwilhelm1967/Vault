// ============================================
// ESTATE PLANNING TYPES
// ============================================

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  ssn?: string;
  relationship?: string;
  contactInfo: ContactInfo;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  address?: Address;
  emergencyContact?: boolean;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  value?: number;
  description?: string;
  location?: string;
  accountNumber?: string;
  beneficiary?: string;
  documents?: Document[];
  createdAt: Date;
  updatedAt: Date;
}

export type AssetType =
  | 'bank_account'
  | 'investment'
  | 'real_estate'
  | 'vehicle'
  | 'personal_property'
  | 'insurance'
  | 'business'
  | 'other';

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  filePath?: string;
  url?: string;
  description?: string;
  uploadedAt: Date;
}

export type DocumentType =
  | 'will'
  | 'trust'
  | 'insurance_policy'
  | 'deed'
  | 'tax_return'
  | 'bank_statement'
  | 'other';

export interface Insurance {
  id: string;
  provider: string;
  policyNumber: string;
  type: InsuranceType;
  coverage: number;
  beneficiaries: string[];
  contactInfo: ContactInfo;
  documents?: Document[];
  createdAt: Date;
  updatedAt: Date;
}

export type InsuranceType =
  | 'life'
  | 'health'
  | 'auto'
  | 'home'
  | 'disability'
  | 'long_term_care'
  | 'other';

export interface Pet {
  id: string;
  name: string;
  type: string;
  breed?: string;
  age?: number;
  veterinarian?: ContactInfo;
  caretaker?: string;
  specialNeeds?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  licensePlate?: string;
  location?: string;
  beneficiary?: string;
  documents?: Document[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LegacyMessage {
  id: string;
  recipient: string;
  message: string;
  deliveryTrigger: DeliveryTrigger;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type DeliveryTrigger =
  | 'immediately'
  | 'after_death'
  | 'anniversary'
  | 'birthday'
  | 'custom_date';

export interface ExecutorInfo {
  primaryExecutor: Person;
  alternateExecutor?: Person;
  attorney?: Person;
  accountant?: Person;
  notes?: string;
}

// ============================================
// LEGACY PASSWORD VAULT TYPES (for compatibility)
// ============================================

export type EntryType = "password" | "secure_note";

export interface PasswordHistoryItem {
  password: string;
  changedAt: Date;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
  isSecret?: boolean; // If true, value is hidden by default (like a password)
}

export interface PasswordEntry {
  id: string;
  entryType?: EntryType; // defaults to "password" for backwards compatibility
  accountName: string;
  username: string;
  password: string;
  website?: string;
  notes?: string;
  balance?: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  isFavorite?: boolean;
  passwordChangedAt?: Date;
  passwordHistory?: PasswordHistoryItem[]; // Previous passwords
  totpSecret?: string; // 2FA TOTP secret key (Base32 encoded)
  customFields?: CustomField[]; // User-defined fields
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

/**
 * Raw entry as loaded from JSON storage (dates are strings before conversion)
 * Use with parseRawEntry() to convert to PasswordEntry
 */
export type RawPasswordEntry = Record<string, unknown> & {
  id: string;
  accountName: string;
  username: string;
  password: string;
  category: string;
  createdAt: string;
  updatedAt: string;
};

// ============================================
// UTILITY TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface FormState<T> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// ============================================
// COMPONENT PROP TYPES
// ============================================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export interface FormFieldProps extends BaseComponentProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

export interface TableColumn<T> {
  key: keyof T;
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}