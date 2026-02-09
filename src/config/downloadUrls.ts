/**
 * Download URLs for Local Password Vault (LPV) only.
 * Repository: kwilhelm1967/LocalPasswordVault
 */

const LPV_GITHUB_REPO = "kwilhelm1967/LocalPasswordVault";
const LPV_RELEASE_TAG = "V1.2.1";
const LPV_VERSION = "1.2.0";

export interface DownloadUrls {
  windows: string;
  macos: string;
  linux: string;
}

const LPV_DOWNLOAD_URLS: DownloadUrls = {
  windows: `https://github.com/${LPV_GITHUB_REPO}/releases/download/${LPV_RELEASE_TAG}/Local.Password.Vault.Setup.${LPV_VERSION}.zip`,
  macos: `https://github.com/${LPV_GITHUB_REPO}/releases/download/${LPV_RELEASE_TAG}/Local.Password.Vault-${LPV_VERSION}-mac.zip`,
  linux: `https://github.com/${LPV_GITHUB_REPO}/releases/download/${LPV_RELEASE_TAG}/Local.Password.Vault-${LPV_VERSION}.AppImage`,
};

export const getDownloadUrl = (
  platform: 'windows' | 'macos' | 'linux',
  _productType: 'lpv' | 'llv' = 'lpv'
): string => LPV_DOWNLOAD_URLS[platform];

export { LPV_DOWNLOAD_URLS };
