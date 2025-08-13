export class PasswordService {
  private static instance: PasswordService;
  private static readonly MASTER_PASSWORD_KEY = "master_password_hash";
  private static readonly SALT_KEY = "master_password_salt";

  static getInstance(): PasswordService {
    if (!PasswordService.instance) {
      PasswordService.instance = new PasswordService();
    }
    return PasswordService.instance;
  }

  /**
   * Generate a random salt for password hashing
   */
  private generateSalt(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  /**
   * Hash a password with a salt using SHA-256
   */
  private async hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Set the master password (first time setup)
   */
  async setMasterPassword(password: string): Promise<void> {
    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    try {
      const salt = this.generateSalt();
      const hash = await this.hashPassword(password, salt);

      localStorage.setItem(PasswordService.SALT_KEY, salt);
      localStorage.setItem(PasswordService.MASTER_PASSWORD_KEY, hash);
    } catch (error) {
      console.error("Failed to set master password:", error);
      throw new Error("Failed to set master password");
    }
  }

  /**
   * Verify the master password
   */
  async verifyMasterPassword(password: string): Promise<boolean> {
    try {
      const storedHash = localStorage.getItem(
        PasswordService.MASTER_PASSWORD_KEY
      );
      const storedSalt = localStorage.getItem(PasswordService.SALT_KEY);

      if (!storedHash || !storedSalt) {
        // No master password set yet - this is first time setup
        return false;
      }

      const inputHash = await this.hashPassword(password, storedSalt);
      return inputHash === storedHash;
    } catch (error) {
      console.error("Failed to verify master password:", error);
      return false;
    }
  }

  /**
   * Check if a master password has been set
   */
  hasMasterPassword(): boolean {
    const storedHash = localStorage.getItem(
      PasswordService.MASTER_PASSWORD_KEY
    );
    const storedSalt = localStorage.getItem(PasswordService.SALT_KEY);
    return !!(storedHash && storedSalt);
  }

  /**
   * Change the master password
   */
  async changeMasterPassword(
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    if (!(await this.verifyMasterPassword(currentPassword))) {
      throw new Error("Current password is incorrect");
    }

    await this.setMasterPassword(newPassword);
    return true;
  }

  /**
   * Clear all password data (for reset/logout)
   */
  clearPasswordData(): void {
    localStorage.removeItem(PasswordService.MASTER_PASSWORD_KEY);
    localStorage.removeItem(PasswordService.SALT_KEY);
  }
}

export const passwordService = PasswordService.getInstance();
