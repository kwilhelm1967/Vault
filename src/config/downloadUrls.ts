/**
 * Download URLs Configuration
 * 
 * Centralized configuration for application download URLs.
 * Uses GitHub Releases for distribution.
 * 
 * When updating version numbers, update the version in the filename.
 * The /latest/download/ path will always point to the latest release.
 */

export const DOWNLOAD_BASE_URL = 'https://github.com/kwilhelm1967/Vault/releases/download/V1.2.0';

export const DOWNLOAD_FILENAMES = {
  windows: 'Local.Password.Vault.Setup.1.2.0.exe',
  macos: 'Local%20Password%20Vault-1.2.0-mac.dmg',
  linux: 'Local%20Password%20Vault-1.2.0.AppImage',
} as const;

export const DOWNLOAD_URLS = {
  windows: `${DOWNLOAD_BASE_URL}/${DOWNLOAD_FILENAMES.windows}`,
  macos: `${DOWNLOAD_BASE_URL}/${DOWNLOAD_FILENAMES.macos}`,
  linux: `${DOWNLOAD_BASE_URL}/${DOWNLOAD_FILENAMES.linux}`,
} as const;

/**
 * Get download URL for a platform
 */
export function getDownloadUrl(platform: 'windows' | 'macos' | 'linux'): string {
  return DOWNLOAD_URLS[platform];
}

/**
 * Get all download URLs as an object
 */
export function getAllDownloadUrls() {
  return DOWNLOAD_URLS;
}

