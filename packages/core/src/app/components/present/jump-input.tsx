import { useEffect, useRef, useState } from 'react';

const FLUSH_DELAY_MS = 1200;

type Props = {
  pageCount: number;
  onJump: (index: number) => void;
};

/**
 * Listens for digit keypresses anywhere on the document and shows a
 * transient "→ 7" badge. Pressing Enter (or letting it idle) flushes the
 * buffer and jumps to the slide. Designed to be invisible until the user
 * starts typing — never steals focus, never shows an input element.
 */
export function PresentJumpInput({ pageCount, onJump }: Props) {
  const [buffer, setBuffer] = useState('');
  // Ref mirrors the buffer so flush can call onJump outside a setState
  // updater — StrictMode double-invokes updaters, which would jump twice.
  const bufferRef = useRef('');
  const flushRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const setBuf = (value: string) => {
      bufferRef.current = value;
      setBuffer(value);
    };

    const flush = () => {
      const current = bufferRef.current;
      if (!current) return;
      const n = Number.parseInt(current, 10);
      if (Number.isFinite(n) && n >= 1) {
        onJump(Math.min(pageCount, n) - 1);
      }
      setBuf('');
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.matches('input, textarea')) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setBuf((bufferRef.current + e.key).slice(0, 4));
        if (flushRef.current) clearTimeout(flushRef.current);
        flushRef.current = setTimeout(flush, FLUSH_DELAY_MS);
        return;
      }
      if (e.key === 'Enter') {
        if (flushRef.current) clearTimeout(flushRef.current);
        flush();
        return;
      }
      if (e.key === 'Backspace') {
        setBuf(bufferRef.current.slice(0, -1));
        return;
      }
      if (e.key === 'Escape') {
        // Cancelling a typed page number must not also reach the Player's
        // Escape handler (blackout/exit) — consume it while a buffer exists.
        if (bufferRef.current) {
          e.preventDefault();
          e.stopPropagation();
          setBuf('');
        }
        return;
      }
      if (e.key === ' ') {
        setBuf('');
      }
    };

    // Capture phase so the Escape consumption above runs before the
    // Player's bubble-phase keydown listener.
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      if (flushRef.current) clearTimeout(flushRef.current);
    };
  }, [pageCount, onJump]);

  if (!buffer) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute top-1/2 left-1/2 z-40 -translate-x-1/2 -translate-y-1/2 select-none rounded-[10px] bg-black/70 px-6 py-4 font-mono text-[44px] font-medium tracking-[0.05em] text-white tabular-nums shadow-[0_8px_40px_-8px_oklch(0_0_0/0.6)] backdrop-blur-md"
    >
      <span className="text-white/60">→ </span>
      {buffer}
    </div>
  );
}
