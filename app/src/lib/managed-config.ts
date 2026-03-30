/**
 * Chrome Managed Configuration
 *
 * Reads configuration from chrome.storage.managed, which is populated
 * by Google Admin Console for managed Chromebook deployments.
 * All Chrome API access is runtime-checked — no build-time dependency.
 */

import { log, LogLevel } from './logger';

export interface ManagedConfig {
  serverUrl: string;
  username?: string;
  password?: string;
  profileName?: string;
  defaultPage?: string;
  kioskMode?: boolean;
  kioskPin?: string;
  kioskNavigationLock?: boolean;
  allowSelfSignedCerts?: boolean;
}

const VALID_DEFAULT_PAGES = ['/montage', '/monitors', '/events', '/dashboard', '/timeline'];

/** Check if chrome.storage.managed API is available at runtime */
export function isManagedConfigAvailable(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.storage !== 'undefined' &&
    typeof chrome.storage.managed !== 'undefined'
  );
}

/** Read managed configuration from Chrome storage */
export async function getManagedConfig(): Promise<ManagedConfig | null> {
  if (!isManagedConfigAvailable()) {
    return null;
  }

  try {
    const items = await chrome.storage.managed.get(null);

    if (!items || Object.keys(items).length === 0) {
      log.managedConfig('No managed config found', LogLevel.DEBUG);
      return null;
    }

    if (!items.serverUrl || typeof items.serverUrl !== 'string') {
      log.managedConfig('Managed config missing serverUrl', LogLevel.WARN);
      return null;
    }

    // Validate defaultPage if provided
    if (items.defaultPage && !VALID_DEFAULT_PAGES.includes(items.defaultPage as string)) {
      log.managedConfig('Invalid defaultPage in managed config', LogLevel.WARN, {
        defaultPage: items.defaultPage,
        valid: VALID_DEFAULT_PAGES,
      });
      items.defaultPage = undefined;
    }

    const config: ManagedConfig = {
      serverUrl: items.serverUrl as string,
      username: items.username as string | undefined,
      password: items.password as string | undefined,
      profileName: items.profileName as string | undefined,
      defaultPage: items.defaultPage as string | undefined,
      kioskMode: items.kioskMode as boolean | undefined,
      kioskPin: items.kioskPin as string | undefined,
      kioskNavigationLock: items.kioskNavigationLock as boolean | undefined,
      allowSelfSignedCerts: items.allowSelfSignedCerts as boolean | undefined,
    };

    log.managedConfig('Managed config loaded', LogLevel.INFO, {
      serverUrl: config.serverUrl,
      hasCredentials: !!(config.username && config.password),
      defaultPage: config.defaultPage,
      kioskMode: config.kioskMode,
    });

    return config;
  } catch (error) {
    log.managedConfig('Failed to read managed config', LogLevel.ERROR, { error });
    return null;
  }
}

/**
 * Listen for managed config changes pushed by admin.
 * Returns an unsubscribe function.
 */
export function onManagedConfigChanged(
  callback: (config: ManagedConfig | null) => void
): () => void {
  if (!isManagedConfigAvailable()) {
    return () => {};
  }

  const listener = () => {
    getManagedConfig().then(callback);
  };

  chrome.storage.managed.onChanged.addListener(listener);
  return () => chrome.storage.managed.onChanged.removeListener(listener);
}

/** Compute a stable hash string for change detection */
export async function getManagedConfigHash(config: ManagedConfig): Promise<string> {
  const serialized = JSON.stringify({
    serverUrl: config.serverUrl,
    username: config.username,
    password: config.password,
    profileName: config.profileName,
    defaultPage: config.defaultPage,
    kioskMode: config.kioskMode,
    kioskPin: config.kioskPin,
    kioskNavigationLock: config.kioskNavigationLock,
    allowSelfSignedCerts: config.allowSelfSignedCerts,
  });

  const data = new TextEncoder().encode(serialized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
