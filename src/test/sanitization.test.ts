/**
 * Sanitization Utilities Tests
 *
 * Tests for data sanitization functions to ensure
 * proper input validation and XSS prevention.
 */

import {
  sanitizeTextField,
  sanitizePassword,
  sanitizeNotes,
  sanitizeUrl,
  escapeHtml,
  sanitizePasswordEntry,
  containsDangerousContent,
} from '../utils/sanitization';

describe('Text Field Sanitization', () => {
  it('should preserve normal text', () => {
    const input = 'Normal text input';
    const result = sanitizeTextField(input);
    expect(result).toBe('Normal text input');
  });

  it('should remove null bytes', () => {
    const input = 'Text with\x00null byte';
    const result = sanitizeTextField(input);
    expect(result).toBe('Text withnull byte');
  });

  it('should trim whitespace', () => {
    const input = '  spaced text  ';
    const result = sanitizeTextField(input);
    expect(result).toBe('spaced text');
  });

  it('should handle empty strings', () => {
    const input = '';
    const result = sanitizeTextField(input);
    expect(result).toBe('');
  });

  it('should handle null input', () => {
    const input = null as unknown;
    const result = sanitizeTextField(input);
    expect(result).toBe('');
  });

  it('should handle undefined input', () => {
    const input = undefined as unknown;
    const result = sanitizeTextField(input);
    expect(result).toBe('');
  });

  it('should limit length to prevent abuse', () => {
    const input = 'a'.repeat(10000);
    const result = sanitizeTextField(input);
    expect(result.length).toBeLessThan(10000); // Should be truncated
  });
});

describe('Password Sanitization', () => {
  it('should preserve password characters', () => {
    const input = 'P@ssw0rd!123#$%';
    const result = sanitizePassword(input);
    expect(result).toBe('P@ssw0rd!123#$%');
  });

  it('should preserve whitespace (passwords may intentionally contain spaces)', () => {
    const input = '  password  ';
    const result = sanitizePassword(input);
    expect(result).toBe('  password  '); // Passwords intentionally don't trim
  });

  it('should handle empty passwords', () => {
    const input = '';
    const result = sanitizePassword(input);
    expect(result).toBe('');
  });

  it('should remove null bytes but preserve other characters', () => {
    const input = 'password\x00\x01\x02\x03';
    const result = sanitizePassword(input);
    expect(result).toBe('password\x01\x02\x03'); // Only null bytes removed
  });
});

describe('Notes Sanitization', () => {
  it('should preserve normal notes', () => {
    const input = 'These are my important notes about this account.';
    const result = sanitizeNotes(input);
    expect(result).toBe('These are my important notes about this account.');
  });

  it('should allow multiline notes', () => {
    const input = 'Line 1\nLine 2\nLine 3';
    const result = sanitizeNotes(input);
    expect(result).toBe('Line 1\nLine 2\nLine 3');
  });

  it('should trim whitespace', () => {
    const input = '  notes with spaces  ';
    const result = sanitizeNotes(input);
    expect(result).toBe('notes with spaces');
  });

  it('should handle very long notes', () => {
    const input = 'a'.repeat(50000);
    const result = sanitizeNotes(input);
    expect(result.length).toBeLessThan(50000); // Should be truncated
  });
});

describe('URL Sanitization', () => {
  it('should preserve valid URLs', () => {
    const input = 'https://www.example.com/path?param=value';
    const result = sanitizeUrl(input);
    expect(result).toBe('https://www.example.com/path?param=value');
  });

  it('should trim whitespace', () => {
    const input = '  https://example.com  ';
    const result = sanitizeUrl(input);
    expect(result).toBe('https://example.com');
  });

  it('should handle empty URLs', () => {
    const input = '';
    const result = sanitizeUrl(input);
    expect(result).toBe('');
  });

  it('should remove dangerous protocols', () => {
    const input = 'javascript:alert("xss")';
    const result = sanitizeUrl(input);
    expect(result).toBe(''); // Should be rejected
  });

  it('should allow safe protocols', () => {
    const protocols = ['http://', 'https://'];
    protocols.forEach(protocol => {
      const input = `${protocol}example.com`;
      const result = sanitizeUrl(input);
      expect(result).toBe(`${protocol}example.com`);
    });
  });

  it('should handle malformed URLs by adding https', () => {
    const input = 'example.com';
    const result = sanitizeUrl(input);
    expect(result).toBe('https://example.com'); // Should add https://
  });
});

