/**
 * @fileoverview Storage Service - Encrypted Storage for Password Vault
 * 
 * This module provides secure, encrypted storage for password entries using
 * military-grade AES-256-GCM encryption with PBKDF2 key derivation.
 * 
 * Storage Strategy:
 * - Electron: Secure file storage (unlimited capacity, OS-level permissions)
 * - Web: localStorage with encryption (5-10MB limit, browser storage)
 * 
 * @module storage
 * @version 2.0.0
 * 
 * Security Features:
 * - AES-256-GCM encryption (256-bit keys)
 * - PBKDF2 key derivation with 100,000 iterations
 * - Unique IV for each encryption operation
 * - Secure memory handling for sensitive data
 * - Input sanitization for all stored data
 * - Master password never leaves renderer process (Electron)
 * - OS-level file permissions (Electron)
 * 
 * @example
 * // Initialize and use the storage service
 * import { storageService } from './storage';
 * 
 * // Create a new vault
 * await storageService.createVault('MySecurePassword123!');
 * 
 * // Save entries (automatically uses file storage in Electron)
 * await storageService.saveEntries(entries);
 * 
 * // Load entries (automatically uses file storage in Electron)
 * const entries = await storageService.loadEntries();
 */

import { PasswordEntry, Category, RawPasswordEntry } from "../types";
import { memorySecurity } from "./memorySecurity";
import { sanitizeTextField, sanitizePassword, sanitizeNotes } from "./sanitization";
import { devError, devWarn } from "./devLog";
import { measureOperation } from "./performanceMonitor";

/**
 * Fixed categories available in the vault.
 * Single source of truth for category definitions.
 * @constant {Category[]}
 */
export const FIXED_CATEGORIES: Category[] = [
  { id: "all", name: "All", color: "#3b82f6", icon: "Grid3X3" },
  { id: "banking", name: "Banking", color: "#10b981", icon: "CircleDollarSign" },
  { id: "shopping", name: "Shopping", color: "#f59e0b", icon: "ShoppingCart" },
  { id: "entertainment", name: "Entertainment", color: "#a855f7", icon: "Ticket" },
  { id: "email", name: "Email", color: "#f43f5e", icon: "Mail" },
  { id: "work", name: "Work", color: "#3b82f6", icon: "Briefcase" },
  { id: "business", name: "Business", color: "#8b5cf6", icon: "TrendingUp" },
  { id: "other", name: "Other", color: "#6b7280", icon: "FileText" },
];

/**
 * Military-grade AES-256-GCM encryption implementation.
 * Provides secure encryption/decryption for vault data.
 * 
 * @class MilitaryEncryption
 * @private
 * @singleton
 * 
 * @description
 * Uses the Web Crypto API for all cryptographic operations:
 * - PBKDF2 for key derivation (100,000 iterations)
 * - AES-256-GCM for symmetric encryption
 * - Cryptographically secure random IVs
 */
class MilitaryEncryption {
  private static instance: MilitaryEncryption;
  private encryptionKey: CryptoKey | null = null;

  /**
   * Gets the singleton instance of MilitaryEncryption.
   * @returns {MilitaryEncryption} The singleton instance
   */
  static getInstance(): MilitaryEncryption {
    if (!MilitaryEncryption.instance) {
      MilitaryEncryption.instance = new MilitaryEncryption();
    }
    return MilitaryEncryption.instance;
  }

