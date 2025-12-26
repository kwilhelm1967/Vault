/**
 * Corruption Handler
 * 
 * Handles corrupted data files and provides recovery mechanisms.
 * Detects corruption, attempts recovery, and provides user-friendly error messages.
 */

import { devError, devWarn } from "./devLog";
import { safeParseJSON } from "./safeUtils";

export interface CorruptionCheckResult {
  isCorrupted: boolean;
  severity: "none" | "minor" | "major" | "critical";
  errors: string[];
  recoverable: boolean;
  recoveredData?: unknown;
}

export interface RecoveryResult {
  success: boolean;
  recovered: boolean;
  message: string;
  data?: unknown;
}

/**
 * Check if license file is corrupted
 */
export function checkLicenseFileCorruption(licenseData: string | null): CorruptionCheckResult {
  const errors: string[] = [];

  if (!licenseData) {
    return {
      isCorrupted: true,
      severity: "critical",
      errors: ["License file is missing"],
      recoverable: false,
    };
  }

  // Try to parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(licenseData);
  } catch (error) {
    return {
      isCorrupted: true,
      severity: "critical",
      errors: ["License file is not valid JSON"],
      recoverable: false,
    };
  }

  // Check required fields
  if (typeof parsed !== "object" || parsed === null) {
    return {
      isCorrupted: true,
      severity: "critical",
      errors: ["License file has invalid structure"],
      recoverable: false,
    };
  }

  const license = parsed as Record<string, unknown>;
  const requiredFields = ["license_key", "device_id", "plan_type", "signature"];

  for (const field of requiredFields) {
    if (!(field in license)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check field types
  if (typeof license.license_key !== "string") {
    errors.push("license_key must be a string");
  }
  if (typeof license.device_id !== "string") {
    errors.push("device_id must be a string");
  }
  if (typeof license.signature !== "string") {
    errors.push("signature must be a string");
  }

  const severity = errors.length === 0 ? "none" : errors.length <= 2 ? "minor" : errors.length <= 4 ? "major" : "critical";
  const recoverable = severity !== "critical" && errors.length < requiredFields.length;

  return {
    isCorrupted: errors.length > 0,
    severity,
    errors,
    recoverable,
  };
}

/**
 * Attempt to recover corrupted license file
 */
export function recoverLicenseFile(licenseData: string | null): RecoveryResult {
  if (!licenseData) {
    return {
      success: false,
      recovered: false,
      message: "License file is missing. Please reactivate your license.",
    };
  }

  // Try to parse with fallback
  const parsed = safeParseJSON<Record<string, unknown>>(licenseData, {});

  if (Object.keys(parsed).length === 0) {
    return {
      success: false,
      recovered: false,
      message: "License file is corrupted and cannot be recovered. Please reactivate your license.",
    };
  }

  // Attempt to reconstruct missing fields
  const recovered: Record<string, unknown> = { ...parsed };

  // Set defaults for missing critical fields
  if (!recovered.license_key && typeof recovered.license_key !== "string") {
    return {
      success: false,
      recovered: false,
      message: "License key is missing. Please reactivate your license.",
    };
  }

  // Check if we can recover
  const check = checkLicenseFileCorruption(licenseData);
  if (check.severity === "critical" || !check.recoverable) {
    return {
      success: false,
      recovered: false,
      message: "License file is too corrupted to recover. Please reactivate your license.",
    };
  }

  return {
    success: true,
    recovered: true,
    message: "License file recovered with minor issues. Please verify your license is working correctly.",
    data: recovered,
  };
}

/**
 * Check if vault data is corrupted
 */
export function checkVaultDataCorruption(vaultData: string | null): CorruptionCheckResult {
  const errors: string[] = [];

  if (!vaultData) {
    return {
      isCorrupted: true,
      severity: "critical",
      errors: ["Vault data is missing"],
      recoverable: false,
    };
  }

  // Try to parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(vaultData);
  } catch (error) {
    return {
      isCorrupted: true,
      severity: "critical",
      errors: ["Vault data is not valid JSON"],
      recoverable: false,
    };
  }

  // Check if it's an array (entries)
  if (!Array.isArray(parsed)) {
    return {
      isCorrupted: true,
      severity: "major",
      errors: ["Vault data is not in expected format"],
      recoverable: true,
    };
  }

  // Check entries structure
  const entries = parsed as unknown[];
  let invalidEntries = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (typeof entry !== "object" || entry === null) {
      invalidEntries++;
      continue;
    }

    const entryObj = entry as Record<string, unknown>;
    if (typeof entryObj.id !== "string" || typeof entryObj.accountName !== "string") {
      invalidEntries++;
    }
  }

  if (invalidEntries > 0) {
    errors.push(`${invalidEntries} invalid entries found`);
  }

  const severity = 
    errors.length === 0 ? "none" :
    invalidEntries === entries.length ? "critical" :
    invalidEntries > entries.length / 2 ? "major" :
    "minor";

  const recoverable = severity !== "critical";

  return {
    isCorrupted: errors.length > 0,
    severity,
    errors,
    recoverable,
    recoveredData: recoverable ? entries.filter((e) => {
      if (typeof e !== "object" || e === null) return false;
      const entry = e as Record<string, unknown>;
      return typeof entry.id === "string" && typeof entry.accountName === "string";
    }) : undefined,
  };
}