describe('HTML Escaping', () => {
  it('should escape dangerous HTML characters', () => {
    const input = '<script>alert("xss")</script>';
    const result = escapeHtml(input);
    expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
  });

  it('should escape quotes', () => {
    const input = '"double" and \'single\' quotes';
    const result = escapeHtml(input);
    expect(result).toBe('&quot;double&quot; and &#x27;single&#x27; quotes');
  });

  it('should escape angle brackets', () => {
    const input = '<tag>content</tag>';
    const result = escapeHtml(input);
    expect(result).toBe('&lt;tag&gt;content&lt;&#x2F;tag&gt;');
  });

  it('should escape ampersands', () => {
    const input = 'Tom & Jerry';
    const result = escapeHtml(input);
    expect(result).toBe('Tom &amp; Jerry');
  });

  it('should handle empty strings', () => {
    const input = '';
    const result = escapeHtml(input);
    expect(result).toBe('');
  });

  it('should handle normal text without changes except ampersands', () => {
    const input = 'Normal text with & ampersand';
    const result = escapeHtml(input);
    expect(result).toBe('Normal text with &amp; ampersand');
  });

  it('should handle complex XSS attempts', () => {
    const inputs = [
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<a href="javascript:alert(1)">Click me</a>',
    ];

    inputs.forEach(input => {
      const result = escapeHtml(input);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });
  });
});

describe('Sanitization Edge Cases', () => {
  it('should handle null and undefined values', () => {
    const functions = [sanitizeTextField, sanitizePassword, sanitizeNotes, sanitizeUrl, escapeHtml];

    functions.forEach(func => {
      expect(func(null as unknown)).toBeDefined();
      expect(func(undefined as unknown)).toBeDefined();
    });
  });

  it('should handle non-string inputs', () => {
    const functions = [sanitizeTextField, sanitizePassword, sanitizeNotes, sanitizeUrl, escapeHtml];

    const inputs = [123, {}, [], true, false];

    functions.forEach(func => {
      inputs.forEach(input => {
        // Test with various non-string types to ensure functions handle them gracefully
        const result = func(input as unknown as string);
        expect(typeof result).toBe('string');
      });
    });
  });

  it('should handle strings with null characters', () => {
    const input = 'text\x00with\x00nulls';
    const result = sanitizeTextField(input);
    expect(result).not.toContain('\x00');
  });

  it('should handle strings with control characters', () => {
    const input = 'text\x00\x01\x02\x03with\x04control\x05chars';
    const result = sanitizePassword(input);
    expect(result).toBe('text\x01\x02\x03with\x04control\x05chars'); // Only null bytes removed
  });

  it('should handle very large inputs', () => {
    const largeInput = 'x'.repeat(100000);
    const result = sanitizeTextField(largeInput);

    // Should be truncated to reasonable size
    expect(result.length).toBeLessThan(100000);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle Unicode characters', () => {
    const input = 'Unicode: àáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ';
    const result = sanitizeTextField(input);
    expect(result).toBe(input); // Should preserve Unicode
  });

  it('should handle emoji', () => {
    const input = 'Emojis: 😀🎉🚀❤️🔥';
    const result = sanitizeTextField(input);
    expect(result).toBe(input); // Should preserve emoji
  });
});