  /**
   * Derives an AES-256-GCM encryption key from the master password.
   * Uses PBKDF2 with 100,000 iterations for key stretching.
   * 
   * @param {string} masterPassword - The user's master password
   * @param {Uint8Array} salt - Random salt for key derivation
   * @returns {Promise<CryptoKey>} The derived encryption key
   * 
   * @example
   * const salt = crypto.getRandomValues(new Uint8Array(32));
   * const key = await encryption.deriveKeyFromPassword('password', salt);
   */
  async deriveKeyFromPassword(
    masterPassword: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(masterPassword),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt.buffer as ArrayBuffer,
        iterations: 100000, // Military-grade: 100,000 iterations
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 }, // AES-256-GCM
      false,
      ["encrypt", "decrypt"]
    );
  }

  // Initialize encryption with master password
  async initializeEncryption(masterPassword: string): Promise<void> {
    let salt: Uint8Array;

    try {
      // Track password as sensitive data
      memorySecurity.trackSensitiveData(masterPassword);

      // Check if salt exists, if not create one
      const storedSalt = localStorage.getItem("vault_salt_v2");
      if (storedSalt) {
        salt = new Uint8Array(
          atob(storedSalt)
            .split("")
            .map((c) => c.charCodeAt(0))
        );
      } else {
        // Generate new salt for new vault
        salt = memorySecurity.generateSecureRandom(32); // 256-bit salt
        localStorage.setItem("vault_salt_v2", btoa(String.fromCharCode(...salt)));
      }

      this.encryptionKey = await this.deriveKeyFromPassword(masterPassword, salt);

      // Clear password from memory immediately after key derivation
      memorySecurity.clearString(masterPassword);
    } catch (error) {
      // Ensure password is cleared even on error
      memorySecurity.clearString(masterPassword);
      throw error;
    }
  }

  // Generate PBKDF2 password hash for verification
  async generatePasswordHash(masterPassword: string, salt: Uint8Array): Promise<string> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(masterPassword),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt.buffer as ArrayBuffer,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      256 // 256-bit hash
    );

    const hashArray = new Uint8Array(derivedBits);
    return btoa(String.fromCharCode(...hashArray));
  }

  // Verify password against stored hash
  async verifyPasswordHash(masterPassword: string, storedHash: string, salt: Uint8Array): Promise<boolean> {
    const computedHash = await this.generatePasswordHash(masterPassword, salt);
    return computedHash === storedHash;
  }

  // Encrypt data using AES-256-GCM
  async encryptData(plaintext: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error("Encryption not initialized. Please unlock vault first.");
    }

    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

    const encrypted = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      this.encryptionKey,
      encoder.encode(plaintext)
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  // Decrypt data using AES-256-GCM
  async decryptData(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error("Encryption not initialized. Please unlock vault first.");
    }

    try {
      const combined = new Uint8Array(
        atob(encryptedData)
          .split("")
          .map((c) => c.charCodeAt(0))
      );
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        this.encryptionKey,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      throw new Error(
        "Failed to decrypt data. Invalid password or corrupted data."
      );
    }
  }

  // Check if vault is unlocked
  isUnlocked(): boolean {
    return this.encryptionKey !== null;
  }

  // Lock the vault (clear encryption key from memory)
  lockVault(): void {
    // Clear encryption key
    this.encryptionKey = null;

    // Perform memory cleanup
    memorySecurity.onVaultLock();
  }

  // Check if vault exists (has salt)
  vaultExists(): boolean {
    return localStorage.getItem("vault_salt_v2") !== null;
  }
}

export class StorageService {
  private static instance: StorageService;
  private encryption = MilitaryEncryption.getInstance();
  
