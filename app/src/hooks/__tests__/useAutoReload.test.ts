import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAutoReload } from '../useAutoReload';

vi.mock('../../lib/logger', () => ({
  log: { app: vi.fn() },
  LogLevel: { INFO: 1, WARN: 2 },
}));

describe('useAutoReload', () => {
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;
  const reloadMock = vi.fn();

  beforeEach(() => {
    addSpy = vi.spyOn(window, 'addEventListener');
    removeSpy = vi.spyOn(window, 'removeEventListener');
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
      configurable: true,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not add listeners when disabled', () => {
    renderHook(() => useAutoReload(false));
    const offlineCalls = addSpy.mock.calls.filter(([e]) => e === 'offline');
    expect(offlineCalls).toHaveLength(0);
  });

  it('adds offline and online listeners when enabled', () => {
    renderHook(() => useAutoReload(true));
    const offlineCalls = addSpy.mock.calls.filter(([e]) => e === 'offline');
    const onlineCalls = addSpy.mock.calls.filter(([e]) => e === 'online');
    expect(offlineCalls).toHaveLength(1);
    expect(onlineCalls).toHaveLength(1);
  });

  it('removes listeners on unmount', () => {
    const { unmount } = renderHook(() => useAutoReload(true));
    unmount();
    const offlineCalls = removeSpy.mock.calls.filter(([e]) => e === 'offline');
    const onlineCalls = removeSpy.mock.calls.filter(([e]) => e === 'online');
    expect(offlineCalls).toHaveLength(1);
    expect(onlineCalls).toHaveLength(1);
  });

  it('reloads after going offline then online', () => {
    renderHook(() => useAutoReload(true));

    // Simulate offline then online
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));

    // Should not reload immediately
    expect(reloadMock).not.toHaveBeenCalled();

    // After the 3-second delay
    vi.advanceTimersByTime(3000);
    expect(reloadMock).toHaveBeenCalledOnce();
  });

  it('does not reload on online event without prior offline', () => {
    renderHook(() => useAutoReload(true));

    window.dispatchEvent(new Event('online'));
    vi.advanceTimersByTime(3000);

    expect(reloadMock).not.toHaveBeenCalled();
  });
});
