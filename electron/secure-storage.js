const crypto = require('crypto');
const fs = require('fs');
const fsPromises = require('fs').promises; // PERFORMANCE: Use async file operations
const path = require('path');
const StructuredLogger = require('./structuredLogger');

/**
 * Secure File Storage for Electron Password Vault
 * 
 * Provides secure, encrypted file storage with OS-level permissions.
 * All encryption/decryption happens in the renderer process - this class
 * only handles storing/retrieving pre-encrypted data blobs.
 * 
 * Security Features:
 * - OS-level file permissions (0600 on Unix/Linux/Mac)
 * - Automatic backup creation
 * - Secure file deletion (overwrite before delete)
 * - No master password in main process
 */
class SecureFileStorage {
  constructor(userDataPath) {
    this.userDataPath = userDataPath;
    this.vaultFilePath = path.join(userDataPath, "vault.dat");
    this.backupFilePath = path.join(userDataPath, "vault.backup.dat");
    this.saltFilePath = path.join(userDataPath, "vault.salt");
  }

  // Generate or load encryption salt (async for better responsiveness)
  async getSalt() {
    try {
      try {
        await fsPromises.access(this.saltFilePath);
        // File exists, read it
        const saltData = await fsPromises.readFile(this.saltFilePath);
        return saltData;
      } catch {
        // File doesn't exist, create new salt
        const salt = crypto.randomBytes(32);
        await fsPromises.writeFile(this.saltFilePath, salt);
        if (process.platform !== 'win32') {
          await fsPromises.chmod(this.saltFilePath, 0o600);
        }
        return salt;
      }
    } catch (error) {
      StructuredLogger.error('File Operation', 'getSalt', error, {
        saltPath: this.saltFilePath,
      });
      // Fallback: generate random salt
      return crypto.randomBytes(32);
    }
  }

  // Derive encryption key from master password using PBKDF2
  deriveKey(masterPassword, salt) {
    return crypto.pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha256');
  }

  // Encrypt data using AES-256-GCM
  encryptData(plaintext, key) {
    try {
      const iv = crypto.randomBytes(12); // 96-bit IV for GCM
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Combine: iv + authTag + encrypted
      const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')]);

      return combined.toString('base64');
    } catch (error) {
      StructuredLogger.error('Encryption', 'encryptData', error);
      throw new Error("Failed to encrypt data");
    }
  }

  // Decrypt data using AES-256-GCM
  decryptData(encryptedData, key) {
    try {
      const combined = Buffer.from(encryptedData, 'base64');

      const iv = combined.slice(0, 12);
      const authTag = combined.slice(12, 28); // 16-byte auth tag
      const encrypted = combined.slice(28);

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      StructuredLogger.error('Decryption', 'decryptData', error);
      throw new Error("Failed to decrypt data - invalid password or corrupted data");
    }
  }

