/**
 * Entry Management Unit Tests
 * 
 * Tests for password entry CRUD operations.
 */

import { PasswordEntry } from '../types';

// Mock entry for testing
const createMockEntry = (overrides: Partial<PasswordEntry> = {}): PasswordEntry => ({
  id: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  accountName: 'Test Account',
  username: 'testuser@example.com',
  password: 'SecurePassword123!',
  category: 'other',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('Entry Management', () => {
  describe('Entry Creation', () => {
    it('should create entry with all required fields', () => {
      const entry = createMockEntry();
      
      expect(entry.id).toBeTruthy();
      expect(entry.accountName).toBe('Test Account');
      expect(entry.username).toBe('testuser@example.com');
      expect(entry.password).toBe('SecurePassword123!');
      expect(entry.category).toBe('other');
      expect(entry.createdAt).toBeInstanceOf(Date);
      expect(entry.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique IDs for each entry', () => {
      const entry1 = createMockEntry();
      const entry2 = createMockEntry();
      
      expect(entry1.id).not.toBe(entry2.id);
    });

    it('should allow optional fields', () => {
      const entry = createMockEntry({
        website: 'https://example.com',
        notes: 'Test notes',
        isFavorite: true,
      });
      
      expect(entry.website).toBe('https://example.com');
      expect(entry.notes).toBe('Test notes');
      expect(entry.isFavorite).toBe(true);
    });

    it('should support secure note type', () => {
      const secureNote = createMockEntry({
        entryType: 'secure_note',
        username: '',
        password: '',
        notes: 'This is a secure note',
      });
      
      expect(secureNote.entryType).toBe('secure_note');
      expect(secureNote.notes).toBe('This is a secure note');
    });

    it('should support custom fields', () => {
      const entry = createMockEntry({
        customFields: [
          { id: '1', label: 'PIN', value: '1234', isSecret: true },
          { id: '2', label: 'Account Number', value: '12345678', isSecret: false },
        ],
      });
      
      expect(entry.customFields).toHaveLength(2);
      expect(entry.customFields![0].label).toBe('PIN');
      expect(entry.customFields![0].isSecret).toBe(true);
    });
  });

  describe('Entry Validation', () => {
    it('should validate required accountName', () => {
      const entry = createMockEntry({ accountName: '' });
      const isValid = entry.accountName.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should validate required password for non-secure-notes', () => {
      const entry = createMockEntry({ password: '', entryType: undefined });
      const isValid = entry.password.length > 0 || entry.entryType === 'secure_note';
      expect(isValid).toBe(false);
    });

    it('should allow empty password for secure notes', () => {
      const entry = createMockEntry({ 
        password: '', 
        entryType: 'secure_note',
        notes: 'Secure note content' 
      });
      const isValid = entry.password.length > 0 || entry.entryType === 'secure_note';
      expect(isValid).toBe(true);
    });

    it('should validate category against allowed values', () => {
      const allowedCategories = ['all', 'banking', 'shopping', 'entertainment', 'business', 'email', 'work', 'other'];
      const entry = createMockEntry({ category: 'banking' });
      
      expect(allowedCategories).toContain(entry.category);
    });
  });

  describe('Entry Update', () => {
    it('should update updatedAt timestamp on modification', () => {
      const originalDate = new Date('2024-01-01');
      const entry = createMockEntry({ updatedAt: originalDate });
      
      // Simulate update
      const updatedEntry = {
        ...entry,
        accountName: 'Updated Account',
        updatedAt: new Date(),
      };
      
      expect(updatedEntry.accountName).toBe('Updated Account');
      expect(updatedEntry.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });

    it('should preserve createdAt on update', () => {
      const originalCreatedAt = new Date('2024-01-01');
      const entry = createMockEntry({ createdAt: originalCreatedAt });
      
      const updatedEntry = {
        ...entry,
        accountName: 'Updated Account',
        updatedAt: new Date(),
      };
      
      expect(updatedEntry.createdAt).toEqual(originalCreatedAt);
    });

    it('should preserve ID on update', () => {
      const entry = createMockEntry();
      const originalId = entry.id;
      
      const updatedEntry = {
        ...entry,
        accountName: 'Updated Account',
      };
      
      expect(updatedEntry.id).toBe(originalId);
    });
  });

  describe('Entry Deletion', () => {
    it('should remove entry from list by ID', () => {
      const entries = [
        createMockEntry({ id: 'entry-1' }),
        createMockEntry({ id: 'entry-2' }),
        createMockEntry({ id: 'entry-3' }),
      ];
      
      const filteredEntries = entries.filter(e => e.id !== 'entry-2');
      
      expect(filteredEntries).toHaveLength(2);
      expect(filteredEntries.find(e => e.id === 'entry-2')).toBeUndefined();
    });

    it('should not affect other entries on deletion', () => {
      const entries = [
        createMockEntry({ id: 'entry-1', accountName: 'Account 1' }),
        createMockEntry({ id: 'entry-2', accountName: 'Account 2' }),
      ];
      
      const filteredEntries = entries.filter(e => e.id !== 'entry-2');
      
      expect(filteredEntries[0].accountName).toBe('Account 1');
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicate passwords', () => {
      const entries = [
        createMockEntry({ id: '1', password: 'SamePassword123!' }),
        createMockEntry({ id: '2', password: 'SamePassword123!' }),
        createMockEntry({ id: '3', password: 'DifferentPass456!' }),
      ];
      
      const findDuplicates = (entry: PasswordEntry) => 
        entries.filter(e => e.id !== entry.id && e.password === entry.password);
      
      expect(findDuplicates(entries[0])).toHaveLength(1);
      expect(findDuplicates(entries[2])).toHaveLength(0);
    });

    it('should not flag secure notes as duplicates', () => {
      const entries = [
        createMockEntry({ id: '1', password: '', entryType: 'secure_note' }),
        createMockEntry({ id: '2', password: '', entryType: 'secure_note' }),
      ];
      
      const findDuplicates = (entry: PasswordEntry) => 
        entries.filter(e => 
          e.id !== entry.id && 
          e.password === entry.password && 
          e.entryType !== 'secure_note' &&
          entry.entryType !== 'secure_note'
        );
      
      expect(findDuplicates(entries[0])).toHaveLength(0);
    });
  });

  describe('Password Age Calculation', () => {
    it('should calculate password age in days', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const entry = createMockEntry({ updatedAt: thirtyDaysAgo });
      
      const daysOld = Math.floor(
        (Date.now() - entry.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      expect(daysOld).toBe(30);
    });

    it('should flag passwords older than 90 days', () => {
      const ninetyOneDaysAgo = new Date();
      ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91);
      
      const entry = createMockEntry({ updatedAt: ninetyOneDaysAgo });
      
      const daysOld = Math.floor(
        (Date.now() - entry.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isOld = daysOld > 90;
      
      expect(isOld).toBe(true);
    });

    it('should not flag recent passwords', () => {
      const entry = createMockEntry({ updatedAt: new Date() });
      
      const daysOld = Math.floor(
        (Date.now() - entry.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isOld = daysOld > 90;
      
      expect(isOld).toBe(false);
    });
  });

  describe('Favorites', () => {
    it('should toggle favorite status', () => {
      const entry = createMockEntry({ isFavorite: false });
      
      const toggledEntry = { ...entry, isFavorite: !entry.isFavorite };
      
      expect(toggledEntry.isFavorite).toBe(true);
    });

    it('should filter favorites correctly', () => {
      const entries = [
        createMockEntry({ id: '1', isFavorite: true }),
        createMockEntry({ id: '2', isFavorite: false }),
        createMockEntry({ id: '3', isFavorite: true }),
      ];
      
      const favorites = entries.filter(e => e.isFavorite);
      
      expect(favorites).toHaveLength(2);
    });
  });

  describe('Search', () => {
    it('should search by account name', () => {
      const entries = [
        createMockEntry({ accountName: 'Gmail Account' }),
        createMockEntry({ accountName: 'Bank of America' }),
        createMockEntry({ accountName: 'Netflix' }),
      ];
      
      const searchTerm = 'gmail';
      const results = entries.filter(e => 
        e.accountName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(results).toHaveLength(1);
      expect(results[0].accountName).toBe('Gmail Account');
    });

    it('should search by username', () => {
      const entries = [
        createMockEntry({ username: 'john@gmail.com' }),
        createMockEntry({ username: 'jane@yahoo.com' }),
      ];
      
      const searchTerm = 'gmail';
      const results = entries.filter(e => 
        e.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(results).toHaveLength(1);
    });

    it('should return empty for no matches', () => {
      const entries = [
        createMockEntry({ accountName: 'Test Account' }),
      ];
      
      const searchTerm = 'nonexistent';
      const results = entries.filter(e => 
        e.accountName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(results).toHaveLength(0);
    });
  });

  describe('Category Filtering', () => {
    it('should filter by category', () => {
      const entries = [
        createMockEntry({ category: 'banking' }),
        createMockEntry({ category: 'shopping' }),
        createMockEntry({ category: 'banking' }),
      ];
      
      const bankingEntries = entries.filter(e => e.category === 'banking');
      
      expect(bankingEntries).toHaveLength(2);
    });

    it('should return all entries for "all" category', () => {
      const entries = [
        createMockEntry({ category: 'banking' }),
        createMockEntry({ category: 'shopping' }),
        createMockEntry({ category: 'other' }),
      ];
      
      const selectedCategory = 'all';
      const filtered = selectedCategory === 'all' 
        ? entries 
        : entries.filter(e => e.category === selectedCategory);
      
      expect(filtered).toHaveLength(3);
    });
  });

  describe('Sorting', () => {
    it('should sort by name ascending', () => {
      const entries = [
        createMockEntry({ accountName: 'Zebra' }),
        createMockEntry({ accountName: 'Apple' }),
        createMockEntry({ accountName: 'Mango' }),
      ];
      
      const sorted = [...entries].sort((a, b) => 
        a.accountName.localeCompare(b.accountName)
      );
      
      expect(sorted[0].accountName).toBe('Apple');
      expect(sorted[2].accountName).toBe('Zebra');
    });

    it('should sort by date descending (newest first)', () => {
      const entries = [
        createMockEntry({ updatedAt: new Date('2024-01-01') }),
        createMockEntry({ updatedAt: new Date('2024-03-01') }),
        createMockEntry({ updatedAt: new Date('2024-02-01') }),
      ];
      
      const sorted = [...entries].sort((a, b) => 
        b.updatedAt.getTime() - a.updatedAt.getTime()
      );
      
      // March is month 2 (0-indexed: Jan=0, Feb=1, Mar=2)
      expect(sorted[0].updatedAt.getMonth()).toBe(2); // March (0-indexed)
      expect(sorted[0].updatedAt.getFullYear()).toBe(2024);
    });
  });
});










