/**
 * Jest Setup File
 * 
 * Configures the testing environment.
 */

// Polyfill TextEncoder/TextDecoder for Node.js
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Mock Vite's import.meta.env for Jest
// Since import.meta is a special syntax, we need to define it globally
// This will be used by a custom transformer or babel plugin
(globalThis as any).__VITE_IMPORT_META_ENV__ = {
  DEV: true,
  PROD: false,
  MODE: 'test',
  VITE_APP_VERSION: '1.2.0',
  VITE_LICENSE_SIGNING_SECRET: 'test-secret',
  VITE_USE_STRICT_PERFORMANCE: 'false',
};

// Extend Window interface for Jest
declare global {
  interface Window {
    electronAPI?: {
      saveVaultEncrypted?: (data: string) => Promise<boolean>;
      loadVaultEncrypted?: () => Promise<string | null>;
      [key: string]: unknown;
    };
  }
}

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

// Mock navigator.clipboard (configurable for userEvent)
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
  writable: true,
  configurable: true,
});

// Mock window.electronAPI (undefined by default, tests can override)
Object.defineProperty(window, 'electronAPI', {
  value: undefined,
  writable: true,
});

// Mock WebGL for device fingerprint tests
const mockWebGLRenderingContext = {
  getParameter: jest.fn((param: number) => {
    if (param === 0x1F00) return 'OpenGL ES 2.0'; // VERSION
    if (param === 0x8B8C) return 'WebGL GLSL ES 1.0'; // SHADING_LANGUAGE_VERSION
    return null;
  }),
  getExtension: jest.fn((name: string) => {
    if (name === 'WEBGL_debug_renderer_info') {
      return {
        UNMASKED_VENDOR_WEBGL: 0x9245,
        UNMASKED_RENDERER_WEBGL: 0x9246,
      };
    }
    return null;
  }),
};

HTMLCanvasElement.prototype.getContext = jest.fn((contextType: string) => {
  if (contextType === 'webgl' || contextType === 'experimental-webgl') {
    return mockWebGLRenderingContext as any;
  }
  return null;
});

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({}),
});

// Suppress console errors during tests (optional, comment out for debugging)
// console.error = jest.fn();
// console.warn = jest.fn();

// Import jest-dom matchers
import '@testing-library/jest-dom';

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
});

