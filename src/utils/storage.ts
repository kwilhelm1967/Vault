import { PasswordEntry, Category, RawPasswordEntry } from "../types";
import { memorySecurity } from "./memorySecurity";
import { sanitizeTextField, sanitizePassword, sanitizeNotes } from "./sanitization";
import { devError, devWarn } from "./devLog";

// FIXED CATEGORIES - SINGLE SOURCE OF TRUTH (must match App.tsx)
const FIXED_CATEGORIES: Category[] = [
  { id: "all", name: "All", color: "#3b82f6", icon: "Grid3X3" },
  { id: "banking", name: "Banking", color: "#10b981", icon: "CircleDollarSign" },
  { id: "shopping", name: "Shopping", color: "#f59e0b", icon: "ShoppingCart" },
  { id: "entertainment", name: "Entertainment", color: "#a855f7", icon: "Ticket" },
  { id: "email", name: "Email", color: "#f43f5e", icon: "Mail" },
  { id: "work", name: "Work", color: "#3b82f6", icon: "Briefcase" },
  { id: "business", name: "Business", color: "#8b5cf6", icon: "TrendingUp" },
  { id: "other", name: "Other", color: "#6b7280", icon: "FileText" },
];

// Military-grade AES-256-GCM encryption implementation
class MilitaryEncryption {
  private static instance: MilitaryEncryption;
  private encryptionKey: CryptoKey | null = null;

  static getInstance(): MilitaryEncryption {
    if (!MilitaryEncryption.instance) {
      MilitaryEncryption.instance = new MilitaryEncryption();
    }
    return MilitaryEncryption.instance;
  }

  // Generate encryption key from master password using PBKDF2 (100,000 iterations)
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

      // Encrypt the entries before saving
      const entriesJson = JSON.stringify(validEntries);
      const encryptedData = await this.encryption.encryptData(entriesJson);

      // SECURE: Try to save to secure file storage first (Electron)
      if (window.electronAPI && window.electronAPI.saveVaultEncrypted) {
        // For Electron app, we need the master password for secure file storage
        // This is a security limitation - master password should never be exposed
        // to renderer process in production. For now, fallback to localStorage.
        devWarn("Secure file storage requires master password in renderer - using localStorage fallback");
      }

      // Fallback: localStorage with encryption (less secure than file storage)
      // Create backup before saving new data
      const currentData = localStorage.getItem("password_entries_v2");
      if (currentData) {
        localStorage.setItem("password_entries_v2_backup", currentData);
      }

      localStorage.setItem("password_entries_v2", encryptedData);

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

  async loadEntries(): Promise<PasswordEntry[]> {
    if (!this.encryption.isUnlocked()) {
      throw new Error("Vault is locked. Please unlock vault first.");
    }

    try {
      // Try to load encrypted data first
      const encryptedData = localStorage.getItem("password_entries_v2");
      if (encryptedData) {
        try {
          const decryptedJson = await this.encryption.decryptData(encryptedData);
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
        await this.saveEntries(parsed.entries);
      }
      // NEVER import categories - always use fixed ones for security
      await this.saveCategories(FIXED_CATEGORIES);
    } catch (error) {
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
