import { PasswordEntry, Category } from '../types';

// FIXED CATEGORIES - SINGLE SOURCE OF TRUTH
const FIXED_CATEGORIES: Category[] = [
  { id: 'all', name: 'All', color: '#3b82f6', icon: 'Grid3X3' },
  { id: 'banking', name: 'Banking', color: '#10b981', icon: 'CreditCard' },
  { id: 'shopping', name: 'Shopping', color: '#f59e0b', icon: 'ShoppingCart' },
  { id: 'entertainment', name: 'Entertainment', color: '#ef4444', icon: 'Play' },
  { id: 'business', name: 'Business', color: '#8b5cf6', icon: 'Briefcase' },
  { id: 'other', name: 'Other', color: '#6b7280', icon: 'Folder' }
];

export class StorageService {
  private static instance: StorageService;

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async saveEntries(entries: PasswordEntry[]): Promise<void> {
    // Ensure we have valid entries array
    if (!Array.isArray(entries)) {
      console.warn('Invalid entries array provided to saveEntries');
      return;
    }
    
    try {
      // Validate each entry before saving
      const validEntries = entries.filter(entry => {
        return entry && 
               typeof entry.id === 'string' && 
               typeof entry.accountName === 'string' && 
               typeof entry.username === 'string' && 
               typeof entry.password === 'string' && 
               typeof entry.category === 'string';
      });
      
      localStorage.setItem('password_entries', JSON.stringify(validEntries));
    } catch (error) {
      console.error('Failed to save entries to localStorage:', error);
      throw error;
    }
  }

  async loadEntries(): Promise<PasswordEntry[]> {
    const stored = localStorage.getItem('password_entries');
    if (!stored || stored === 'undefined' || stored === 'null' || stored === 'undefined' || stored === 'null') return [];

    try {
      const entries = JSON.parse(stored);
      
      // Ensure entries is an array and has proper date objects
      if (!Array.isArray(entries)) {
        console.warn('Loaded entries is not an array, returning empty array');
        return [];
      }
      
      return entries.map((entry: any) => ({
        ...entry,
        createdAt: new Date(entry.createdAt),
        updatedAt: new Date(entry.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to load entries:', error);
      return [];
    }
  }

  async saveCategories(categories: Category[]): Promise<void> {
    // ALWAYS save the fixed categories - ignore input
    localStorage.setItem('password_categories', JSON.stringify(FIXED_CATEGORIES));
  }

  async loadCategories(): Promise<Category[]> {
    // ALWAYS return fixed categories - never load from storage
    return FIXED_CATEGORIES;
  }

  async exportData(): Promise<string> {
    const entries = await this.loadEntries();
    
    // Create CSV headers
    const headers = [
      'Account Name',
      'Username',
      'Password',
      'Category',
      'Account Details',
      'Notes',
      'Created Date',
      'Updated Date'
    ];
    
    // Convert entries to CSV rows
    const rows = entries.map(entry => [
      this.escapeCsvField(entry.accountName),
      this.escapeCsvField(entry.username),
      this.escapeCsvField(entry.password),
      this.escapeCsvField(entry.category),
      this.escapeCsvField(entry.balance || ''),
      this.escapeCsvField(entry.notes || ''),
      this.escapeCsvField(entry.createdAt.toISOString()),
      this.escapeCsvField(entry.updatedAt.toISOString())
    ]);
    
    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    return csvContent;
  }
  
  // Helper method to escape CSV fields
  private escapeCsvField(field: string): string {
    if (!field) return '';
    
    // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (field.includes(',') || field.includes('\n') || field.includes('"')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    
    return field;
  }

  async importData(data: string): Promise<void> {
    try {
      const parsed = JSON.parse(data);
      if (parsed.entries && Array.isArray(parsed.entries)) {
        await this.saveEntries(parsed.entries);
      }
      // NEVER import categories - always use fixed ones
      await this.saveCategories(FIXED_CATEGORIES);
    } catch (error) {
      throw new Error('Invalid import data format');
    }
  }
}

export const storageService = StorageService.getInstance();