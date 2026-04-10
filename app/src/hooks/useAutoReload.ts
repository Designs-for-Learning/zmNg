/**
 * useAutoReload Hook
 *
 * Reloads the page when network connectivity is restored after being offline.
 * Intended for kiosk deployments where no one is present to manually refresh.
 * Controlled by the autoReloadOnReconnect profile setting.
 */

import { useEffect, useRef } from 'react';
import { log, LogLevel } from '../lib/logger';

export function useAutoReload(enabled: boolean): void {
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const handleOffline = () => {
      wasOffline.current = true;
      log.app('Network lost, will reload when restored', LogLevel.WARN);
    };

    const handleOnline = () => {
      if (!wasOffline.current) return;
      wasOffline.current = false;
      log.app('Network restored, reloading page', LogLevel.INFO);
      // Short delay to let DNS/routing stabilize
      setTimeout(() => window.location.reload(), 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled]);
}
