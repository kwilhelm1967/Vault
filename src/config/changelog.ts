/**
 * Changelog Data
 * 
 * Version history and release notes for the app.
 */

export interface ChangelogEntry {
  version: string;
  date: string;
  highlights: string[];
  changes: {
    type: 'added' | 'improved' | 'fixed' | 'security';
    description: string;
  }[];
}

export const APP_VERSION = '1.2.16';

export const changelog: ChangelogEntry[] = [
  {
    version: '1.2.16',
    date: 'December 2026',
    highlights: [
      'Password Age Alerts',
      'Enhanced Accessibility',
      'Premium Floating Button',
    ],
    changes: [
      { type: 'added', description: 'Password age warnings for entries >90 days old' },
      { type: 'added', description: 'Undo delete with 5-second recovery window' },
      { type: 'added', description: 'Offline indicator when network unavailable' },
      { type: 'added', description: 'ARIA live regions for screen readers' },
      { type: 'added', description: 'Keyboard navigation improvements' },
      { type: 'added', description: 'Focus trap for modal dialogs' },
      { type: 'added', description: 'Skip-to-content link for accessibility' },
      { type: 'added', description: 'Installer verification script' },
      { type: 'improved', description: 'Floating button with premium design' },
      { type: 'improved', description: 'Debounced search for better performance' },
      { type: 'improved', description: 'Micro-interactions and animations' },
      { type: 'improved', description: 'Component architecture (vault components)' },
      { type: 'fixed', description: 'npm security vulnerabilities' },
      { type: 'security', description: 'Removed breach check API to maintain offline promise' },
    ],
  },
  {
    version: '1.1.0',
    date: 'November 2026',
    highlights: [
      '2FA/TOTP Support',
      'Custom Fields',
      'Password History',
    ],
    changes: [
      { type: 'added', description: 'Built-in 2FA/TOTP authenticator' },
      { type: 'added', description: 'Custom fields for any data type' },
      { type: 'added', description: 'Secure notes entry type' },
      { type: 'added', description: 'Password history tracking' },
      { type: 'added', description: 'Password strength meter' },
      { type: 'added', description: 'Bulk delete operations' },
      { type: 'added', description: 'Favorites for quick access' },
      { type: 'improved', description: 'Dashboard with security score' },
      { type: 'improved', description: 'Entry card expand/collapse' },
      { type: 'fixed', description: 'Memory leaks in trial status checking' },
    ],
  },
  {
    version: '1.0.0',
    date: 'October 2026',
    highlights: [
      'Initial Release',
      'AES-256 Encryption',
      'Cross-Platform Support',
    ],
    changes: [
      { type: 'added', description: 'AES-256-GCM encryption with PBKDF2' },
      { type: 'added', description: 'Cross-platform support (Windows, Mac, Linux)' },
      { type: 'added', description: 'Floating mini vault panel' },
      { type: 'added', description: 'Password generator' },
      { type: 'added', description: 'Encrypted backup/restore' },
      { type: 'added', description: '12-word recovery phrase' },
      { type: 'added', description: 'Auto-lock timeout' },
      { type: 'added', description: 'Clipboard auto-clear' },
      { type: 'added', description: 'Rate-limited login' },
    ],
  },
];

export const getLatestVersion = () => changelog[0];
export const hasNewVersion = (lastSeenVersion: string) => {
  return lastSeenVersion !== APP_VERSION;
};