describe('sanitizePasswordEntry', () => {
  it('should sanitize all fields in password entry', () => {
    const entry = {
      accountName: '  Test Account  ',
      username: 'user@example.com',
      password: 'P@ssw0rd!',
      website: 'example.com',
      category: 'Banking',
      notes: 'Important account',
      balance: '$1,000.00',
    };

    const sanitized = sanitizePasswordEntry(entry);

    expect(sanitized.accountName).toBe('Test Account');
    expect(sanitized.username).toBe('user@example.com');
    expect(sanitized.password).toBe('P@ssw0rd!');
    expect(sanitized.website).toBe('https://example.com');
    expect(sanitized.category).toBe('Banking');
    expect(sanitized.notes).toBe('Important account');
    expect(sanitized.balance).toBe('$1,000.00');
  });

  it('should handle optional fields', () => {
    const entry = {
      accountName: 'Test',
      username: 'user',
      password: 'pass',
      category: 'Other',
    };

    const sanitized = sanitizePasswordEntry(entry);

    expect(sanitized.website).toBeUndefined();
    expect(sanitized.notes).toBeUndefined();
    expect(sanitized.balance).toBeUndefined();
  });

  it('should sanitize dangerous URLs', () => {
    const entry = {
      accountName: 'Test',
      username: 'user',
      password: 'pass',
      website: 'javascript:alert("xss")',
      category: 'Other',
    };

    const sanitized = sanitizePasswordEntry(entry);

    expect(sanitized.website).toBe('');
  });

  it('should limit field lengths', () => {
    const entry = {
      accountName: 'a'.repeat(300),
      username: 'b'.repeat(300),
      password: 'c'.repeat(300),
      category: 'd'.repeat(100),
      notes: 'e'.repeat(6000),
      balance: 'f'.repeat(200),
    };

    const sanitized = sanitizePasswordEntry(entry);

    expect(sanitized.accountName.length).toBeLessThanOrEqual(200);
    expect(sanitized.username.length).toBeLessThanOrEqual(200);
    expect(sanitized.password.length).toBeLessThanOrEqual(256);
    expect(sanitized.category.length).toBeLessThanOrEqual(50);
    expect(sanitized.notes!.length).toBeLessThanOrEqual(5000);
    expect(sanitized.balance!.length).toBeLessThanOrEqual(100);
  });
});

describe('containsDangerousContent', () => {
  it('should detect script tags', () => {
    expect(containsDangerousContent('<script>alert("xss")</script>')).toBe(true);
    expect(containsDangerousContent('<SCRIPT>alert("xss")</SCRIPT>')).toBe(true);
  });

  it('should detect javascript: protocol', () => {
    expect(containsDangerousContent('javascript:alert("xss")')).toBe(true);
    expect(containsDangerousContent('JAVASCRIPT:alert("xss")')).toBe(true);
  });

  it('should detect event handlers', () => {
    expect(containsDangerousContent('onclick="alert(1)"')).toBe(true);
    expect(containsDangerousContent('onerror=alert(1)')).toBe(true);
    expect(containsDangerousContent('onload="alert(1)"')).toBe(true);
  });

  it('should detect data: URLs', () => {
    expect(containsDangerousContent('data:text/html,<script>alert(1)</script>')).toBe(true);
  });

  it('should detect vbscript: protocol', () => {
    expect(containsDangerousContent('vbscript:alert("xss")')).toBe(true);
  });

  it('should return false for safe content', () => {
    expect(containsDangerousContent('Normal text')).toBe(false);
    expect(containsDangerousContent('https://example.com')).toBe(false);
    expect(containsDangerousContent('<div>Safe HTML</div>')).toBe(false);
  });

  it('should handle empty strings', () => {
    expect(containsDangerousContent('')).toBe(false);
  });

  it('should handle null/undefined', () => {
    expect(containsDangerousContent(null as unknown as string)).toBe(false);
    expect(containsDangerousContent(undefined as unknown as string)).toBe(false);
  });
});
