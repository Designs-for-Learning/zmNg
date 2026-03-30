import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getManagedProfileId, applyManagedConfig } from '../managed-provisioning';
import type { ManagedConfig } from '../../lib/managed-config';

// Mock dependencies
vi.mock('../../lib/logger', () => ({
  log: { managedConfig: vi.fn() },
  LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 },
}));

vi.mock('../../lib/kioskPin', () => ({
  storePin: vi.fn(),
}));

const mockAddProfile = vi.fn().mockResolvedValue('mock-profile-id');
const mockUpdateProfile = vi.fn();
const mockSwitchProfile = vi.fn();
const mockUpdateProfileSettings = vi.fn();

vi.mock('../../stores/profile', () => ({
  useProfileStore: {
    getState: () => ({
      profiles: [],
      currentProfileId: null,
      addProfile: mockAddProfile,
      updateProfile: mockUpdateProfile,
      switchProfile: mockSwitchProfile,
    }),
  },
}));

vi.mock('../../stores/settings', () => ({
  useSettingsStore: {
    getState: () => ({
      updateProfileSettings: mockUpdateProfileSettings,
    }),
  },
}));

describe('managed-provisioning', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('getManagedProfileId', () => {
    it('returns null when no managed profile exists', () => {
      expect(getManagedProfileId()).toBeNull();
    });

    it('returns stored profile ID', () => {
      localStorage.setItem('zmng-managed-profile-id', 'test-id');
      expect(getManagedProfileId()).toBe('test-id');
    });
  });

  describe('applyManagedConfig', () => {
    const baseConfig: ManagedConfig = {
      serverUrl: 'https://zm.example.com',
      username: 'admin',
      password: 'secret',
      profileName: 'Office Cameras',
      defaultPage: '/montage',
    };

    it('creates a new profile from managed config', async () => {
      const profileId = await applyManagedConfig(baseConfig);

      expect(profileId).toBe('mock-profile-id');
      expect(mockAddProfile).toHaveBeenCalledWith({
        name: 'Office Cameras',
        portalUrl: 'https://zm.example.com/zm',
        apiUrl: 'https://zm.example.com/zm/api',
        cgiUrl: 'https://zm.example.com/zm/cgi-bin',
        username: 'admin',
        password: 'secret',
        isDefault: true,
      });
      expect(localStorage.getItem('zmng-managed-profile-id')).toBe('mock-profile-id');
    });

    it('applies settings from managed config', async () => {
      await applyManagedConfig({
        ...baseConfig,
        kioskNavigationLock: true,
        allowSelfSignedCerts: true,
      });

      expect(mockUpdateProfileSettings).toHaveBeenCalledWith('mock-profile-id', {
        defaultPage: '/montage',
        kioskNavigationLock: true,
        allowSelfSignedCerts: true,
      });
    });

    it('stores kiosk PIN when provided', async () => {
      const { storePin } = await import('../../lib/kioskPin');
      await applyManagedConfig({ ...baseConfig, kioskPin: '1234' });
      expect(storePin).toHaveBeenCalledWith('1234');
    });

    it('uses default profile name when not provided', async () => {
      await applyManagedConfig({
        serverUrl: 'https://zm.example.com',
      });

      expect(mockAddProfile).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Managed Profile' })
      );
    });

    it('skips provisioning when config hash is unchanged', async () => {
      // First apply
      await applyManagedConfig(baseConfig);
      vi.clearAllMocks();

      // Second apply with same config
      const profileId = await applyManagedConfig(baseConfig);

      expect(profileId).toBe('mock-profile-id');
      expect(mockAddProfile).not.toHaveBeenCalled();
    });
  });
});
