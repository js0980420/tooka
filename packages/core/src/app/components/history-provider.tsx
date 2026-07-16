import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type HistoryEntry = {
  undo: () => void;
  redo: () => void;
  coalesceKey?: string;
  ts: number;
};

type HistoryCtx = {
  canUndo: boolean;
  canRedo: boolean;
  record: (entry: Omit<HistoryEntry, 'ts'>) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  isSuppressed: () => boolean;
};

const COALESCE_WINDOW_MS = 500;

const Ctx = createContext<HistoryCtx | null>(null);

export function useHistory(): HistoryCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useHistory must be used inside <HistoryProvider>');
  return v;
}

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [past, setPast] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);
  // Set while invoking an entry's undo/redo so providers can skip
  // re-recording the resulting state mutation.
  const suppressedRef = useRef(false);

  const record = useCallback((entry: Omit<HistoryEntry, 'ts'>) => {
    if (suppressedRef.current) return;
    const ts = Date.now();
    setPast((prev) => {
      const top = prev.at(-1);
      if (
        top &&
        entry.coalesceKey !== undefined &&
        top.coalesceKey === entry.coalesceKey &&
        ts - top.ts < COALESCE_WINDOW_MS
      ) {
        const merged: HistoryEntry = {
          undo: top.undo,
          redo: entry.redo,
          coalesceKey: entry.coalesceKey,
          ts,
        };
        return [...prev.slice(0, -1), merged];
      }
      return [...prev, { ...entry, ts }];
    });
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setPast((prev) => {
      const top = prev.at(-1);
      if (!top) return prev;
      suppressedRef.current = true;
      try {
        top.undo();
      } finally {
        suppressedRef.current = false;
      }
      setFuture((f) => [...f, top]);
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((prev) => {
      const top = prev.at(-1);
      if (!top) return prev;
      suppressedRef.current = true;
      try {
        top.redo();
      } finally {
        suppressedRef.current = false;
      }
      setPast((p) => [...p, top]);
      return prev.slice(0, -1);
    });
  }, []);

  const clear = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  const isSuppressed = useCallback(() => suppressedRef.current, []);

  // Text fields keep the browser's native undo; everywhere else Ctrl/Cmd+Z
  // drives this history (Shift reverses, Ctrl+Y also redoes).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      if (key === 'y' && e.shiftKey) return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.matches('input, textarea, select'))
      ) {
        // The inspector's comment box autofocuses on selection; while it's
        // empty there is no text history, so the shortcut stays app-level.
        const emptyCommentBox =
          target instanceof HTMLTextAreaElement &&
          target.value === '' &&
          target.closest('[data-inspector-comment]');
        if (!emptyCommentBox) return;
      }
      e.preventDefault();
      if (key === 'y' || e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const value = useMemo<HistoryCtx>(
    () => ({
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      record,
      undo,
      redo,
      clear,
      isSuppressed,
    }),
    [past.length, future.length, record, undo, redo, clear, isSuppressed],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
