/**
 * Insomnia Hook
 *
 * Prevents the screen from dimming or going to sleep using the Wake Lock API.
 * Useful for monitor viewing pages where continuous display is needed.
 */

import { useEffect, useRef } from 'react';
import { log, LogLevel } from '../lib/logger';

interface UseInsomniaOptions {
  enabled: boolean;
}

/**
 * Hook to prevent screen from sleeping when enabled.
 *
 * Uses the Screen Wake Lock API available in modern browsers and mobile webviews.
 * Automatically handles visibility changes and page lifecycle.
 *
 * @param options.enabled - Whether to keep the screen awake
 */
export const useInsomnia = ({ enabled }: UseInsomniaOptions) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    // Check if Wake Lock API is supported
    if (!('wakeLock' in navigator)) {
      log.monitor('Wake Lock API not supported in this browser', LogLevel.WARN);
      return;
    }

    const requestWakeLock = async () => {
      try {
        // Request a screen wake lock
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        log.monitor('Screen wake lock activated (Insomnia enabled)', LogLevel.DEBUG);

        // Listen for wake lock release
        wakeLockRef.current.addEventListener('release', () => {
          log.monitor('Screen wake lock released', LogLevel.DEBUG);
        });
      } catch (err) {
        log.monitor('Failed to acquire wake lock', LogLevel.ERROR, { error: err });
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
          log.monitor('Screen wake lock released (Insomnia disabled)', LogLevel.DEBUG);
        } catch (err) {
          log.monitor('Failed to release wake lock', LogLevel.ERROR, { error: err });
        }
      }
    };

    // Handle visibility change - reacquire wake lock when page becomes visible
    const handleVisibilityChange = () => {
      if (enabled && document.visibilityState === 'visible' && !wakeLockRef.current) {
        requestWakeLock();
      }
    };

    if (enabled) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } else {
      releaseWakeLock();
    }

    // Cleanup on unmount or when enabled changes
    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);

  return {
    isSupported: 'wakeLock' in navigator,
  };
};
