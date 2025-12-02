/**
 * Jest Setup File
 * 
 * Configures the testing environment.
 */

// Polyfill TextEncoder/TextDecoder for Node.js
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock crypto.subtle for encryption tests
const cryptoMock = {
  subtle: {
    importKey: jest.fn().mockResolvedValue({}),
    deriveKey: jest.fn().mockResolvedValue({}),
    deriveBits: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    decrypt: jest.fn().mockResolvedValue(new TextEncoder().encode('test')),
    digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
  },
  getRandomValues: <T extends ArrayBufferView | null>(array: T): T => {
    if (array) {
      const uint8 = new Uint8Array(array.buffer);
      for (let i = 0; i < uint8.length; i++) {
        uint8[i] = Math.floor(Math.random() * 256);
      }
    }
    return array;
  },
};

Object.defineProperty(window, 'crypto', {
  value: cryptoMock,
});

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
});

// Mock window.electronAPI (undefined by default, tests can override)
Object.defineProperty(window, 'electronAPI', {
  value: undefined,
  writable: true,
});

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({}),
});

// Suppress console errors during tests (optional, comment out for debugging)
// console.error = jest.fn();
// console.warn = jest.fn();

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
});

