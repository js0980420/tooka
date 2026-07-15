import { type RefObject, useEffect, useRef, useState } from 'react';
import { isVisualViewportZoomed, normalizeWheelDelta } from './use-wheel-page-navigation';

const ZOOM_STORAGE_KEY = 'tooka:ui-zoom';
const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 1.6;
const WHEEL_ZOOM_SENSITIVITY = 0.0007;

function readStoredZoom(): number {
  if (typeof window === 'undefined') return DEFAULT_ZOOM;
  const raw = window.localStorage.getItem(ZOOM_STORAGE_KEY);
  const parsed = raw == null ? Number.NaN : Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, parsed));
}

/**
 * Ctrl/Cmd + wheel (and trackpad pinch, which browsers report as a
 * ctrl-flagged wheel event) zooms the whole subtree under the returned ref
 * via CSS `zoom`. Plain wheel scrolling is left completely untouched, and
 * real OS-level pinch-zoom is deferred to. Ctrl/Cmd+0 resets to 100%. The
 * level persists per browser.
 */
export function useUiZoom<T extends HTMLElement>(): {
  ref: RefObject<T>;
  zoom: number;
  resetZoom: () => void;
} {
  const ref = useRef<T>(null);
  const [zoom, setZoom] = useState<number>(readStoredZoom);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom));
  }, [zoom]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey || isVisualViewportZoomed()) return;
      event.preventDefault();
      const delta = normalizeWheelDelta(event.deltaY, event.deltaMode);
      setZoom((z) =>
        Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * (1 - delta * WHEEL_ZOOM_SENSITIVITY))),
      );
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    // Global, not scoped to the zoomed element: the reset shortcut should
    // work no matter what currently has focus (often nothing does).
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key !== '0') return;
      event.preventDefault();
      setZoom(DEFAULT_ZOOM);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return { ref, zoom, resetZoom: () => setZoom(DEFAULT_ZOOM) };
}