/**
 * Attempt to recover corrupted vault data
 * 
 * Analyzes corrupted vault data and attempts to extract valid password entries.
 * Uses checkVaultDataCorruption to assess corruption level and determine if
 * recovery is possible. Filters out invalid entries and returns recoverable data.
 * 
 * @param vaultData - JSON string containing vault password entries (may be corrupted)
 * @returns RecoveryResult with success status, recovery information, and recovered data
 * 
 * @example
 * ```typescript
 * const result = recoverVaultData(corruptedJson);
 * if (result.success && result.recovered) {
 *   // Save recovered data
 *   storageService.importEntries(JSON.parse(result.data!));
 * }
 * ```
 * 
 * @see checkVaultDataCorruption for corruption detection logic
 */
export function recoverVaultData(vaultData: string | null): RecoveryResult {
  if (!vaultData) {
    return {
      success: false,
      recovered: false,
      message: "Vault data is missing. Please restore from backup.",
    };
  }

  // Check for corruption
  const check = checkVaultDataCorruption(vaultData);

  if (!check.isCorrupted) {
    return {
      success: true,
      recovered: false,
      message: "Vault data is valid.",
    };
  }

  if (check.severity === "critical" || !check.recoverable) {
    return {
      success: false,
      recovered: false,
      message: "Vault data is too corrupted to recover. Please restore from backup.",
    };
  }

  // Attempt recovery
  if (check.recoveredData) {
    try {
      const recoveredJson = JSON.stringify(check.recoveredData);
      return {
        success: true,
        recovered: true,
        message: `Recovered ${check.recoveredData.length} valid entries. ${check.errors.join(", ")}`,
        data: recoveredJson,
      };
    } catch (error) {
      devError("Failed to serialize recovered data:", error);
      return {
        success: false,
        recovered: false,
        message: "Failed to recover vault data. Please restore from backup.",
      };
    }
  }

  return {
    success: false,
    recovered: false,
    message: "Unable to recover vault data. Please restore from backup.",
  };
}

/**
 * Validate and repair data structure with type guard
 * 
 * Validates data against a type guard function and attempts to repair or filter
 * invalid items. Useful for recovering from partial corruption in arrays or
 * collections of typed objects.
 * 
 * @template T - The expected type of valid data items
 * @param data - Data to validate (may be array or single item)
 * @param guard - Type guard function to validate each item
 * @param repair - Optional repair function to fix invalid items
 * @returns Object with validation result, valid items, and repair statistics
 * 
 * @example
 * ```typescript
 * const result = validateAndRepair(
 *   corruptedEntries,
 *   isPasswordEntry,
 *   (entry) => ({ ...entry, id: entry.id || generateId() })
 * );
 * ```
 */
export function validateAndRepair<T>(
  data: unknown,
  validator: (item: unknown) => item is T,
  fallback: T[]
): { valid: T[]; invalid: number; repaired: boolean } {
  if (!Array.isArray(data)) {
    return {
      valid: fallback,
      invalid: 0,
      repaired: true,
    };
  }

  const valid: T[] = [];
  let invalid = 0;

  for (const item of data) {
    if (validator(item)) {
      valid.push(item);
    } else {
      invalid++;
      devWarn("Invalid item filtered out:", item);
    }
  }

  return {
    valid,
    invalid,
    repaired: invalid > 0,
  };
}

/**
 * Create backup before operations that might corrupt data
 */
export function createBackup(key: string, data: string): boolean {
  try {
    const backupKey = `${key}_backup_${Date.now()}`;
    localStorage.setItem(backupKey, data);
    
    // Keep only last 3 backups
    const backupKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${key}_backup_`)) {
        backupKeys.push(k);
      }
    }
    
    if (backupKeys.length > 3) {
      backupKeys.sort().slice(0, -3).forEach((k) => {
        localStorage.removeItem(k);
      });
    }
    
    return true;
  } catch (error) {
    devError("Failed to create backup:", error);
    return false;
  }
}

/**
 * Restore from most recent backup
 */
export function restoreFromBackup(key: string): string | null {
  try {
    const backupKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${key}_backup_`)) {
        backupKeys.push(k);
      }
    }
    
    if (backupKeys.length === 0) {
      return null;
    }
    
    // Get most recent backup
    backupKeys.sort();
    const mostRecent = backupKeys[backupKeys.length - 1];
    return localStorage.getItem(mostRecent);
  } catch (error) {
    devError("Failed to restore from backup:", error);
    return null;
  }
}

