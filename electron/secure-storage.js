const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Military-grade secure file storage for password vault
class SecureFileStorage {
  constructor(userDataPath) {
    this.userDataPath = userDataPath;
    this.vaultFilePath = path.join(userDataPath, "vault.dat");
    this.backupFilePath = path.join(userDataPath, "vault.backup.dat");
    this.saltFilePath = path.join(userDataPath, "vault.salt");
  }

  // Generate or load encryption salt
  getSalt() {
    try {
      if (fs.existsSync(this.saltFilePath)) {
        const saltData = fs.readFileSync(this.saltFilePath);
        return saltData;
      } else {
        const salt = crypto.randomBytes(32);
        fs.writeFileSync(this.saltFilePath, salt);
        return salt;
      }
    } catch (error) {
      console.error("Failed to get salt:", error);
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
      console.error("Encryption failed:", error);
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
      console.error("Decryption failed:", error);
      throw new Error("Failed to decrypt data - invalid password or corrupted data");
    }
  }

  // Save encrypted vault data
  saveVault(data, masterPassword) {
    try {
      const salt = this.getSalt();
      const key = this.deriveKey(masterPassword, salt);

      // Create backup before overwriting
      if (fs.existsSync(this.vaultFilePath)) {
        fs.copyFileSync(this.vaultFilePath, this.backupFilePath);
      }

      const jsonData = JSON.stringify(data);
      const encryptedData = this.encryptData(jsonData, key);

      fs.writeFileSync(this.vaultFilePath, encryptedData);

      // Clear sensitive data from memory
      key.fill(0);

      return true;
    } catch (error) {
      console.error("Failed to save vault:", error);
      return false;
    }
  }

  // Load and decrypt vault data
  loadVault(masterPassword) {
    try {
      if (!fs.existsSync(this.vaultFilePath)) {
        return null; // No vault exists
      }

      const salt = this.getSalt();
      const key = this.deriveKey(masterPassword, salt);

      const encryptedData = fs.readFileSync(this.vaultFilePath, 'utf8');

      try {
        const decryptedJson = this.decryptData(encryptedData, key);
        const data = JSON.parse(decryptedJson);

        // Clear sensitive data from memory
        key.fill(0);

        return data;
      } catch (decryptError) {
        console.error("Failed to decrypt vault, trying backup:", decryptError);

        // Try backup file
        if (fs.existsSync(this.backupFilePath)) {
          const backupData = fs.readFileSync(this.backupFilePath, 'utf8');
          const decryptedBackup = this.decryptData(backupData, key);
          const data = JSON.parse(decryptedBackup);

          // Restore backup as main
          fs.writeFileSync(this.vaultFilePath, backupData);

          // Clear sensitive data from memory
          key.fill(0);

          return data;
        }

        // Clear sensitive data from memory
        key.fill(0);
        throw decryptError;
      }
    } catch (error) {
      console.error("Failed to load vault:", error);
      return null;
    }
  }

  // Check if vault exists
  vaultExists() {
    return fs.existsSync(this.vaultFilePath);
  }

  // Securely delete vault
  deleteVault() {
    try {
      // Overwrite files with random data before deletion
      if (fs.existsSync(this.vaultFilePath)) {
        const stat = fs.statSync(this.vaultFilePath);
        const randomData = crypto.randomBytes(stat.size);
        fs.writeFileSync(this.vaultFilePath, randomData);
        fs.unlinkSync(this.vaultFilePath);
      }

      if (fs.existsSync(this.backupFilePath)) {
        const stat = fs.statSync(this.backupFilePath);
        const randomData = crypto.randomBytes(stat.size);
        fs.writeFileSync(this.backupFilePath, randomData);
        fs.unlinkSync(this.backupFilePath);
      }

      return true;
    } catch (error) {
      console.error("Failed to delete vault:", error);
      return false;
    }
  }
}

module.exports = SecureFileStorage;