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
  // Stacks live in refs so undo/redo can run entry side effects exactly
  // once — StrictMode double-invokes setState updaters, so effects in an
  // updater would fire twice. State only mirrors the lengths for renders.
  const pastRef = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);
  const [depths, setDepths] = useState({ past: 0, future: 0 });
  // Set while invoking an entry's undo/redo so providers can skip
  // re-recording the resulting state mutation.
  const suppressedRef = useRef(false);

  const syncDepths = useCallback(() => {
    setDepths({ past: pastRef.current.length, future: futureRef.current.length });
  }, []);

  const record = useCallback(
    (entry: Omit<HistoryEntry, 'ts'>) => {
      if (suppressedRef.current) return;
      const ts = Date.now();
      const past = pastRef.current;
      const top = past.at(-1);
      if (
        top &&
        entry.coalesceKey !== undefined &&
        top.coalesceKey === entry.coalesceKey &&
        ts - top.ts < COALESCE_WINDOW_MS
      ) {
        past[past.length - 1] = {
          undo: top.undo,
          redo: entry.redo,
          coalesceKey: entry.coalesceKey,
          ts,
        };
      } else {
        past.push({ ...entry, ts });
      }
      futureRef.current = [];
      syncDepths();
    },
    [syncDepths],
  );

  const undo = useCallback(() => {
    const top = pastRef.current.pop();
    if (!top) return;
    suppressedRef.current = true;
    try {
      top.undo();
    } finally {
      suppressedRef.current = false;
    }
    futureRef.current.push(top);
    syncDepths();
  }, [syncDepths]);

  const redo = useCallback(() => {
    const top = futureRef.current.pop();
    if (!top) return;
    suppressedRef.current = true;
    try {
      top.redo();
    } finally {
      suppressedRef.current = false;
    }
    pastRef.current.push(top);
    syncDepths();
  }, [syncDepths]);

  const clear = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    syncDepths();
  }, [syncDepths]);

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
      canUndo: depths.past > 0,
      canRedo: depths.future > 0,
      record,
      undo,
      redo,
      clear,
      isSuppressed,
    }),
    [depths.past, depths.future, record, undo, redo, clear, isSuppressed],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
