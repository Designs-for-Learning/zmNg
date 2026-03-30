/**
 * Managed Configuration Provisioning
 *
 * Handles auto-provisioning of profiles from Chrome managed config
 * (pushed via Google Admin Console for Chromebook kiosk deployments).
 *
 * Strategy: admin config wins on first apply, then local changes are preserved.
 * If the admin pushes updated config (hash changes), server URL, credentials,
 * and kiosk settings are re-applied but user preferences are not touched.
 */

import type { ManagedConfig } from '../lib/managed-config';
import { getManagedConfigHash } from '../lib/managed-config';
import { log, LogLevel } from '../lib/logger';
import { storePin } from '../lib/kioskPin';

const MANAGED_PROFILE_KEY = 'zmng-managed-profile-id';
const MANAGED_CONFIG_HASH_KEY = 'zmng-managed-config-hash';

/** Get the profile ID created by managed config, if any */
export function getManagedProfileId(): string | null {
  return localStorage.getItem(MANAGED_PROFILE_KEY);
}

/** Check if managed config has changed since last provisioning */
async function hasConfigChanged(config: ManagedConfig): Promise<boolean> {
  const currentHash = await getManagedConfigHash(config);
  const storedHash = localStorage.getItem(MANAGED_CONFIG_HASH_KEY);
  return currentHash !== storedHash;
}

/** Save the hash of the applied config */
async function saveConfigHash(config: ManagedConfig): Promise<void> {
  const hash = await getManagedConfigHash(config);
  localStorage.setItem(MANAGED_CONFIG_HASH_KEY, hash);
}

/**
 * Build the portal/API/CGI URLs from a server URL.
 * Follows the same pattern as ProfileForm.
 */
function buildUrls(serverUrl: string) {
  const base = serverUrl.replace(/\/+$/, '');
  return {
    portalUrl: base + '/zm',
    apiUrl: base + '/zm/api',
    cgiUrl: base + '/zm/cgi-bin',
  };
}

/**
 * Apply managed configuration: create or update a profile from admin-pushed config.
 * Returns the profile ID that was created or updated.
 */
export async function applyManagedConfig(config: ManagedConfig): Promise<string | null> {
  const changed = await hasConfigChanged(config);
  const existingProfileId = getManagedProfileId();

  if (!changed && existingProfileId) {
    log.managedConfig('Config unchanged, skipping provisioning', LogLevel.DEBUG);
    return existingProfileId;
  }

  log.managedConfig('Applying managed config', LogLevel.INFO, {
    serverUrl: config.serverUrl,
    isUpdate: !!existingProfileId,
  });

  try {
    const { useProfileStore } = await import('../stores/profile');
    const { useSettingsStore } = await import('../stores/settings');
    const urls = buildUrls(config.serverUrl);
    let profileId: string;

    if (existingProfileId) {
      // Update existing managed profile
      const store = useProfileStore.getState();
      const existing = store.profiles.find((p) => p.id === existingProfileId);

      if (existing) {
        await store.updateProfile(existingProfileId, {
          name: config.profileName || existing.name,
          ...urls,
          username: config.username ?? existing.username,
          password: config.password ?? existing.password,
        });
        profileId = existingProfileId;
        log.managedConfig('Updated managed profile', LogLevel.INFO, { profileId });
      } else {
        // Profile was deleted — re-create
        profileId = await createManagedProfile(config, urls);
      }
    } else {
      profileId = await createManagedProfile(config, urls);
    }

    // Apply settings
    const settingsStore = useSettingsStore.getState();
    const updates: Record<string, unknown> = {};

    if (config.defaultPage) updates.defaultPage = config.defaultPage;
    if (config.kioskNavigationLock !== undefined) updates.kioskNavigationLock = config.kioskNavigationLock;
    if (config.allowSelfSignedCerts !== undefined) updates.allowSelfSignedCerts = config.allowSelfSignedCerts;

    // Montage settings
    if (config.montageGridRows !== undefined) updates.montageGridRows = config.montageGridRows;
    if (config.montageGridCols !== undefined) updates.montageGridCols = config.montageGridCols;
    if (config.montageFeedFit) updates.montageFeedFit = config.montageFeedFit;
    if (config.montageShowToolbar !== undefined) updates.montageShowToolbar = config.montageShowToolbar;
    if (config.montageIsFullscreen !== undefined) updates.montageIsFullscreen = config.montageIsFullscreen;

    // Streaming settings
    if (config.viewMode) updates.viewMode = config.viewMode;
    if (config.streamingMethod) updates.streamingMethod = config.streamingMethod;
    if (config.snapshotRefreshInterval !== undefined) updates.snapshotRefreshInterval = config.snapshotRefreshInterval;
    if (config.streamMaxFps !== undefined) updates.streamMaxFps = config.streamMaxFps;
    if (config.streamScale !== undefined) updates.streamScale = config.streamScale;

    // Monitor filter
    if (config.selectedGroupId !== undefined) updates.selectedGroupId = config.selectedGroupId;

    // Display
    if (config.insomnia !== undefined) updates.insomnia = config.insomnia;

    if (Object.keys(updates).length > 0) {
      settingsStore.updateProfileSettings(profileId, updates);
    }

    // Store kiosk PIN if provided
    if (config.kioskPin) {
      await storePin(config.kioskPin);
      log.managedConfig('Kiosk PIN set from managed config', LogLevel.INFO);
    }

    // Ensure this profile is current
    const profileStore = useProfileStore.getState();
    if (profileStore.currentProfileId !== profileId) {
      await profileStore.switchProfile(profileId);
    }

    // Save state
    localStorage.setItem(MANAGED_PROFILE_KEY, profileId);
    await saveConfigHash(config);

    log.managedConfig('Managed config applied', LogLevel.INFO, { profileId });
    return profileId;
  } catch (error) {
    log.managedConfig('Failed to apply managed config', LogLevel.ERROR, { error });
    return null;
  }
}

async function createManagedProfile(
  config: ManagedConfig,
  urls: { portalUrl: string; apiUrl: string; cgiUrl: string }
): Promise<string> {
  const { useProfileStore } = await import('../stores/profile');

  const profileId = await useProfileStore.getState().addProfile({
    name: config.profileName || 'Managed Profile',
    ...urls,
    username: config.username,
    password: config.password,
    isDefault: true,
  });

  localStorage.setItem(MANAGED_PROFILE_KEY, profileId);
  log.managedConfig('Created managed profile', LogLevel.INFO, { profileId });
  return profileId;
}