  // Rate limiting properties
  private loginAttempts = 0;
  private lockoutUntil: number | null = null;
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 30000; // 30 seconds
  private readonly LOCKOUT_STORAGE_KEY = "vault_lockout";

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // Check if account is locked out
  isLockedOut(): { locked: boolean; remainingSeconds: number } {
    // Check persisted lockout (survives page refresh)
    const storedLockout = localStorage.getItem(this.LOCKOUT_STORAGE_KEY);
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout);
      if (Date.now() < lockoutTime) {
        this.lockoutUntil = lockoutTime;
        return { 
          locked: true, 
          remainingSeconds: Math.ceil((lockoutTime - Date.now()) / 1000) 
        };
      } else {
        localStorage.removeItem(this.LOCKOUT_STORAGE_KEY);
        this.lockoutUntil = null;
      }
    }
    
    if (this.lockoutUntil && Date.now() < this.lockoutUntil) {
      return { 
        locked: true, 
        remainingSeconds: Math.ceil((this.lockoutUntil - Date.now()) / 1000) 
      };
    }
    
    this.lockoutUntil = null;
    return { locked: false, remainingSeconds: 0 };
  }

  // Get remaining login attempts
  getRemainingAttempts(): number {
    return Math.max(0, this.MAX_ATTEMPTS - this.loginAttempts);
  }

  // Reset login attempts (call on successful login)
  private resetLoginAttempts(): void {
    this.loginAttempts = 0;
    this.lockoutUntil = null;
    localStorage.removeItem(this.LOCKOUT_STORAGE_KEY);
  }

  // Record failed login attempt
  private recordFailedAttempt(): void {
    this.loginAttempts++;
    if (this.loginAttempts >= this.MAX_ATTEMPTS) {
      this.lockoutUntil = Date.now() + this.LOCKOUT_DURATION;
      localStorage.setItem(this.LOCKOUT_STORAGE_KEY, this.lockoutUntil.toString());
      this.loginAttempts = 0;
    }
  }

  // Initialize vault with master password
  async initializeVault(masterPassword: string): Promise<void> {
    await this.encryption.initializeEncryption(masterPassword);

    // Store password hash for verification
    const salt = new Uint8Array(
      atob(localStorage.getItem("vault_salt_v2") || "")
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    const passwordHash = await this.encryption.generatePasswordHash(masterPassword, salt);
    localStorage.setItem("vault_password_hash", passwordHash);

    // Create test data for verification
    const testEncrypted = await this.encryption.encryptData("vault_test_data");
    localStorage.setItem("vault_test_v2", testEncrypted);
  }

  // Unlock vault with master password (with rate limiting)
  async unlockVault(masterPassword: string): Promise<boolean> {
    try {
      // Check rate limiting lockout
      const lockoutStatus = this.isLockedOut();
      if (lockoutStatus.locked) {
        throw new Error(`Too many failed attempts. Try again in ${lockoutStatus.remainingSeconds} seconds.`);
      }

      // Check if this is a new vault (no password hash stored)
      const storedPasswordHash = localStorage.getItem("vault_password_hash");
      const storedSalt = localStorage.getItem("vault_salt_v2");

      if (!storedPasswordHash || !storedSalt) {
        // No vault exists - this should be handled by initializeVault
        return false;
      }

      // Get the salt for password verification
      const salt = new Uint8Array(
        atob(storedSalt)
          .split("")
          .map((c) => c.charCodeAt(0))
      );

      // Verify the password using PBKDF2 hash comparison
      const isPasswordValid = await this.encryption.verifyPasswordHash(
        masterPassword,
        storedPasswordHash,
        salt
      );

      if (!isPasswordValid) {
        this.recordFailedAttempt(); // Record failed attempt for rate limiting
        return false; // Password doesn't match stored hash
      }

      // Password is valid, now initialize encryption
      await this.encryption.initializeEncryption(masterPassword);

      // Verify by decrypting test data
      const testData = localStorage.getItem("vault_test_v2");
      if (testData) {
        const decrypted = await this.encryption.decryptData(testData);
        if (decrypted !== "vault_test_data") {
          // This shouldn't happen if password hash verification passed
          this.encryption.lockVault();
          this.recordFailedAttempt();
          return false;
        }
      } else {
        // Test data is missing - this indicates vault corruption
        this.encryption.lockVault();
        return false;
      }

      // Success - reset login attempts
      this.resetLoginAttempts();
      return true; // Password verified and vault unlocked successfully
    } catch (error) {
      devError("Failed to unlock vault:", error);
      this.encryption.lockVault(); // Ensure key is cleared on any error
      throw error; // Re-throw to show error message to user
    }
  }

  // Lock vault (clear encryption key from memory)
  lockVault(): void {
    this.encryption.lockVault();
  }

  // Check if vault is unlocked
  isVaultUnlocked(): boolean {
    return this.encryption.isUnlocked();
  }

  // Check if vault exists
  vaultExists(): boolean {
    return this.encryption.vaultExists();
  }

  /**
   * Save password entries to encrypted storage
   * 
   * Validates, sanitizes, and encrypts password entries before saving.
   * Automatically uses Electron file storage when available, falls back to localStorage.
   * 
   * @param entries - Array of password entries to save
   * @throws Error if vault is locked or entries array is invalid
   * 
   * @example
   * ```typescript
   * const entries = [
   *   { id: '1', accountName: 'Gmail', username: 'user@example.com', ... }
   * ];
   * await storageService.saveEntries(entries);
   * ```
   */
  async saveEntries(entries: PasswordEntry[]): Promise<void> {
    if (!this.encryption.isUnlocked()) {
      throw new Error("Vault is locked. Please unlock vault first.");
    }

    // Ensure we have valid entries array
    if (!Array.isArray(entries)) {
      throw new Error("Invalid entries array provided to saveEntries");
    }

    try {
      const inputCount = entries.length;
      
      // Validate and sanitize each entry before saving
      const filteredEntries = entries.filter((entry) => {
        // Basic validation - id and accountName are always required
        if (!entry || typeof entry.id !== "string" || typeof entry.accountName !== "string") {
          devWarn("Entry filtered out - missing id or accountName", entry?.accountName);
          return false;
        }
        
        // For secure notes, username and password can be empty strings
        const isSecureNote = entry.entryType === "secure_note";
        if (isSecureNote) {
          return true; // Secure notes just need id and accountName
        }
        
        // For password entries, require username and password to be strings (can be empty for drafts)
        const valid = typeof entry.username === "string" && typeof entry.password === "string";
        if (!valid) {
          devWarn("Entry filtered out - invalid username/password type", entry?.accountName);
        }
        return valid;
      });
      
      // Check if entries were unexpectedly filtered out
      if (filteredEntries.length < inputCount) {
        devWarn(`${inputCount - filteredEntries.length} entries filtered out during save`);
      }
      
      // Sanitize all entries
      const validEntries = filteredEntries.map((entry) => ({
        ...entry,
        // Sanitize text fields to prevent XSS and ensure data integrity
        accountName: sanitizeTextField(entry.accountName, 200),
        username: sanitizeTextField(entry.username, 200),
        password: sanitizePassword(entry.password),
        website: entry.website ? sanitizeTextField(entry.website, 500) : undefined,
        category: sanitizeTextField(entry.category, 50),
        notes: entry.notes ? sanitizeNotes(entry.notes) : undefined,
        balance: entry.balance ? sanitizeTextField(entry.balance, 100) : undefined,
      }));

      // Encrypt the entries before saving (encryption happens in renderer process)
      const entriesJson = JSON.stringify(validEntries);
      const encryptedData = await measureOperation(
        'encrypt-entries',
        () => this.encryption.encryptData(entriesJson)
      );

      // SECURE: Use Electron file storage when available (encrypted data only, no master password)
      const electronAPI = window.electronAPI;
      if (electronAPI && electronAPI.saveVaultEncrypted) {
        try {
          // Save encrypted data to secure file storage (OS-level permissions)
          const success = await electronAPI.saveVaultEncrypted(encryptedData);
          
          if (success) {
            // Successfully saved to file storage - also create localStorage backup for migration
            try {
              localStorage.setItem("password_entries_v2_backup", encryptedData);
            } catch (backupError) {
              // Backup to localStorage failed - non-critical, file storage succeeded
              devWarn("Failed to create localStorage backup (file storage succeeded):", backupError);
            }
            
            // Remove old unencrypted data for security
            const oldData = localStorage.getItem("password_entries");
            if (oldData) {
              localStorage.removeItem("password_entries");
            }
            
            return; // Success - exit early
          } else {
            devWarn("Electron file storage save failed, falling back to localStorage");
          }
        } catch (electronError) {
          devError("Electron file storage error, falling back to localStorage:", electronError);
          // Fall through to localStorage fallback
        }
      }

      // Fallback: localStorage with encryption (for web version or if Electron fails)
      // Create backup before saving new data
      const currentData = localStorage.getItem("password_entries_v2");
      if (currentData) {
        localStorage.setItem("password_entries_v2_backup", currentData);
      }

      // Use safe storage with quota handling
      const { safeSetItem } = await import("./storageQuotaHandler");
      const saveResult = await safeSetItem("password_entries_v2", encryptedData);
      
      if (!saveResult.success) {
        // Try to free up space and retry
        const { freeUpStorage } = await import("./storageQuotaHandler");
        const freeResult = await freeUpStorage();
        
        if (freeResult.success) {
          // Retry after freeing space
          const retryResult = await safeSetItem("password_entries_v2", encryptedData);
          if (!retryResult.success) {
            throw new Error(saveResult.error?.message || "Failed to save entries. Storage quota exceeded.");
          }
        } else {
          throw new Error(saveResult.error?.message || "Failed to save entries. Storage quota exceeded.");
        }
      }

      // Also handle migration from old unencrypted data
      const oldData = localStorage.getItem("password_entries");
      if (oldData) {
        // Remove old unencrypted data for security
        localStorage.removeItem("password_entries");
      }
    } catch (error) {
      devError("Failed to save encrypted entries:", error);
      throw error;
    }
  }

  /**
   * Load password entries from encrypted storage
   * 
   * Decrypts and loads entries from storage. Automatically tries Electron file storage
   * first, then falls back to localStorage. Handles data migration and corruption recovery.
   * 
   * @returns Promise resolving to array of password entries
   * @throws Error if vault is locked or decryption fails
   * 
   * @example
   * ```typescript
   * const entries = await storageService.loadEntries();
   * console.log(`Loaded ${entries.length} entries`);
   * ```
   */
  async loadEntries(): Promise<PasswordEntry[]> {
    if (!this.encryption.isUnlocked()) {
      throw new Error("Vault is locked. Please unlock vault first.");
    }

    try {
      // SECURE: Try Electron file storage first (encrypted data only)
      const electronAPI = window.electronAPI;
      let encryptedData: string | null = null;
      
      if (electronAPI && electronAPI.loadVaultEncrypted) {
        try {
          encryptedData = await electronAPI.loadVaultEncrypted();
          if (encryptedData) {
            // Successfully loaded from file storage
            // Also sync to localStorage as backup for migration
            try {
              localStorage.setItem("password_entries_v2", encryptedData);
            } catch (syncError) {
              // Sync failed - non-critical, file storage succeeded
              devWarn("Failed to sync to localStorage (file storage succeeded):", syncError);
            }
          }
        } catch (electronError) {
          devError("Electron file storage load error, falling back to localStorage:", electronError);
          // Fall through to localStorage
        }
      }
      
      // Fallback: Load from localStorage (for web version or if Electron fails)
      if (!encryptedData) {
        encryptedData = localStorage.getItem("password_entries_v2");
      }
      
      if (encryptedData) {
        try {
          // Check for corruption before decrypting
          const { checkVaultDataCorruption, recoverVaultData, restoreFromBackup } = await import("./corruptionHandler");
          
          // Try to decrypt first
          let decryptedJson: string;
          try {
            decryptedJson = await this.encryption.decryptData(encryptedData);
          } catch (decryptError) {
            // Decryption failed - try backup
            devWarn("Decryption failed, attempting backup restore:", decryptError);
            const backupData = restoreFromBackup("password_entries_v2");
            if (backupData) {
              try {
                decryptedJson = await this.encryption.decryptData(backupData);
                devWarn("Successfully restored from backup");
              } catch {
                throw new Error("Vault data is corrupted and backup restoration failed. Please restore from export.");
              }
            } else {
              throw new Error("Vault data is corrupted and no backup available. Please restore from export.");
            }
          }
          
          // Check for corruption in decrypted data
          const corruptionCheck = checkVaultDataCorruption(decryptedJson);
          if (corruptionCheck.isCorrupted) {
            if (corruptionCheck.recoverable && corruptionCheck.recoveredData) {
              devWarn("Vault data corruption detected, attempting recovery:", corruptionCheck.errors);
              const recovery = recoverVaultData(decryptedJson);
              if (recovery.success && recovery.recovered && typeof recovery.data === "string") {
                decryptedJson = recovery.data;
                devWarn("Vault data recovered:", recovery.message);
              } else {
                throw new Error("Vault data is corrupted. Please restore from backup.");
              }
            } else {
              throw new Error("Vault data is corrupted and cannot be recovered. Please restore from backup.");
            }
          }
          
          const entries = JSON.parse(decryptedJson);

          // Ensure entries is an array and has proper date objects
          if (!Array.isArray(entries)) {
            devWarn("Loaded entries is not an array, returning empty array");
            return [];
          }

          return entries.map((entry: RawPasswordEntry) => ({
            ...entry,
            createdAt: new Date(entry.createdAt),
            updatedAt: new Date(entry.updatedAt),
          }));
        } catch (decryptError) {
          devError("Failed to decrypt main data, trying backup:", decryptError);
          // Try to recover from backup
          const backupData = localStorage.getItem("password_entries_v2_backup");
          if (backupData) {
            try {
              const decryptedBackup = await this.encryption.decryptData(backupData);
              const entries = JSON.parse(decryptedBackup);

              if (Array.isArray(entries)) {
                // Restore backup as main data
                localStorage.setItem("password_entries_v2", backupData);
                return entries.map((entry: RawPasswordEntry) => ({
                  ...entry,
                  createdAt: new Date(entry.createdAt),
                  updatedAt: new Date(entry.updatedAt),
                }));
              }
            } catch (backupError) {
              devError("Backup recovery failed:", backupError);
            }
          }
        }
      }

      // Handle migration from old unencrypted data
      const oldData = localStorage.getItem("password_entries");
      if (oldData && oldData !== "undefined" && oldData !== "null") {
        const entries = JSON.parse(oldData);

        if (Array.isArray(entries)) {
          // Convert dates and save as encrypted
          const migratedEntries = entries.map((entry: RawPasswordEntry) => ({
            ...entry,
            createdAt: new Date(entry.createdAt),
            updatedAt: new Date(entry.updatedAt),
          }));

          // Save encrypted and remove old data
          await this.saveEntries(migratedEntries);
          return migratedEntries;
        }
      }

      return [];
    } catch (error) {
      devError("Failed to load entries:", error);
      return [];
    }
  }

  async saveCategories(_categories: Category[]): Promise<void> {
    // ALWAYS save the fixed categories - ignore input for security
    if (!this.encryption.isUnlocked()) {
      throw new Error("Vault is locked. Please unlock vault first.");
    }

    try {
      const categoriesJson = JSON.stringify(FIXED_CATEGORIES);
      const encryptedData = await this.encryption.encryptData(categoriesJson);
      localStorage.setItem("password_categories_v2", encryptedData);
    } catch (error) {
      devError("Failed to save encrypted categories:", error);
      throw error;
    }
  }

  async loadCategories(): Promise<Category[]> {
    // ALWAYS return fixed categories - never load from storage for security
    return FIXED_CATEGORIES;
  }

  /**
   * Export vault data as CSV format
   * 
   * Exports all entries in CSV format for backup or migration purposes.
   * Includes all entry fields: account name, username, password, category, etc.
   * 
   * @returns Promise resolving to CSV-formatted string
   * @throws Error if vault is locked
   * 
   * @example
   * ```typescript
   * const csv = await storageService.exportData();
   * // Save to file or clipboard
   * ```
   */
  async exportData(): Promise<string> {
    if (!this.encryption.isUnlocked()) {
      throw new Error("Vault is locked. Please unlock vault first.");
    }

    const entries = await this.loadEntries();

    // Create CSV headers
    const headers = [
      "Account Name",
      "Username",
      "Password",
      "Category",
      "Account Details",
      "Notes",
      "Created Date",
      "Updated Date",
    ];

    // Convert entries to CSV rows
    const rows = entries.map((entry) => [
      this.escapeCsvField(entry.accountName),
      this.escapeCsvField(entry.username),
      this.escapeCsvField(entry.password),
      this.escapeCsvField(entry.category),
      this.escapeCsvField(entry.balance || ""),
      this.escapeCsvField(entry.notes || ""),
      this.escapeCsvField(entry.createdAt.toISOString()),
      this.escapeCsvField(entry.updatedAt.toISOString()),
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");

    return csvContent;
  }

  /**
   * Export data in JSON format (for programmatic import/export)
   */
  async exportJSON(): Promise<string> {
    if (!this.encryption.isUnlocked()) {
      throw new Error("Vault is locked. Please unlock vault first.");
    }

    const entries = await this.loadEntries();

    const exportData = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      entries: entries.map(entry => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export data in encrypted format (AES-256-GCM)
   * The exported file is encrypted with a user-provided password
   */
  async exportEncrypted(exportPassword: string): Promise<string> {
    if (!this.encryption.isUnlocked()) {
      throw new Error("Vault is locked. Please unlock vault first.");
    }

    const entries = await this.loadEntries();
    
    // Create export data structure
    const exportData = {
      version: 2,
      exportDate: new Date().toISOString(),
      entries: entries.map(entry => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      })),
    };

    // Generate a new salt for the export encryption
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Derive key from export password
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(exportPassword),
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );
    
    const exportKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );

    // Encrypt the data
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const dataToEncrypt = encoder.encode(JSON.stringify(exportData));
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      exportKey,
      dataToEncrypt
    );

    // Combine salt + iv + encrypted data and encode as base64
    const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

    // Return as JSON with metadata
    return JSON.stringify({
      format: "LocalPasswordVault-Encrypted",
      version: 2,
      data: btoa(String.fromCharCode(...combined)),
    });
  }

  /**
   * Import encrypted data
   */
  async importEncrypted(encryptedExport: string, exportPassword: string): Promise<void> {
    if (!this.encryption.isUnlocked()) {
      throw new Error("Vault is locked. Please unlock vault first.");
    }

    try {
      const parsed = JSON.parse(encryptedExport);
      
      if (parsed.format !== "LocalPasswordVault-Encrypted") {
        throw new Error("Invalid encrypted export format");
      }

      // Decode the combined data
      const combined = new Uint8Array(
        atob(parsed.data).split("").map(c => c.charCodeAt(0))
      );

      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const encryptedData = combined.slice(28);

      // Derive key from export password
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(exportPassword),
        "PBKDF2",
        false,
        ["deriveBits", "deriveKey"]
      );
      
      const exportKey = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: 100000,
          hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );

      // Decrypt the data
      const decryptedData = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        exportKey,
        encryptedData
      );

      const decoder = new TextDecoder();
      const exportData = JSON.parse(decoder.decode(decryptedData));

      // Import the entries
      if (exportData.entries && Array.isArray(exportData.entries)) {
        const entries = exportData.entries.map((entry: { createdAt: string; updatedAt: string }) => ({
          ...entry,
          createdAt: new Date(entry.createdAt),
          updatedAt: new Date(entry.updatedAt),
        }));
        await this.saveEntries(entries);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("Invalid")) {
        throw error;
      }
      throw new Error("Failed to decrypt export. Check your password.");
    }
  }

  // Helper method to escape CSV fields
  private escapeCsvField(field: string): string {
    if (!field) return "";

    // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (field.includes(",") || field.includes("\n") || field.includes('"')) {
      return `"${field.replace(/"/g, '""')}"`;
    }

    return field;
  }

  async importData(data: string): Promise<void> {
    if (!this.encryption.isUnlocked()) {
      throw new Error("Vault is locked. Please unlock vault first.");
    }

    try {
      const parsed = JSON.parse(data);
      if (parsed.entries && Array.isArray(parsed.entries)) {
        // Convert date strings back to Date objects
        const entries = parsed.entries.map((entry: { createdAt: string | Date; updatedAt: string | Date }) => ({
          ...entry,
          createdAt: entry.createdAt instanceof Date ? entry.createdAt : new Date(entry.createdAt),
          updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt : new Date(entry.updatedAt),
        }));
        await this.saveEntries(entries);
      } else {
        throw new Error("Invalid import data format: missing entries array");
      }
      // NEVER import categories - always use fixed ones for security
      await this.saveCategories(FIXED_CATEGORIES);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Invalid")) {
        throw error;
      }
      throw new Error("Invalid import data format");
    }
  }

  // Get password hint (stored unencrypted so it can be accessed without password)
  async getPasswordHint(): Promise<string | null> {
    try {
      const hint = localStorage.getItem("vault_password_hint_v2");
      return hint || null;
    } catch (error) {
      devError("Failed to load password hint:", error);
      return null;
    }
  }

  // Set password hint (can be set during initial setup without unlock, or when unlocked)
  async setPasswordHint(hint: string | null, requireUnlock: boolean = true): Promise<void> {
    if (requireUnlock && !this.encryption.isUnlocked()) {
      throw new Error("Vault is locked. Please unlock vault first.");
    }
    
    try {
      if (hint && hint.trim()) {
        localStorage.setItem("vault_password_hint_v2", hint.trim());
      } else {
        localStorage.removeItem("vault_password_hint_v2");
      }
    } catch (error) {
      devError("Failed to save password hint:", error);
      throw error;
    }
  }
}

export const storageService = StorageService.getInstance();
