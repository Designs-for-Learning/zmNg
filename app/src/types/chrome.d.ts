/**
 * Minimal Chrome Extension API types for managed configuration.
 * Only declares what zmNinjaNG uses (chrome.storage.managed).
 */

declare namespace chrome {
  namespace storage {
    interface StorageArea {
      get(keys: string | string[] | null): Promise<Record<string, unknown>>;
      onChanged: {
        addListener(callback: (changes: Record<string, unknown>) => void): void;
        removeListener(callback: (changes: Record<string, unknown>) => void): void;
      };
    }

    const managed: StorageArea;
  }
}
