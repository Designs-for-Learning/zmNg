/**
 * Zoom/Pan Hook
 *
 * Button-driven zoom and pan with pinch-to-zoom on touch devices.
 * Uses direct DOM manipulation for smooth transforms.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useGesture } from '@use-gesture/react';

interface UseZoomPanOptions {
  minScale?: number;
  maxScale?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  swipeEnabled?: boolean;
}

interface TransformState {
  scale: number;
  x: number;
  y: number;
}

const ZOOM_THRESHOLD = 1.05;
const ZOOM_STEP = 0.5;
const PAN_STEP = 80;

export function useZoomPan({
  minScale = 1,
  maxScale = 4,
  onSwipeLeft,
  onSwipeRight,
  swipeEnabled = false,
}: UseZoomPanOptions = {}) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [displayScale, setDisplayScale] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const innerElRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<TransformState>({ scale: 1, x: 0, y: 0 });

  // Callback ref for the inner (transformed) element
  const innerRef = useCallback((el: HTMLDivElement | null) => {
    innerElRef.current = el;
    if (el) {
      el.style.transformOrigin = '0 0';
      el.style.willChange = 'transform';
      el.style.width = '100%';
      el.style.height = '100%';
      el.style.touchAction = 'none';
    }
  }, []);

  // Write transform directly to the DOM
  const applyTransform = useCallback(
    (s: number, x: number, y: number, animate: boolean) => {
      const scale = Math.max(minScale, Math.min(maxScale, s));
      let cx = x;
      let cy = y;

      if (scale > 1 && containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        cx = Math.max(width * (1 - scale), Math.min(0, x));
        cy = Math.max(height * (1 - scale), Math.min(0, y));
      } else if (scale <= 1) {
        cx = 0;
        cy = 0;
      }

      stateRef.current = { scale, x: cx, y: cy };

      if (innerElRef.current) {
        innerElRef.current.style.transition = animate ? 'transform 0.2s ease-out' : 'none';
        innerElRef.current.style.transform = `translate(${cx}px, ${cy}px) scale(${scale})`;
      }
    },
    [minScale, maxScale],
  );

  const syncState = useCallback(() => {
    const { scale } = stateRef.current;
    setIsZoomed(scale > ZOOM_THRESHOLD);
    setDisplayScale(scale);
  }, []);

  const reset = useCallback(() => {
    applyTransform(1, 0, 0, true);
    setIsZoomed(false);
    setDisplayScale(1);
  }, [applyTransform]);

  const zoomIn = useCallback(() => {
    const cur = stateRef.current;
    const container = containerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    const newScale = Math.min(maxScale, cur.scale + ZOOM_STEP);
    const ratio = newScale / cur.scale;
    const cx = width / 2;
    const cy = height / 2;
    applyTransform(newScale, cx - (cx - cur.x) * ratio, cy - (cy - cur.y) * ratio, true);
    syncState();
  }, [applyTransform, maxScale, syncState]);

  const zoomOut = useCallback(() => {
    const cur = stateRef.current;
    const newScale = Math.max(minScale, cur.scale - ZOOM_STEP);
    if (newScale < ZOOM_THRESHOLD) {
      reset();
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    const ratio = newScale / cur.scale;
    const cx = width / 2;
    const cy = height / 2;
    applyTransform(newScale, cx - (cx - cur.x) * ratio, cy - (cy - cur.y) * ratio, true);
    syncState();
  }, [applyTransform, minScale, reset, syncState]);

  const panLeft = useCallback(() => {
    const cur = stateRef.current;
    if (cur.scale <= ZOOM_THRESHOLD) return;
    applyTransform(cur.scale, cur.x + PAN_STEP, cur.y, true);
    syncState();
  }, [applyTransform, syncState]);

  const panRight = useCallback(() => {
    const cur = stateRef.current;
    if (cur.scale <= ZOOM_THRESHOLD) return;
    applyTransform(cur.scale, cur.x - PAN_STEP, cur.y, true);
    syncState();
  }, [applyTransform, syncState]);

  const panUp = useCallback(() => {
    const cur = stateRef.current;
    if (cur.scale <= ZOOM_THRESHOLD) return;
    applyTransform(cur.scale, cur.x, cur.y + PAN_STEP, true);
    syncState();
  }, [applyTransform, syncState]);

  const panDown = useCallback(() => {
    const cur = stateRef.current;
    if (cur.scale <= ZOOM_THRESHOLD) return;
    applyTransform(cur.scale, cur.x, cur.y - PAN_STEP, true);
    syncState();
  }, [applyTransform, syncState]);

  // Pinch-to-zoom only (touch devices) + swipe navigation
  useGesture(
    {
      onPinch: ({ offset: [newScale], origin: [ox, oy], first, last, memo }) => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const fx = ox - rect.left;
        const fy = oy - rect.top;

        if (first) {
          return { prevScale: stateRef.current.scale };
        }
        if (!memo) return;

        const ratio = newScale / memo.prevScale;
        const cur = stateRef.current;
        applyTransform(
          newScale,
          fx - (fx - cur.x) * ratio,
          fy - (fy - cur.y) * ratio,
          false,
        );

        if (last) {
          if (newScale < ZOOM_THRESHOLD) {
            applyTransform(1, 0, 0, true);
          }
          syncState();
        }

        return { prevScale: newScale };
      },

      onDrag: ({
        delta: [dx, dy],
        movement: [mx],
        direction: [xDir],
        velocity: [vx],
        last,
        pinching,
        cancel,
        tap,
      }) => {
        if (pinching) { cancel(); return; }
        if (tap) return;

        const cur = stateRef.current;

        if (cur.scale > ZOOM_THRESHOLD) {
          // Touch pan when zoomed
          applyTransform(cur.scale, cur.x + dx, cur.y + dy, false);
          if (last) syncState();
        } else if (swipeEnabled && last) {
          // Swipe navigation when not zoomed
          const didSwipe = Math.abs(mx) > 80 || vx > 0.5;
          if (didSwipe) {
            if (xDir < 0) onSwipeLeft?.();
            else if (xDir > 0) onSwipeRight?.();
          }
        }
      },
    },
    {
      target: containerRef,
      eventOptions: { passive: false },
      pinch: { scaleBounds: { min: minScale, max: maxScale }, rubberband: true },
      drag: { filterTaps: true, pointer: { touch: true } },
    },
  );

  // Apply touch/drag styles to container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.classList.add('no-native-drag');
    el.style.touchAction = 'none';
    return () => {
      el.classList.remove('no-native-drag');
      el.style.touchAction = '';
    };
  }, []);

  return {
    ref: containerRef,
    innerRef,
    scale: displayScale,
    isZoomed,
    reset,
    zoomIn,
    zoomOut,
    panLeft,
    panRight,
    panUp,
    panDown,
  };
}
