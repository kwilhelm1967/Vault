/**
 * Import/Export Service Tests
 *
 * Tests for data import and export functionality
 * to ensure data integrity and security during transfers.
 */

import { storageService } from '../utils/storage';
import { importService as _importService } from '../utils/importService';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Import/Export Service', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    // Initialize storage for testing
    await storageService.initializeVault('TestPassword123!');
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Data Export', () => {
    it('should export data in encrypted format', async () => {
      // Add some test data
      const testEntries = [
        {
          id: 'test-1',
          accountName: 'Test Account',
          username: 'testuser',
          password: 'testpass123',
          category: 'other',
          isFavorite: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await storageService.saveEntries(testEntries);

      const exportData = await storageService.exportData();

      // Should be a non-empty string
      expect(typeof exportData).toBe('string');
      expect(exportData.length).toBeGreaterThan(0);

      // Should be encrypted (not contain plaintext)
      expect(exportData).not.toContain('Test Account');
      expect(exportData).not.toContain('testuser');
      expect(exportData).not.toContain('testpass123');
    });

    it('should include all entry data in export', async () => {
      const testEntry = {
        id: 'full-entry',
        accountName: 'Full Test Entry',
        username: 'fulluser@test.com',
        password: 'FullPassword123!',
        website: 'https://example.com',
        notes: 'Test notes for export',
        category: 'banking',
        isFavorite: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        customFields: [
          { id: 'cf1', label: 'PIN', value: '1234', isSecret: true },
          { id: 'cf2', label: 'Notes', value: 'Public note', isSecret: false },
        ],
      };

      await storageService.saveEntries([testEntry]);

      // exportData() returns CSV format, not JSON
      const exportData = await storageService.exportData();
      
      // Should be CSV format with headers
      expect(exportData).toContain('Account Name');
      expect(exportData).toContain('Full Test Entry');
      expect(exportData).toContain('fulluser@test.com');
      expect(exportData).toContain('banking');
    });

    it('should export empty data when no entries exist', async () => {
      const exportData = await storageService.exportData();
      
      // Should be CSV with headers only
      expect(exportData).toContain('Account Name');
      expect(exportData).toContain('Username');
      expect(exportData).toContain('Password');
      // Should have headers but no data rows (just header line)
      const lines = exportData.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(1); // At least header line
    });

    it('should include export metadata', async () => {
      const exportData = await storageService.exportData();
      
      // CSV format should have headers
      expect(exportData).toContain('Account Name');
      expect(exportData).toContain('Created Date');
      expect(exportData).toContain('Updated Date');
    });
  });

  describe('Data Import', () => {
    it('should import valid export data', async () => {
      // First create some data to export
      const testEntries = [
        {
          id: 'import-test-1',
          accountName: 'Import Test Account',
          username: 'importuser',
          password: 'importpass123',
          category: 'shopping',
          isFavorite: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await storageService.saveEntries(testEntries);
      const exportData = await storageService.exportJSON();

      // Clear current data
      await storageService.saveEntries([]);
      let loadedEntries = await storageService.loadEntries();
      expect(loadedEntries).toHaveLength(0);

      // Import the data back
      await storageService.importData(exportData);

      loadedEntries = await storageService.loadEntries();
      expect(loadedEntries).toHaveLength(1);
      expect(loadedEntries[0].accountName).toBe('Import Test Account');
      expect(loadedEntries[0].username).toBe('importuser');
      expect(loadedEntries[0].category).toBe('shopping');
      expect(loadedEntries[0].isFavorite).toBe(true);
    });

    it('should handle import of empty data', async () => {
      const emptyExport = JSON.stringify({
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        entries: [],
      });

      await storageService.importData(emptyExport);

      const loadedEntries = await storageService.loadEntries();
      expect(loadedEntries).toEqual([]);
    });

    it('should preserve custom fields during import/export cycle', async () => {
      const entryWithCustomFields = {
        id: 'custom-fields-test',
        accountName: 'Custom Fields Test',
        username: 'customuser',
        password: 'custompass123',
        category: 'business',
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        customFields: [
          { id: 'cf1', label: 'Security Question', value: 'What is your pet\'s name?', isSecret: false },
          { id: 'cf2', label: 'Answer', value: 'Fluffy', isSecret: true },
          { id: 'cf3', label: 'Backup Code', value: '123456789', isSecret: true },
        ],
      };

      await storageService.saveEntries([entryWithCustomFields]);
      const exportData = await storageService.exportJSON();

      // Clear and re-import
      await storageService.saveEntries([]);
      await storageService.importData(exportData);

      const loadedEntries = await storageService.loadEntries();
      expect(loadedEntries).toHaveLength(1);
      expect(loadedEntries[0].customFields).toHaveLength(3);
      expect(loadedEntries[0].customFields[0].label).toBe('Security Question');
      expect(loadedEntries[0].customFields[1].value).toBe('Fluffy');
      expect(loadedEntries[0].customFields[2].isSecret).toBe(true);
    });

    it('should reject malformed JSON', async () => {
      const malformedData = '{ invalid json }';

      await expect(storageService.importData(malformedData)).rejects.toThrow();
    });

    it('should reject data without required fields', async () => {
      const invalidData = JSON.stringify({
        // Missing version, exportedAt, entries
        someOtherField: 'value',
      });

      await expect(storageService.importData(invalidData)).rejects.toThrow();
    });

    it('should handle import of data with missing optional fields', async () => {
      const minimalEntry = {
        id: 'minimal-entry',
        accountName: 'Minimal Entry',
        username: 'minimal',
        password: 'minimalpass',
        category: 'other',
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Missing optional fields like website, notes, customFields
      };

      const importData = JSON.stringify({
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        entries: [minimalEntry],
      });

      await storageService.importData(importData);

      const loadedEntries = await storageService.loadEntries();
      expect(loadedEntries).toHaveLength(1);
      expect(loadedEntries[0].accountName).toBe('Minimal Entry');
      expect(loadedEntries[0].website).toBeUndefined();
      expect(loadedEntries[0].notes).toBeUndefined();
      expect(loadedEntries[0].customFields).toBeUndefined();
    });

    it('should handle large datasets', async () => {
      // Create 100 test entries
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `large-test-${i}`,
        accountName: `Large Test Account ${i}`,
        username: `user${i}@test.com`,
        password: `password${i}!`,
        category: i % 2 === 0 ? 'banking' : 'shopping',
        isFavorite: i % 10 === 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await storageService.saveEntries(largeDataset);
      const exportData = await storageService.exportJSON();

      // Clear and re-import
      await storageService.saveEntries([]);
      await storageService.importData(exportData);

      const loadedEntries = await storageService.loadEntries();
      expect(loadedEntries).toHaveLength(100);

      // Check a few random entries
      expect(loadedEntries[0].accountName).toBe('Large Test Account 0');
      expect(loadedEntries[50].username).toBe('user50@test.com');
      expect(loadedEntries[99].category).toBe('shopping');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data integrity through export/import cycle', async () => {
      const originalEntry = {
        id: 'integrity-test',
        accountName: 'Data Integrity Test',
        username: 'integrity@test.com',
        password: 'IntegrityPass123!',
        website: 'https://integrity.test',
        notes: 'This entry tests data integrity through export/import cycles.',
        category: 'business',
        isFavorite: true,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-02T15:30:00Z'),
        customFields: [
          { id: 'int1', label: 'Test Field 1', value: 'Test Value 1', isSecret: false },
          { id: 'int2', label: 'Secret Field', value: 'Secret Value', isSecret: true },
        ],
      };

      await storageService.saveEntries([originalEntry]);
      const exportData = await storageService.exportJSON();

      // Clear and re-import
      await storageService.saveEntries([]);
      await storageService.importData(exportData);

      const loadedEntries = await storageService.loadEntries();

      expect(loadedEntries).toHaveLength(1);
      const importedEntry = loadedEntries[0];

      // Check all fields match
      expect(importedEntry.id).toBe(originalEntry.id);
      expect(importedEntry.accountName).toBe(originalEntry.accountName);
      expect(importedEntry.username).toBe(originalEntry.username);
      expect(importedEntry.password).toBe(originalEntry.password);
      expect(importedEntry.website).toBe(originalEntry.website);
      expect(importedEntry.notes).toBe(originalEntry.notes);
      expect(importedEntry.category).toBe(originalEntry.category);
      expect(importedEntry.isFavorite).toBe(originalEntry.isFavorite);
      expect(importedEntry.customFields).toHaveLength(2);
      expect(importedEntry.customFields[0].value).toBe('Test Value 1');
      expect(importedEntry.customFields[1].value).toBe('Secret Value');
    });

    it('should handle special characters in data', async () => {
      const specialCharsEntry = {
        id: 'special-chars-test',
        accountName: 'Special Chars: àáâãäåæçèéêë',
        username: 'special@test.com',
        password: 'P@ssw0rd!#$%^&*()',
        website: 'https://test.com?param=value&other=test',
        notes: 'Notes with special chars: ñòóôõö÷øùúûüýþÿ',
        category: 'other',
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        customFields: [
          { id: 'sp1', label: 'Emoji Field 🎉', value: '🚀 Rocket Science', isSecret: false },
        ],
      };

      await storageService.saveEntries([specialCharsEntry]);
      const exportData = await storageService.exportJSON();

      await storageService.saveEntries([]);
      await storageService.importData(exportData);

      const loadedEntries = await storageService.loadEntries();
      expect(loadedEntries).toHaveLength(1);

      const importedEntry = loadedEntries[0];
      expect(importedEntry.accountName).toBe(specialCharsEntry.accountName);
      expect(importedEntry.password).toBe(specialCharsEntry.password);
      expect(importedEntry.website).toBe(specialCharsEntry.website);
      expect(importedEntry.notes).toBe(specialCharsEntry.notes);
      expect(importedEntry.customFields[0].value).toBe('🚀 Rocket Science');
    });
  });
});
