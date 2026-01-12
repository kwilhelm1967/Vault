/**
 * Download URLs Configuration
 * 
 * Centralized download URLs for different platforms and products.
 * 
 * LOCKED IN: Repository mapping - NEVER CHANGE
 * - kwilhelm1967/Vault = Local Password Vault (LPV) ONLY
 * - kwilhelm1967/LocalLegacyVault = Local Legacy Vault (LLV) ONLY
 * 
 * IMPORTANT: This repository (LocalPasswordVault) is for Password Vault ONLY.
 * Legacy Vault MUST be built from the kwilhelm1967/LocalLegacyVault repository.
 * Download URLs correctly point to the LocalLegacyVault repository for LLV installers.
 */

// LOCKED: Local Password Vault repository - NEVER CHANGE TO LocalLegacyVault
const LPV_GITHUB_REPO = "kwilhelm1967/Vault";
// LOCKED: Local Legacy Vault repository - NEVER CHANGE TO Vault
const LLV_GITHUB_REPO = "kwilhelm1967/LocalLegacyVault";
const LPV_VERSION = "1.2.0";
const LLV_VERSION = "1.2.5"; // Signed release version for Local Legacy Vault

export interface DownloadUrls {
  windows: string;
  macos: string;
  linux: string;
}

// LOCKED: Local Password Vault downloads - ALWAYS uses kwilhelm1967/Vault repository
const LPV_DOWNLOAD_URLS: DownloadUrls = {
  windows: `https://github.com/${LPV_GITHUB_REPO}/releases/download/V${LPV_VERSION}/Local.Password.Vault.Setup.${LPV_VERSION}.exe`,
  macos: `https://github.com/${LPV_GITHUB_REPO}/releases/latest/download/Local%20Password%20Vault-${LPV_VERSION}-mac.dmg`,
  linux: `https://github.com/${LPV_GITHUB_REPO}/releases/latest/download/Local%20Password%20Vault-${LPV_VERSION}.AppImage`,
};

// LOCKED: Local Legacy Vault downloads - ALWAYS uses kwilhelm1967/LocalLegacyVault repository
// NOTE: GitHub filename uses DOTS: "Local.Legacy.Vault.Setup.1.2.5-x64.exe" (dots, -x64 suffix)
// URL must use dots (.) to match GitHub filename: Local.Legacy.Vault.Setup.1.2.5-x64.exe
// VERSION: 1.2.5 is the signed release version
const LLV_DOWNLOAD_URLS: DownloadUrls = {
  windows: `https://github.com/${LLV_GITHUB_REPO}/releases/download/V${LLV_VERSION}/Local.Legacy.Vault.Setup.${LLV_VERSION}-x64.exe`,
  macos: `https://github.com/${LLV_GITHUB_REPO}/releases/latest/download/Local.Legacy.Vault-${LLV_VERSION}-mac.dmg`,
  linux: `https://github.com/${LLV_GITHUB_REPO}/releases/latest/download/Local.Legacy.Vault-${LLV_VERSION}.AppImage`,
};

export const getDownloadUrl = (
  platform: 'windows' | 'macos' | 'linux',
  productType: 'lpv' | 'llv' = 'lpv'
): string => {
  if (productType === 'llv') {
    return LLV_DOWNLOAD_URLS[platform];
  }
  return LPV_DOWNLOAD_URLS[platform];
};

export { LPV_DOWNLOAD_URLS, LLV_DOWNLOAD_URLS };
