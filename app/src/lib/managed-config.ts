/**
 * Managed Configuration Reader
 *
 * Reads configuration injected by the zmNinjaNG Kiosk Config Chrome Extension.
 * The extension reads chrome.storage.managed (set by Google Admin Console)
 * and relays it to the web app via localStorage and a CustomEvent.
 *
 * Flow: Google Admin → chrome.storage.managed → Extension → localStorage/event → App
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

const STORAGE_KEY = 'zmng-managed-config';
const EVENT_NAME = 'zmng-managed-config';
const VALID_DEFAULT_PAGES = ['/montage', '/monitors', '/events', '/dashboard', '/timeline'];

/** Check if managed config has been injected by the companion extension */
export function isManagedConfigAvailable(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Parse and validate raw config data into a ManagedConfig */
function parseConfig(items: Record<string, unknown>): ManagedConfig | null {
  if (!items || Object.keys(items).length === 0) {
    log.managedConfig('No managed config found', LogLevel.DEBUG);
    return null;
  }

  if (!items.serverUrl || typeof items.serverUrl !== 'string') {
    log.managedConfig('Managed config missing serverUrl', LogLevel.WARN);
    return null;
  }

  // Validate defaultPage if provided
  let defaultPage = items.defaultPage as string | undefined;
  if (defaultPage && !VALID_DEFAULT_PAGES.includes(defaultPage)) {
    log.managedConfig('Invalid defaultPage in managed config', LogLevel.WARN, {
      defaultPage,
      valid: VALID_DEFAULT_PAGES,
    });
    defaultPage = undefined;
  }

  const config: ManagedConfig = {
    serverUrl: items.serverUrl as string,
    username: items.username as string | undefined,
    password: items.password as string | undefined,
    profileName: items.profileName as string | undefined,
    defaultPage,
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
}

/** Read managed config from localStorage (written by companion extension) */
export async function getManagedConfig(): Promise<ManagedConfig | null> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const items = JSON.parse(stored) as Record<string, unknown>;
    return parseConfig(items);
  } catch (error) {
    log.managedConfig('Failed to read managed config', LogLevel.ERROR, { error });
    return null;
  }
}

/**
 * Listen for managed config changes pushed by admin (via companion extension).
 * The extension dispatches a CustomEvent when config changes.
 * Returns an unsubscribe function.
 */
export function onManagedConfigChanged(
  callback: (config: ManagedConfig | null) => void
): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail as Record<string, unknown>;
    callback(parseConfig(detail));
  };

  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
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
