import { PasswordEntry, Category } from "../types";

// FIXED CATEGORIES - SINGLE SOURCE OF TRUTH
const FIXED_CATEGORIES: Category[] = [
  { id: "all", name: "All", color: "#3b82f6", icon: "Grid3X3" },
  { id: "banking", name: "Banking", color: "#10b981", icon: "CreditCard" },
  { id: "shopping", name: "Shopping", color: "#f59e0b", icon: "ShoppingCart" },
  {
    id: "entertainment",
    name: "Entertainment",
    color: "#ef4444",
    icon: "Play",
  },
  { id: "business", name: "Business", color: "#8b5cf6", icon: "Briefcase" },
  { id: "other", name: "Other", color: "#6b7280", icon: "Folder" },
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
      salt = crypto.getRandomValues(new Uint8Array(32)); // 256-bit salt
      localStorage.setItem("vault_salt_v2", btoa(String.fromCharCode(...salt)));
    }

    this.encryptionKey = await this.deriveKeyFromPassword(masterPassword, salt);
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
    this.encryptionKey = null;
  }

  // Check if vault exists (has salt)
  vaultExists(): boolean {
    return localStorage.getItem("vault_salt_v2") !== null;
  }
}

export class StorageService {
  private static instance: StorageService;
  private encryption = MilitaryEncryption.getInstance();

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
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

  // Unlock vault with master password
  async unlockVault(masterPassword: string): Promise<boolean> {
    try {
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
          return false;
        }
      } else {
        // Test data is missing - this indicates vault corruption
        this.encryption.lockVault();
        return false;
      }

      return true; // Password verified and vault unlocked successfully
    } catch (error) {
      console.error("Failed to unlock vault:", error);
      this.encryption.lockVault(); // Ensure key is cleared on any error
      return false;
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
      console.warn("Invalid entries array provided to saveEntries");
      return;
    }

    try {
      // Validate each entry before saving
      const validEntries = entries.filter((entry) => {
        return (
          entry &&
          typeof entry.id === "string" &&
          typeof entry.accountName === "string" &&
          typeof entry.username === "string" &&
          typeof entry.password === "string" &&
          typeof entry.category === "string"
        );
      });

      // Encrypt the entries before saving
      const entriesJson = JSON.stringify(validEntries);
      const encryptedData = await this.encryption.encryptData(entriesJson);

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
      console.error("Failed to save encrypted entries:", error);
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
            console.warn("Loaded entries is not an array, returning empty array");
            return [];
          }

          return entries.map((entry: any) => ({
            ...entry,
            createdAt: new Date(entry.createdAt),
            updatedAt: new Date(entry.updatedAt),
          }));
        } catch (decryptError) {
          console.error("Failed to decrypt main data, trying backup:", decryptError);
          // Try to recover from backup
          const backupData = localStorage.getItem("password_entries_v2_backup");
          if (backupData) {
            try {
              const decryptedBackup = await this.encryption.decryptData(backupData);
              const entries = JSON.parse(decryptedBackup);

              if (Array.isArray(entries)) {
                console.log("Successfully recovered from backup");
                // Restore backup as main data
                localStorage.setItem("password_entries_v2", backupData);
                return entries.map((entry: any) => ({
                  ...entry,
                  createdAt: new Date(entry.createdAt),
                  updatedAt: new Date(entry.updatedAt),
                }));
              }
            } catch (backupError) {
              console.error("Backup recovery failed:", backupError);
            }
          }
        }
      }

      // Handle migration from old unencrypted data
      const oldData = localStorage.getItem("password_entries");
      if (oldData && oldData !== "undefined" && oldData !== "null") {
        console.log(
          "Migrating unencrypted password data to encrypted storage..."
        );
        const entries = JSON.parse(oldData);

        if (Array.isArray(entries)) {
          // Convert dates and save as encrypted
          const migratedEntries = entries.map((entry: any) => ({
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
      console.error("Failed to load entries:", error);
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
      console.error("Failed to save encrypted categories:", error);
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
}

export const storageService = StorageService.getInstance();
