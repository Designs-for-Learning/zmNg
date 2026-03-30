/**
 * Managed Configuration Reader
 *
 * Reads configuration set by Google Admin Console for managed Chrome OS
 * kiosk deployments via the navigator.managed API.
 *
 * Flow: Google Admin → Chrome OS policy → navigator.managed → App
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
  // Montage settings
  montageGridRows?: number;
  montageGridCols?: number;
  montageFeedFit?: string;
  montageShowToolbar?: boolean;
  montageIsFullscreen?: boolean;
  // Streaming settings
  viewMode?: string;
  streamingMethod?: string;
  snapshotRefreshInterval?: number;
  streamMaxFps?: number;
  streamScale?: number;
  // Monitor filter
  selectedGroupId?: string;
  // Display
  insomnia?: boolean;
  hideNavigation?: boolean;
}

// All keys we request from managed config
const MANAGED_KEYS = [
  'serverUrl', 'username', 'password', 'profileName', 'defaultPage',
  'kioskMode', 'kioskPin', 'kioskNavigationLock', 'allowSelfSignedCerts',
  'montageGridRows', 'montageGridCols', 'montageFeedFit', 'montageShowToolbar',
  'montageIsFullscreen', 'viewMode', 'streamingMethod', 'snapshotRefreshInterval',
  'streamMaxFps', 'streamScale', 'selectedGroupId', 'insomnia', 'hideNavigation',
];

const VALID_DEFAULT_PAGES = ['/montage', '/monitors', '/events', '/dashboard', '/timeline'];

// TypeScript declarations for navigator.managed
interface NavigatorManagedData extends EventTarget {
  getManagedConfiguration(keys: string[]): Promise<Record<string, unknown>>;
}

declare global {
  interface Navigator {
    readonly managed?: NavigatorManagedData;
  }
}

/** Check if navigator.managed API is available */
export function isManagedConfigAvailable(): boolean {
  return !!navigator.managed;
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
    montageGridRows: items.montageGridRows as number | undefined,
    montageGridCols: items.montageGridCols as number | undefined,
    montageFeedFit: items.montageFeedFit as string | undefined,
    montageShowToolbar: items.montageShowToolbar as boolean | undefined,
    montageIsFullscreen: items.montageIsFullscreen as boolean | undefined,
    viewMode: items.viewMode as string | undefined,
    streamingMethod: items.streamingMethod as string | undefined,
    snapshotRefreshInterval: items.snapshotRefreshInterval as number | undefined,
    streamMaxFps: items.streamMaxFps as number | undefined,
    streamScale: items.streamScale as number | undefined,
    selectedGroupId: items.selectedGroupId as string | undefined,
    insomnia: items.insomnia as boolean | undefined,
    hideNavigation: items.hideNavigation as boolean | undefined,
  };

  log.managedConfig('Managed config loaded', LogLevel.INFO, {
    serverUrl: config.serverUrl,
    hasCredentials: !!(config.username && config.password),
    defaultPage: config.defaultPage,
    kioskMode: config.kioskMode,
  });

  return config;
}

/** Read managed config via navigator.managed API */
export async function getManagedConfig(): Promise<ManagedConfig | null> {
  if (!navigator.managed) return null;

  try {
    const items = await navigator.managed.getManagedConfiguration(MANAGED_KEYS);
    return parseConfig(items);
  } catch (error) {
    log.managedConfig('Failed to read managed config', LogLevel.ERROR, { error });
    return null;
  }
}

/**
 * Wait for managed config to become available.
 * Returns immediately if navigator.managed is present, otherwise returns null.
 */
export function waitForManagedConfig(_timeoutMs = 2000): Promise<ManagedConfig | null> {
  return getManagedConfig();
}

/**
 * Listen for managed config changes pushed by admin.
 * Returns an unsubscribe function.
 */
export function onManagedConfigChanged(
  callback: (config: ManagedConfig | null) => void
): () => void {
  if (!navigator.managed) return () => {};

  const handler = () => {
    getManagedConfig().then(callback);
  };

  navigator.managed.addEventListener('managedconfigurationchange', handler);
  return () => navigator.managed?.removeEventListener('managedconfigurationchange', handler);
}

/** Compute a stable hash string for change detection */
export async function getManagedConfigHash(config: ManagedConfig): Promise<string> {
  const serialized = JSON.stringify(config);
  const data = new TextEncoder().encode(serialized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
