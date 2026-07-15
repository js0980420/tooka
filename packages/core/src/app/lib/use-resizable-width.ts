import { useEffect, useRef, useState } from 'react';

export type ResizableWidthOptions = {
  storageKey: string;
  defaultWidth: number;
  min: number;
  max: number;
};

function readStoredWidth(
  storageKey: string,
  defaultWidth: number,
  min: number,
  max: number,
): number {
  if (typeof window === 'undefined') return defaultWidth;
  const raw = window.localStorage.getItem(storageKey);
  const parsed = raw == null ? Number.NaN : Number(raw);
  if (!Number.isFinite(parsed)) return defaultWidth;
  return Math.min(max, Math.max(min, parsed));
}

/** Drives a draggable-splitter panel width: persists to localStorage, and
 * wires pointer + keyboard handlers for the `role="separator"` handle. */
export function useResizableWidth({ storageKey, defaultWidth, min, max }: ResizableWidthOptions) {
  const [width, setWidth] = useState<number>(() =>
    readStoredWidth(storageKey, defaultWidth, min, max),
  );
  const [resizing, setResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, String(width));
  }, [storageKey, width]);

  useEffect(() => {
    if (!resizing) return;
    const prev = {
      cursor: document.body.style.cursor,
      userSelect: document.body.style.userSelect,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = prev.cursor;
      document.body.style.userSelect = prev.userSelect;
    };
  }, [resizing]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startWidth: width };
    setResizing(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const delta = e.clientX - dragRef.current.startX;
    setWidth(Math.min(max, Math.max(min, dragRef.current.startWidth + delta)));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setResizing(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 32 : 8;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      setWidth((w) => Math.max(min, w - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      setWidth((w) => Math.min(max, w + step));
    } else if (e.key === 'Home') {
      e.preventDefault();
      e.stopPropagation();
      setWidth(defaultWidth);
    }
  };

  return {
    width,
    resizing,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onKeyDown,
    reset: () => setWidth(defaultWidth),
  };
}
