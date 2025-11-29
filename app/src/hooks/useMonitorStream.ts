import { useState, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Capacitor } from '@capacitor/core';
import { isTauri } from '@tauri-apps/api/core';
import { getStreamUrl } from '../api/monitors';
import { getApiClient } from '../api/client';
import { useMonitorStore } from '../stores/monitors';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { ZM_CONSTANTS } from '../lib/constants';
import { log } from '../lib/logger';
import type { StreamOptions } from '../api/types';

interface UseMonitorStreamOptions {
  monitorId: string;
  streamOptions?: Partial<StreamOptions>;
}

interface UseMonitorStreamReturn {
  streamUrl: string;
  displayedImageUrl: string;
  imgRef: React.RefObject<HTMLImageElement | null>;
  regenerateConnection: () => void;
}

/**
 * Custom hook for managing monitor stream URLs and connections
 * Handles connection keys, cache busting, and periodic refreshes for snapshot mode
 */
export function useMonitorStream({
  monitorId,
  streamOptions = {},
}: UseMonitorStreamOptions): UseMonitorStreamReturn {
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const accessToken = useAuthStore((state) => state.accessToken);
  const settings = useSettingsStore(
    useShallow((state) => state.getProfileSettings(currentProfile?.id || ''))
  );
  const regenerateConnKey = useMonitorStore((state) => state.regenerateConnKey);

  const [connKey, setConnKey] = useState(0);
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const [displayedImageUrl, setDisplayedImageUrl] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  // Regenerate connKey on mount and when monitor changes
  useEffect(() => {
    log.monitor(`Regenerating connkey for monitor ${monitorId}`);
    const newKey = regenerateConnKey(monitorId);
    setConnKey(newKey);
    setCacheBuster(Date.now());
  }, [monitorId, regenerateConnKey]);

  // Snapshot mode: periodic refresh
  useEffect(() => {
    if (settings.viewMode !== 'snapshot') return;

    const interval = setInterval(() => {
      setCacheBuster(Date.now());
    }, settings.snapshotRefreshInterval * 1000);

    return () => clearInterval(interval);
  }, [settings.viewMode, settings.snapshotRefreshInterval]);

  // Cleanup: abort image loading on unmount to release connection
  useEffect(() => {
    const currentImg = imgRef.current;
    return () => {
      if (currentImg) {
        log.monitor(`Cleaning up stream for monitor ${monitorId}`);
        // Set to empty data URI to abort the connection
        currentImg.src =
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      }
    };
  }, [monitorId]);

  // Build stream URL
  const streamUrl = currentProfile
    ? getStreamUrl(currentProfile.cgiUrl, monitorId, {
      mode: settings.viewMode === 'snapshot' ? 'single' : 'jpeg',
      scale: ZM_CONSTANTS.monitorStreamScale,
      maxfps:
        settings.viewMode === 'streaming'
          ? ZM_CONSTANTS.streamMaxFPS
          : undefined,
      token: accessToken || undefined,
      connkey: connKey,
      cacheBuster: cacheBuster,
      ...streamOptions,
    })
    : '';

  // Preload images in snapshot mode to avoid flickering
  useEffect(() => {
    // In streaming mode or if no URL, just use the streamUrl directly
    if (settings.viewMode !== 'snapshot') {
      setDisplayedImageUrl(streamUrl);
      return;
    }

    // In snapshot mode, preload the image to avoid flickering
    if (!streamUrl) {
      setDisplayedImageUrl('');
      return;
    }

    const isNative = Capacitor.isNativePlatform();
    const isTauriApp = isTauri();

    // If we are on a native platform or Tauri, we need to fetch the image as a blob
    // to bypass CORS restrictions that might apply to <img> tags
    if (isNative || isTauriApp) {
      let isMounted = true;
      
      const fetchImage = async () => {
        try {
          const client = getApiClient();
          // We use the API client which is configured to use the native/Tauri HTTP client
          // This bypasses CORS
          const response = await client.get(streamUrl, { 
            responseType: 'blob',
            // Ensure we don't append the token again if it's already in the URL
            // (getStreamUrl adds it, but client interceptor might add it too)
            // Actually client interceptor adds it if not present, but streamUrl has it.
            // The interceptor checks if token is in params/data.
            // Since we are passing a full URL, we should be careful.
            // But client.get(url) treats url as path if it doesn't start with http.
            // streamUrl starts with http.
          });
          
          if (isMounted && response.data) {
            const blob = response.data as Blob;
            const objectUrl = URL.createObjectURL(blob);
            setDisplayedImageUrl((prev) => {
              // Revoke previous URL to avoid memory leaks
              if (prev && prev.startsWith('blob:')) {
                URL.revokeObjectURL(prev);
              }
              return objectUrl;
            });
          }
        } catch (error) {
          console.error('Failed to fetch snapshot image:', error);
          // Fallback to direct URL if fetch fails
          if (isMounted) setDisplayedImageUrl(streamUrl);
        }
      };

      fetchImage();

      return () => {
        isMounted = false;
      };
    } else {
      // Web mode - standard image preloading
      const img = new Image();
      img.onload = () => {
        // Only update the displayed URL when the new image is fully loaded
        setDisplayedImageUrl(streamUrl);
      };
      img.onerror = () => {
        // On error, still update to trigger the error handler
        setDisplayedImageUrl(streamUrl);
      };
      img.src = streamUrl;
    }
  }, [streamUrl, settings.viewMode]);

  const regenerateConnection = () => {
    log.monitor(`Manually regenerating connection for monitor ${monitorId}`);
    const newKey = regenerateConnKey(monitorId);
    setConnKey(newKey);
    setCacheBuster(Date.now());
  };

  return {
    streamUrl,
    displayedImageUrl,
    imgRef,
    regenerateConnection,
  };
}
