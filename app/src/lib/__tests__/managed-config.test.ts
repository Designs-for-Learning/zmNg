import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isManagedConfigAvailable,
  getManagedConfig,
  getManagedConfigHash,
} from '../managed-config';

// Mock logger
vi.mock('../logger', () => ({
  log: {
    managedConfig: vi.fn(),
  },
  LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 },
}));

/** Helper to build a chrome.storage.managed mock */
function mockChromeManagedStorage(getResult: unknown) {
  const onChanged = { addListener: vi.fn(), removeListener: vi.fn() };
  globalThis.chrome = {
    storage: {
      managed: {
        get: typeof getResult === 'function'
          ? getResult
          : vi.fn().mockResolvedValue(getResult),
        onChanged,
      },
    },
  } as unknown as typeof chrome;
}

describe('managed-config', () => {
  const originalChrome = (globalThis as Record<string, unknown>).chrome;

  afterEach(() => {
    if (originalChrome) {
      (globalThis as Record<string, unknown>).chrome = originalChrome;
    } else {
      delete (globalThis as Record<string, unknown>).chrome;
    }
  });

  describe('isManagedConfigAvailable', () => {
    it('returns false when chrome is not defined', () => {
      delete (globalThis as Record<string, unknown>).chrome;
      expect(isManagedConfigAvailable()).toBe(false);
    });

    it('returns false when chrome.storage is not defined', () => {
      (globalThis as Record<string, unknown>).chrome = {};
      expect(isManagedConfigAvailable()).toBe(false);
    });

    it('returns false when chrome.storage.managed is not defined', () => {
      (globalThis as Record<string, unknown>).chrome = { storage: {} };
      expect(isManagedConfigAvailable()).toBe(false);
    });

    it('returns true when chrome.storage.managed exists', () => {
      mockChromeManagedStorage({});
      expect(isManagedConfigAvailable()).toBe(true);
    });
  });

  describe('getManagedConfig', () => {
    it('returns null when chrome API is unavailable', async () => {
      delete (globalThis as Record<string, unknown>).chrome;
      expect(await getManagedConfig()).toBeNull();
    });

    it('returns null when storage is empty', async () => {
      mockChromeManagedStorage({});
      expect(await getManagedConfig()).toBeNull();
    });

    it('returns null when serverUrl is missing', async () => {
      mockChromeManagedStorage({ username: 'admin' });
      expect(await getManagedConfig()).toBeNull();
    });

    it('returns config when serverUrl is present', async () => {
      mockChromeManagedStorage({
        serverUrl: 'https://zm.example.com',
        username: 'admin',
        password: 'secret',
        defaultPage: '/montage',
      });

      const config = await getManagedConfig();
      expect(config).toEqual({
        serverUrl: 'https://zm.example.com',
        username: 'admin',
        password: 'secret',
        defaultPage: '/montage',
        profileName: undefined,
        kioskMode: undefined,
        kioskPin: undefined,
        kioskNavigationLock: undefined,
        allowSelfSignedCerts: undefined,
      });
    });

    it('rejects invalid defaultPage values', async () => {
      mockChromeManagedStorage({
        serverUrl: 'https://zm.example.com',
        defaultPage: '/invalid-page',
      });

      const config = await getManagedConfig();
      expect(config?.defaultPage).toBeUndefined();
    });

    it('returns null on chrome API error', async () => {
      mockChromeManagedStorage(vi.fn().mockRejectedValue(new Error('Policy not set')));
      expect(await getManagedConfig()).toBeNull();
    });
  });

  describe('getManagedConfigHash', () => {
    it('produces consistent hash for same config', async () => {
      const config = { serverUrl: 'https://zm.example.com', username: 'admin' };
      const hash1 = await getManagedConfigHash(config as Parameters<typeof getManagedConfigHash>[0]);
      const hash2 = await getManagedConfigHash(config as Parameters<typeof getManagedConfigHash>[0]);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex
    });

    it('produces different hash for different config', async () => {
      const hash1 = await getManagedConfigHash({ serverUrl: 'https://a.com' } as Parameters<typeof getManagedConfigHash>[0]);
      const hash2 = await getManagedConfigHash({ serverUrl: 'https://b.com' } as Parameters<typeof getManagedConfigHash>[0]);
      expect(hash1).not.toBe(hash2);
    });
  });
});
