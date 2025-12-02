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