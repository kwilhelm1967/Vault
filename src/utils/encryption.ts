// Web Crypto API based encryption for local storage
class CryptoService {
  private static instance: CryptoService;
  private key: CryptoKey | null = null;

  static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async generateRecoveryKey(): Promise<string> {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    const exported = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  async importRecoveryKey(keyData: string): Promise<CryptoKey> {
    const keyBytes = new Uint8Array(atob(keyData).split('').map(c => c.charCodeAt(0)));
    return crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async setMasterPassword(password: string): Promise<void> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    this.key = await this.deriveKey(password, salt);
    localStorage.setItem('vault_salt', btoa(String.fromCharCode(...salt)));
    
    // Generate and store recovery key for security questions
    const recoveryKey = await this.generateRecoveryKey();
    localStorage.setItem('vault_recovery_key', recoveryKey);
    
    // Create a test encryption to verify the password works
    const testEncrypted = await this.encrypt('vault_initialized');
    localStorage.setItem('vault_test', testEncrypted);
  }

  isVaultInitialized(): boolean {
    return localStorage.getItem('vault_salt') !== null && localStorage.getItem('vault_test') !== null;
  }

  async unlockVault(password: string): Promise<boolean> {
    try {
      const saltB64 = localStorage.getItem('vault_salt');
      const isRecoveryMode = localStorage.getItem('vault_recovery_mode') === 'true';
      
      
      if (!saltB64 && !isRecoveryMode) {
        // First time setup - create new vault
        await this.setMasterPassword(password);
        return true;
      }

      if (isRecoveryMode) {
        localStorage.removeItem('vault_recovery_mode');
        
        // Get existing encrypted data
        const existingEntries = localStorage.getItem('vault_entries');
        const existingCategories = localStorage.getItem('vault_categories');
        const recoveryKeyData = localStorage.getItem('vault_recovery_key');
        
        
        // Store current data temporarily
        let preservedEntries = null;
        let preservedCategories = null;
        
        if (existingEntries || existingCategories) {
          try {
            // Try to decrypt with recovery key first
            if (recoveryKeyData) {
              const recoveryKey = await this.importRecoveryKey(recoveryKeyData);
              
              if (existingEntries) {
                try {
                  preservedEntries = await this.decryptWithKey(existingEntries, recoveryKey);
                } catch (error) {
                }
              }
              
              if (existingCategories) {
                try {
                  preservedCategories = await this.decryptWithKey(existingCategories, recoveryKey);
                } catch (error) {
                }
              }
            }
            
            // If recovery key failed, try with old password (if we have the salt)
            if ((!preservedEntries && existingEntries) || (!preservedCategories && existingCategories)) {
              if (saltB64) {
                const salt = new Uint8Array(atob(saltB64).split('').map(c => c.charCodeAt(0)));
                const oldKey = await this.deriveKey(password, salt);
                
                if (!preservedEntries && existingEntries) {
                  try {
                    const decrypted = await this.decryptWithKey(existingEntries, oldKey);
                    preservedEntries = decrypted;
                  } catch (error) {
                  }
                }
                
                if (!preservedCategories && existingCategories) {
                  try {
                    const decrypted = await this.decryptWithKey(existingCategories, oldKey);
                    preservedCategories = decrypted;
                  } catch (error) {
                  }
                }
              }
            }
            
          } catch (error) {
          }
        }
        
        // Set up new authentication with new password
        await this.setMasterPassword(password);
        
        // Re-encrypt preserved data with new key
        if (preservedEntries) {
          try {
            const reencrypted = await this.encrypt(preservedEntries);
            localStorage.setItem('vault_entries', reencrypted);
          } catch (error) {
          }
        }
        
        if (preservedCategories) {
          try {
            const reencrypted = await this.encrypt(preservedCategories);
            localStorage.setItem('vault_categories', reencrypted);
          } catch (error) {
          }
        }
        
        return true;
      }

      // Existing vault - verify password
      const salt = new Uint8Array(atob(saltB64).split('').map(c => c.charCodeAt(0)));
      this.key = await this.deriveKey(password, salt);

      // Test the key by trying to decrypt existing data
      const testData = localStorage.getItem('vault_test');
      if (testData) {
        const decrypted = await this.decrypt(testData);
        if (decrypted !== 'vault_initialized') {
          throw new Error('Invalid password');
        }
      } else {
        throw new Error('Vault data corrupted');
      }

      return true;
    } catch (error) {
      this.key = null; // Clear any partial key
      return false;
    }
  }

  async encrypt(data: string): Promise<string> {
    if (!this.key) throw new Error('Vault is locked');

    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      this.key,
      encoder.encode(data)
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  async encryptWithKey(data: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoder.encode(data)
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  async decrypt(encryptedData: string): Promise<string> {
    if (!this.key) throw new Error('Vault is locked');

    const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      this.key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }

  async decryptWithKey(encryptedData: string, key: CryptoKey): Promise<string> {
    const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }

  lockVault(): void {
    this.key = null;
  }

  isUnlocked(): boolean {
    return this.key !== null;
  }
}

export const cryptoService = CryptoService.getInstance();