  // SECURE: Save pre-encrypted vault data (encryption happens in renderer process)
  // Master password NEVER enters main process - only encrypted data is stored
  // PERFORMANCE: Async file operations for better responsiveness
  // STURDINESS: Atomic backup operations to prevent race conditions
  async saveVaultEncrypted(encryptedData) {
    try {
      // STURDINESS: Validate input data
      if (!encryptedData || typeof encryptedData !== 'string' || encryptedData.length === 0) {
        StructuredLogger.error('File Validation', 'saveVaultEncrypted', 
          new Error('Invalid encrypted data provided'), { dataLength: encryptedData?.length });
        return false;
      }
      
      // STURDINESS: Validate data size (prevent excessive memory usage)
      const MAX_VAULT_SIZE = 50 * 1024 * 1024; // 50MB limit
      if (encryptedData.length > MAX_VAULT_SIZE) {
        StructuredLogger.error('File Validation', 'saveVaultEncrypted',
          new Error('Vault data exceeds size limit'), { size: encryptedData.length, maxSize: MAX_VAULT_SIZE });
        return false;
      }

      // STURDINESS: Atomic backup creation - use temp file to prevent race conditions
      const backupTempPath = this.backupFilePath + '.tmp';
      try {
        // Check if main file exists before creating backup
        const mainFileExists = await fsPromises.access(this.vaultFilePath).then(() => true).catch(() => false);
        
        if (mainFileExists) {
          // Atomic backup: copy to temp, then rename
          await fsPromises.copyFile(this.vaultFilePath, backupTempPath);
          await fsPromises.rename(backupTempPath, this.backupFilePath);
          
          // Set permissions on backup
          if (process.platform !== 'win32') {
            await fsPromises.chmod(this.backupFilePath, 0o600);
          }
        }
      } catch (backupError) {
        // Clean up temp backup file on error
        try {
          await fsPromises.unlink(backupTempPath).catch(() => {});
        } catch {}
        
        StructuredLogger.warn('File Operation', 'createBackup', 
          'Failed to create backup (continuing anyway)', { error: backupError.message });
        // Continue even if backup fails - main save is more important
      }

      // STURDINESS: Atomic write - write to temp file first, then rename
      const tempFilePath = this.vaultFilePath + '.tmp';
      try {
        await fsPromises.writeFile(tempFilePath, encryptedData, { encoding: 'utf8', flag: 'w' });
        
        // Set permissions on temp file before rename
        if (process.platform !== 'win32') {
          await fsPromises.chmod(tempFilePath, 0o600);
        }
        
        // Atomic rename - ensures file is either fully written or not at all
        await fsPromises.rename(tempFilePath, this.vaultFilePath);
      } catch (writeError) {
        // Clean up temp file on error
        try {
          await fsPromises.unlink(tempFilePath).catch(() => {});
        } catch {}
        throw writeError;
      }

      // SECURITY: Set restrictive file permissions (owner read/write only)
      try {
        if (process.platform !== 'win32') {
          // Unix/Linux/Mac: 0600 = rw------- (owner read/write only)
          await fsPromises.chmod(this.vaultFilePath, 0o600);
          const backupExists = await fsPromises.access(this.backupFilePath).then(() => true).catch(() => false);
          if (backupExists) {
            await fsPromises.chmod(this.backupFilePath, 0o600);
          }
        }
      } catch (permError) {
        // Permission setting failed - log but don't fail
        StructuredLogger.warn('File Operation', 'setPermissions',
          'Failed to set file permissions (non-critical)', { error: permError.message });
      }

      StructuredLogger.info('File Operation', 'saveVaultEncrypted', 'Vault saved successfully');
      return true;
    } catch (error) {
      StructuredLogger.error('File Operation', 'saveVaultEncrypted', error, {
        vaultPath: this.vaultFilePath,
        backupPath: this.backupFilePath,
      });
      
      // STURDINESS: Recovery - try to restore from backup if main save failed
      try {
        const backupExists = await fsPromises.access(this.backupFilePath).then(() => true).catch(() => false);
        const mainExists = await fsPromises.access(this.vaultFilePath).then(() => true).catch(() => false);
        
        if (backupExists && !mainExists) {
          StructuredLogger.warn('File Recovery', 'restoreFromBackup', 'Attempting to restore from backup');
          
          // Atomic restore: copy to temp, then rename
          const restoreTempPath = this.vaultFilePath + '.restore.tmp';
          await fsPromises.copyFile(this.backupFilePath, restoreTempPath);
          if (process.platform !== 'win32') {
            await fsPromises.chmod(restoreTempPath, 0o600);
          }
          await fsPromises.rename(restoreTempPath, this.vaultFilePath);
          
          StructuredLogger.info('File Recovery', 'restoreFromBackup', 'Successfully restored from backup');
        }
      } catch (recoveryError) {
        StructuredLogger.error('File Recovery', 'restoreFromBackup', recoveryError);
      }
      
      return false;
    }
  }

  // SECURE: Load encrypted vault data (returns encrypted blob, decryption in renderer)
  // Master password NEVER enters main process
  // PERFORMANCE: Async file operations for better responsiveness
  // STURDINESS: Enhanced error handling with validation and recovery
  async loadVaultEncrypted() {
    try {
      // Check if file exists
      try {
        await fsPromises.access(this.vaultFilePath);
      } catch {
        return null; // No vault exists
      }

      // STURDINESS: Validate file size before reading
      const stats = await fsPromises.stat(this.vaultFilePath);
      const MAX_VAULT_SIZE = 50 * 1024 * 1024; // 50MB limit
      if (stats.size > MAX_VAULT_SIZE) {
        StructuredLogger.error('File Validation', 'loadVaultEncrypted',
          new Error('Vault file exceeds size limit'), { size: stats.size, maxSize: MAX_VAULT_SIZE });
        // Try backup instead
        return await this.loadFromBackup();
      }
      
      if (stats.size === 0) {
        StructuredLogger.warn('File Validation', 'loadVaultEncrypted', 'Vault file is empty, trying backup');
        return await this.loadFromBackup();
      }

      // Read encrypted data (still encrypted - no decryption in main process)
      const encryptedData = await fsPromises.readFile(this.vaultFilePath, 'utf8');
      
      // STURDINESS: Validate data is not empty
      if (!encryptedData || encryptedData.trim().length === 0) {
        StructuredLogger.warn('File Validation', 'loadVaultEncrypted', 
          'Vault file contains empty data, trying backup');
        return await this.loadFromBackup();
      }
      
      StructuredLogger.debug('File Operation', 'loadVaultEncrypted', 'Vault loaded successfully');
      return encryptedData;
    } catch (error) {
      StructuredLogger.error('File Operation', 'loadVaultEncrypted', error, {
        vaultPath: this.vaultFilePath,
      });
      
      // STURDINESS: Recovery - try backup file
      return await this.loadFromBackup();
    }
  }
  
