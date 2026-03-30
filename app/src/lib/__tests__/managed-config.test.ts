import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isManagedConfigAvailable,
  getManagedConfig,
  getManagedConfigHash,
  onManagedConfigChanged,
} from '../managed-config';

vi.mock('../logger', () => ({
  log: { managedConfig: vi.fn() },
  LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 },
}));

describe('managed-config', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('isManagedConfigAvailable', () => {
    it('returns false when no config in localStorage', () => {
      expect(isManagedConfigAvailable()).toBe(false);
    });

    it('returns true when config exists in localStorage', () => {
      localStorage.setItem('zmng-managed-config', '{"serverUrl":"https://zm.test"}');
      expect(isManagedConfigAvailable()).toBe(true);
    });
  });

  describe('getManagedConfig', () => {
    it('returns null when no config stored', async () => {
      expect(await getManagedConfig()).toBeNull();
    });

    it('returns null when stored config is empty object', async () => {
      localStorage.setItem('zmng-managed-config', '{}');
      expect(await getManagedConfig()).toBeNull();
    });

    it('returns null when serverUrl is missing', async () => {
      localStorage.setItem('zmng-managed-config', '{"username":"admin"}');
      expect(await getManagedConfig()).toBeNull();
    });

    it('returns config when serverUrl is present', async () => {
      localStorage.setItem('zmng-managed-config', JSON.stringify({
        serverUrl: 'https://zm.example.com',
        username: 'admin',
        password: 'secret',
        defaultPage: '/montage',
      }));

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
      localStorage.setItem('zmng-managed-config', JSON.stringify({
        serverUrl: 'https://zm.example.com',
        defaultPage: '/invalid-page',
      }));

      const config = await getManagedConfig();
      expect(config?.defaultPage).toBeUndefined();
    });

    it('returns null on invalid JSON', async () => {
      localStorage.setItem('zmng-managed-config', 'not-json');
      expect(await getManagedConfig()).toBeNull();
    });
  });

  describe('onManagedConfigChanged', () => {
    it('calls callback when custom event is dispatched', () => {
      const callback = vi.fn();
      const unsubscribe = onManagedConfigChanged(callback);

      window.dispatchEvent(
        new CustomEvent('zmng-managed-config', {
          detail: { serverUrl: 'https://zm.test' },
        })
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ serverUrl: 'https://zm.test' })
      );

      unsubscribe();
    });

    it('returns unsubscribe function that removes listener', () => {
      const callback = vi.fn();
      const unsubscribe = onManagedConfigChanged(callback);
      unsubscribe();

      window.dispatchEvent(
        new CustomEvent('zmng-managed-config', {
          detail: { serverUrl: 'https://zm.test' },
        })
      );

      expect(callback).not.toHaveBeenCalled();
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
