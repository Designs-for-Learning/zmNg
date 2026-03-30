import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isManagedConfigAvailable,
  getManagedConfig,
  getManagedConfigHash,
} from '../managed-config';

vi.mock('../logger', () => ({
  log: { managedConfig: vi.fn() },
  LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 },
}));

/** Mock navigator.managed API */
function mockNavigatorManaged(result: Record<string, unknown> | Error) {
  Object.defineProperty(navigator, 'managed', {
    value: {
      getManagedConfiguration: result instanceof Error
        ? vi.fn().mockRejectedValue(result)
        : vi.fn().mockResolvedValue(result),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
}

function clearNavigatorManaged() {
  Object.defineProperty(navigator, 'managed', {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

describe('managed-config', () => {
  afterEach(() => {
    clearNavigatorManaged();
  });

  describe('isManagedConfigAvailable', () => {
    it('returns false when navigator.managed is not available', () => {
      expect(isManagedConfigAvailable()).toBe(false);
    });

    it('returns true when navigator.managed exists', () => {
      mockNavigatorManaged({});
      expect(isManagedConfigAvailable()).toBe(true);
    });
  });

  describe('getManagedConfig', () => {
    it('returns null when navigator.managed is not available', async () => {
      expect(await getManagedConfig()).toBeNull();
    });

    it('returns null when config is empty', async () => {
      mockNavigatorManaged({});
      expect(await getManagedConfig()).toBeNull();
    });

    it('returns null when serverUrl is missing', async () => {
      mockNavigatorManaged({ username: 'admin' });
      expect(await getManagedConfig()).toBeNull();
    });

    it('returns config when serverUrl is present', async () => {
      mockNavigatorManaged({
        serverUrl: 'https://zm.example.com',
        username: 'admin',
        password: 'secret',
        defaultPage: '/montage',
      });

      const config = await getManagedConfig();
      expect(config).toMatchObject({
        serverUrl: 'https://zm.example.com',
        username: 'admin',
        password: 'secret',
        defaultPage: '/montage',
      });
    });

    it('rejects invalid defaultPage values', async () => {
      mockNavigatorManaged({
        serverUrl: 'https://zm.example.com',
        defaultPage: '/invalid-page',
      });

      const config = await getManagedConfig();
      expect(config?.defaultPage).toBeUndefined();
    });

    it('returns null on API error', async () => {
      mockNavigatorManaged(new Error('NotAllowedError'));
      expect(await getManagedConfig()).toBeNull();
    });

    it('includes montage settings', async () => {
      mockNavigatorManaged({
        serverUrl: 'https://zm.example.com',
        montageGridRows: 3,
        montageGridCols: 4,
        montageFeedFit: 'cover',
      });

      const config = await getManagedConfig();
      expect(config?.montageGridRows).toBe(3);
      expect(config?.montageGridCols).toBe(4);
      expect(config?.montageFeedFit).toBe('cover');
    });
  });

  describe('getManagedConfigHash', () => {
    it('produces consistent hash for same config', async () => {
      const config = { serverUrl: 'https://zm.example.com', username: 'admin' };
      const hash1 = await getManagedConfigHash(config as Parameters<typeof getManagedConfigHash>[0]);
      const hash2 = await getManagedConfigHash(config as Parameters<typeof getManagedConfigHash>[0]);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('produces different hash for different config', async () => {
      const hash1 = await getManagedConfigHash({ serverUrl: 'https://a.com' } as Parameters<typeof getManagedConfigHash>[0]);
      const hash2 = await getManagedConfigHash({ serverUrl: 'https://b.com' } as Parameters<typeof getManagedConfigHash>[0]);
      expect(hash1).not.toBe(hash2);
    });
  });
});