  // STURDINESS: Helper method for backup recovery (async)
  async loadFromBackup() {
    try {
      // Check if backup exists
      let backupExists = false;
      try {
        await fsPromises.access(this.backupFilePath);
        backupExists = true;
      } catch {
        StructuredLogger.debug('File Recovery', 'loadFromBackup', 'Backup file does not exist');
        return null;
      }
      
      if (!backupExists) {
        return null;
      }
      
      const stats = await fsPromises.stat(this.backupFilePath);
      if (stats.size === 0) {
        StructuredLogger.error('File Validation', 'loadFromBackup', 
          new Error('Backup file is empty'));
        return null;
      }
      
      const backupData = await fsPromises.readFile(this.backupFilePath, 'utf8');
      
      if (!backupData || backupData.trim().length === 0) {
        StructuredLogger.error('File Validation', 'loadFromBackup',
          new Error('Backup file contains empty data'));
        return null;
      }
      
      // STURDINESS: Restore backup as main (atomic operation)
      try {
        const tempPath = this.vaultFilePath + '.restore.tmp';
        await fsPromises.writeFile(tempPath, backupData, { encoding: 'utf8', flag: 'w' });
        if (process.platform !== 'win32') {
          await fsPromises.chmod(tempPath, 0o600);
        }
        await fsPromises.rename(tempPath, this.vaultFilePath);
        StructuredLogger.info('File Recovery', 'loadFromBackup', 'Successfully restored from backup');
      } catch (restoreError) {
        StructuredLogger.error('File Recovery', 'restoreBackup', restoreError);
        // Still return backup data even if restore failed
      }
      
      return backupData;
    } catch (backupError) {
      StructuredLogger.error('File Recovery', 'loadFromBackup', backupError, {
        backupPath: this.backupFilePath,
      });
    }
    
    return null;
  }


  // Check if vault exists (async)
  async vaultExists() {
    try {
      await fsPromises.access(this.vaultFilePath);
      return true;
    } catch {
      return false;
    }
  }

  // Securely delete vault (async for better responsiveness)
  async deleteVault() {
    try {
      // Overwrite files with random data before deletion
      try {
        await fsPromises.access(this.vaultFilePath);
        const stat = await fsPromises.stat(this.vaultFilePath);
        const randomData = crypto.randomBytes(stat.size);
        await fsPromises.writeFile(this.vaultFilePath, randomData);
        await fsPromises.unlink(this.vaultFilePath);
        StructuredLogger.info('File Operation', 'deleteVault', 'Main vault file securely deleted');
      } catch (error) {
        if (error.code !== 'ENOENT') {
          StructuredLogger.warn('File Operation', 'deleteVault',
            'Failed to delete main vault file', { error: error.message });
        }
      }

      try {
        await fsPromises.access(this.backupFilePath);
        const stat = await fsPromises.stat(this.backupFilePath);
        const randomData = crypto.randomBytes(stat.size);
        await fsPromises.writeFile(this.backupFilePath, randomData);
        await fsPromises.unlink(this.backupFilePath);
        StructuredLogger.info('File Operation', 'deleteVault', 'Backup vault file securely deleted');
      } catch (error) {
        if (error.code !== 'ENOENT') {
          StructuredLogger.warn('File Operation', 'deleteVault',
            'Failed to delete backup vault file', { error: error.message });
        }
      }

      return true;
    } catch (error) {
      StructuredLogger.error('File Operation', 'deleteVault', error);
      return false;
    }
  }
}

module.exports = SecureFileStorage;