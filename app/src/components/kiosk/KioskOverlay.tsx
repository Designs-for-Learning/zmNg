/**
 * Kiosk Overlay
 *
 * Full-screen transparent overlay that blocks all interaction when kiosk mode is active.
 * The current view continues to live-update underneath.
 * Only the unlock button (bottom-right) is interactive.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LockOpen } from 'lucide-react';
import { useKioskStore } from '../../stores/kioskStore';
import { verifyPin } from '../../lib/kioskPin';
import { checkBiometricAvailability, authenticateWithBiometrics } from '../../hooks/useBiometricAuth';
import { PinPad } from './PinPad';
import { useToast } from '../../hooks/use-toast';
import { log, LogLevel } from '../../lib/logger';

interface KioskOverlayProps {
  onUnlock: () => void;
}

export function KioskOverlay({ onUnlock }: KioskOverlayProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isLocked, unlock, recordFailedAttempt, isCoolingDown, cooldownUntil } = useKioskStore();
  const [showPinPad, setShowPinPad] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownSeconds(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSeconds(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  // Block back button / back gesture while locked
  useEffect(() => {
    if (!isLocked) return;

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isLocked]);

  // Block keyboard shortcuts while locked
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isLocked]);

  const handleUnlockTap = useCallback(async () => {
    if (isCoolingDown()) {
      log.kiosk('Unlock attempt during cooldown', LogLevel.DEBUG);
      return;
    }

    // Try biometrics first
    const biometricsAvailable = await checkBiometricAvailability();
    if (biometricsAvailable) {
      const result = await authenticateWithBiometrics(t('kiosk.biometric_prompt'));
      if (result.success) {
        log.kiosk('Unlocked via biometrics', LogLevel.INFO);
        unlock();
        onUnlock();
        toast({ description: t('kiosk.unlocked_toast') });
        return;
      }
      // Biometrics failed/cancelled — fall through to PIN
    }

    // Show PIN pad
    setPinError(null);
    setShowPinPad(true);
  }, [isCoolingDown, unlock, onUnlock, toast, t]);

  const handlePinSubmit = useCallback(async (pin: string) => {
    if (isCoolingDown()) return;

    const valid = await verifyPin(pin);
    if (valid) {
      log.kiosk('Unlocked via PIN', LogLevel.INFO);
      setShowPinPad(false);
      unlock();
      onUnlock();
      toast({ description: t('kiosk.unlocked_toast') });
    } else {
      recordFailedAttempt();
      setPinError(t('kiosk.pin_incorrect'));
      log.kiosk('Incorrect PIN attempt', LogLevel.WARN);
    }
  }, [isCoolingDown, unlock, onUnlock, recordFailedAttempt, toast, t]);

  const handlePinCancel = useCallback(() => {
    setShowPinPad(false);
    setPinError(null);
  }, []);

  if (!isLocked) return null;

  return (
    <>
      {/* Transparent overlay blocking all interaction */}
      <div
        className="fixed inset-0 z-[9999]"
        style={{ pointerEvents: 'auto' }}
        data-testid="kiosk-overlay"
      >
        {/* Unlock button — bottom-right */}
        <button
          onClick={handleUnlockTap}
          className="absolute bottom-6 right-6 w-11 h-11 rounded-full flex items-center justify-center transition-colors"
          style={{
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
          title={t('kiosk.unlock_label')}
          data-testid="kiosk-unlock-button"
        >
          <LockOpen className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.7)' }} />
        </button>
      </div>

      {/* PIN pad dialog */}
      {showPinPad && (
        <PinPad
          mode="unlock"
          onSubmit={handlePinSubmit}
          onCancel={handlePinCancel}
          error={pinError}
          cooldownSeconds={cooldownSeconds > 0 ? cooldownSeconds : undefined}
        />
      )}
    </>
  );
}
