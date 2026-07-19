import { Crosshair } from 'lucide-react';
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
import { toast } from 'sonner';
import { useHistory } from '@/components/history-provider';
import { Button } from '@/components/ui/button';
import { useComments } from '@/lib/inspector/use-comments';
import { type EditOp, useEditor } from '@/lib/inspector/use-editor';
import { useLocale } from '@/lib/use-locale';
import { AssetPickerDialog } from './asset-picker-dialog';
import { ImageCropDialog, type ImageCropRect } from './image-crop-dialog';
import {
  type AssetAttrOp,
  type Bucket,
  buildPendingItems,
  INSTANCE_ID_ATTR,
  rangeStyleKey,
  readEditableText,
  readInstanceId,
  replayDomTextRangeStyles,
  type Sequenced,
  type Snap,
  setEditableText,
  type TextRangeStyleOp,
} from './inspector-buffer';
import { parseObjectPosition, parseObjectViewBox, round2 } from './inspector-crop-utils';
import type { InspectorCtx, SelectedTarget } from './inspector-types';

export type { SelectedTarget } from './inspector-types';

const Ctx = createContext<InspectorCtx | null>(null);

export function useInspector(): InspectorCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useInspector must be used inside <InspectorProvider>');
  return v;
}

export function InspectorProvider({
  slideId,
  pageIndex,
  children,
}: {
  slideId: string;
  pageIndex: number;
  children: ReactNode;
}) {
  const [active, setActive] = useState(import.meta.env.DEV);
  const [selected, setSelected] = useState<SelectedTarget | null>(null);
  const { comments, error, refetch, add, remove } = useComments(slideId);
  const { applyEdit, applyEdits } = useEditor(slideId);
  const history = useHistory();

  const pendingRef = useRef<Map<string, Bucket>>(new Map());
  const instanceCounterRef = useRef(0);
  const pendingSeqRef = useRef(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [committing, setCommitting] = useState(false);
  const [cropTarget, setCropTarget] = useState<{
    line: number;
    column: number;
    anchor: HTMLImageElement;
    src: string;
    targetWidth: number;
    targetHeight: number;
    initialFit: 'cover' | 'contain';
    initialPosition: { x: number; y: number };
    initialRect: ImageCropRect | null;
  } | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<{
    line: number;
    column: number;
    anchor: HTMLElement;
  } | null>(null);
  const t = useLocale();

  const ensureInstanceId = useCallback((el: HTMLElement): string => {
    const existing = el.getAttribute(INSTANCE_ID_ATTR);
    if (existing) return existing;
    const next = `inst-${++instanceCounterRef.current}`;
    el.setAttribute(INSTANCE_ID_ATTR, next);
    return next;
  }, []);

  const refreshCount = useCallback(() => {
    let n = 0;
    for (const b of pendingRef.current.values()) {
      if (
        b.styleOps.size > 0 ||
        b.rangeStyleOps.size > 0 ||
        b.textOps.size > 0 ||
        b.attrOps.size > 0 ||
        b.deleteOp
      ) {
        n++;
      }
    }
    setPendingCount(n);
  }, []);

  // Find the live anchor for a buffered loc. Used by history undo/redo
  // since the original `anchor` reference may have unmounted. With an
  // instance id, prefer the matching DOM node so per-instance text edits
  // round-trip onto the right element.
  const findAnchor = useCallback((line: number, column: number, instanceId?: string) => {
    const root = document.querySelector<HTMLElement>('[data-inspector-root]');
    if (!root) return null;
    if (instanceId) {
      const byInstance = root.querySelector<HTMLElement>(`[${INSTANCE_ID_ATTR}="${instanceId}"]`);
      if (byInstance) return byInstance;
    }
    return root.querySelector<HTMLElement>(`[data-slide-loc="${line}:${column}"]`);
  }, []);

  // Mutate bucket + DOM without recording history. Shared by `bufferOps`
  // (the public, history-recording entry point) and by `redo` closures.
  const applyOpsRaw = useCallback(
    (line: number, column: number, anchor: HTMLElement | null, ops: EditOp[]) => {
      const key = `${line}:${column}`;
      let bucket = pendingRef.current.get(key);
      if (!bucket) {
        bucket = {
          line,
          column,
          styleOps: new Map(),
          rangeStyleOps: new Map(),
          textOps: new Map(),
          attrOps: new Map(),
          deleteOp: null,
          origStyle: new Map(),
          origTexts: new Map(),
          origHtmls: new Map(),
          origAttrs: new Map(),
        };
        pendingRef.current.set(key, bucket);
      }
      const style = (anchor?.style ?? {}) as unknown as Record<string, string>;
      for (const op of ops) {
        const seq = ++pendingSeqRef.current;
        if (op.kind === 'set-style') {
          if (anchor && !bucket.origStyle.has(op.key)) {
            bucket.origStyle.set(op.key, style[op.key] ?? '');
          }
          bucket.styleOps.set(op.key, { value: op.value, prevText: op.prevText, seq });
          if (anchor?.isConnected) style[op.key] = op.value ?? '';
        } else if (op.kind === 'set-text-range-style') {
          if (!anchor) continue;
          const instanceId = ensureInstanceId(anchor);
          if (!bucket.origHtmls.has(instanceId)) bucket.origHtmls.set(instanceId, anchor.innerHTML);
          const nextOp: Sequenced<TextRangeStyleOp> = {
            instanceId,
            start: op.start,
            end: op.end,
            key: op.key,
            value: op.value,
            prevText: op.prevText ?? readEditableText(anchor),
            seq,
          };
          bucket.rangeStyleOps.set(rangeStyleKey(instanceId, op), nextOp);
          if (anchor.isConnected) {
            replayDomTextRangeStyles(
              anchor,
              bucket.origHtmls.get(instanceId) ?? anchor.innerHTML,
              Array.from(bucket.rangeStyleOps.values()).filter(
                (item) => item.instanceId === instanceId,
              ),
            );
          }
        } else if (op.kind === 'set-text') {
          // Reused JSX renders multiple DOM nodes with the same
          // `data-slide-loc` but distinct call-site literals; without an
          // anchor we can't tell which instance to route to, so skip.
          if (!anchor) continue;
          const instanceId = ensureInstanceId(anchor);
          if (!bucket.origTexts.has(instanceId)) {
            bucket.origTexts.set(instanceId, { value: readEditableText(anchor) });
          }
          bucket.textOps.set(instanceId, { value: op.value, seq });
          if (anchor.isConnected) setEditableText(anchor, op.value);
        } else if (op.kind === 'set-attr-asset') {
          if (anchor && !bucket.origAttrs.has(op.attr)) {
            bucket.origAttrs.set(
              op.attr,
              anchor.hasAttribute(op.attr) ? anchor.getAttribute(op.attr) : null,
            );
          }
          bucket.attrOps.set(op.attr, {
            assetPath: op.assetPath,
            previewUrl: op.previewUrl,
            seq,
          });
          if (anchor?.isConnected) anchor.setAttribute(op.attr, op.previewUrl);
        } else if (op.kind === 'delete-element') {
          if (anchor && !bucket.origStyle.has('display')) {
            bucket.origStyle.set('display', style.display ?? '');
          }
          bucket.deleteOp = { tag: op.tag ?? null, seq };
          if (anchor?.isConnected) style.display = 'none';
        }
      }
      refreshCount();
    },
    [refreshCount, ensureInstanceId],
  );

  const snapshotForOps = useCallback(
    (line: number, column: number, anchor: HTMLElement, ops: EditOp[]): Snap[] => {
      const key = `${line}:${column}`;
      const bucket = pendingRef.current.get(key);
      const style = anchor.style as unknown as Record<string, string>;
      const snaps: Snap[] = [];
      for (const op of ops) {
        if (op.kind === 'set-style') {
          const existing = bucket?.styleOps.get(op.key);
          if (existing) {
            snaps.push({
              kind: 'style',
              key: op.key,
              value: { ...existing },
              existed: true,
            });
          } else {
            snaps.push({
              kind: 'style',
              key: op.key,
              value: style[op.key] ?? '',
              existed: false,
            });
          }
        } else if (op.kind === 'set-text-range-style') {
          const instanceId = ensureInstanceId(anchor);
          const id = rangeStyleKey(instanceId, op);
          const existing = bucket?.rangeStyleOps.get(id);
          snaps.push({
            kind: 'range-style',
            id,
            instanceId,
            value: existing ? { ...existing } : null,
            existed: !!existing,
          });
        } else if (op.kind === 'set-text') {
          const instanceId = ensureInstanceId(anchor);
          const existing = bucket?.textOps.get(instanceId);
          if (existing) {
            snaps.push({ kind: 'text', instanceId, value: existing.value, existed: true });
          } else {
            snaps.push({
              kind: 'text',
              instanceId,
              value: readEditableText(anchor),
              existed: false,
            });
          }
        } else if (op.kind === 'set-attr-asset') {
          const prev = bucket?.attrOps.get(op.attr);
          if (prev) {
            snaps.push({ kind: 'attr', attr: op.attr, value: prev, source: 'op' });
          } else if (bucket?.origAttrs.has(op.attr)) {
            snaps.push({
              kind: 'attr',
              attr: op.attr,
              value: bucket.origAttrs.get(op.attr) ?? null,
              source: 'orig',
            });
          } else if (anchor.hasAttribute(op.attr)) {
            snaps.push({
              kind: 'attr',
              attr: op.attr,
              value: anchor.getAttribute(op.attr),
              source: 'dom-present',
            });
          } else {
            snaps.push({ kind: 'attr', attr: op.attr, value: null, source: 'dom-missing' });
          }
        } else if (op.kind === 'delete-element') {
          const existing = bucket?.deleteOp;
          snaps.push({
            kind: 'delete',
            value: existing ? { ...existing } : null,
            existed: !!existing,
          });
        }
      }
      return snaps;
    },
    [ensureInstanceId],
  );

  // Restore the snapshotted values to bucket + DOM. Mirrors the bucket-empty
  // logic of `cancelEdits` so an undo back to the absolute baseline cleans up.
  const restoreSnapshot = useCallback(
    (line: number, column: number, snaps: Snap[]) => {
      const key = `${line}:${column}`;
      const bucket = pendingRef.current.get(key);
      if (!bucket) return;
      // Style/attr snaps share the loc-level anchor (first match);
      // text snaps look up their per-instance node below.
      const sharedAnchor = findAnchor(line, column);
      const sharedStyle = (sharedAnchor?.style ?? {}) as unknown as Record<string, string>;
      for (const snap of snaps) {
        if (snap.kind === 'style') {
          if (snap.existed) {
            const prev =
              typeof snap.value === 'object' && snap.value !== null
                ? snap.value
                : { value: snap.value };
            const v = prev.value ?? '';
            bucket.styleOps.set(snap.key, { ...prev, seq: ++pendingSeqRef.current });
            if (sharedAnchor?.isConnected) sharedStyle[snap.key] = v;
          } else {
            bucket.styleOps.delete(snap.key);
            const orig = bucket.origStyle.get(snap.key);
            if (sharedAnchor?.isConnected) sharedStyle[snap.key] = orig ?? '';
          }
        } else if (snap.kind === 'range-style') {
          const textAnchor = findAnchor(line, column, snap.instanceId);
          if (snap.existed && snap.value) {
            bucket.rangeStyleOps.set(snap.id, { ...snap.value, seq: ++pendingSeqRef.current });
          } else {
            bucket.rangeStyleOps.delete(snap.id);
          }
          const html = bucket.origHtmls.get(snap.instanceId);
          if (textAnchor?.isConnected && html !== undefined) {
            replayDomTextRangeStyles(
              textAnchor,
              html,
              Array.from(bucket.rangeStyleOps.values()).filter(
                (op) => op.instanceId === snap.instanceId,
              ),
            );
          }
        } else if (snap.kind === 'text') {
          const textAnchor = findAnchor(line, column, snap.instanceId);
          if (snap.existed) {
            bucket.textOps.set(snap.instanceId, {
              value: snap.value ?? '',
              seq: ++pendingSeqRef.current,
            });
            if (textAnchor?.isConnected) setEditableText(textAnchor, snap.value ?? '');
          } else {
            bucket.textOps.delete(snap.instanceId);
            const orig = bucket.origTexts.get(snap.instanceId);
            if (textAnchor?.isConnected) setEditableText(textAnchor, orig?.value ?? '');
          }
        } else if (snap.kind === 'delete') {
          if (snap.existed && snap.value) {
            bucket.deleteOp = { ...snap.value, seq: ++pendingSeqRef.current };
            if (sharedAnchor?.isConnected) sharedStyle.display = 'none';
          } else {
            bucket.deleteOp = null;
            const orig = bucket.origStyle.get('display');
            if (sharedAnchor?.isConnected) sharedStyle.display = orig ?? '';
          }
        } else if (snap.kind === 'attr') {
          if (snap.source === 'op') {
            const op = snap.value as Sequenced<AssetAttrOp>;
            bucket.attrOps.set(snap.attr, { ...op, seq: ++pendingSeqRef.current });
            if (sharedAnchor?.isConnected) sharedAnchor.setAttribute(snap.attr, op.previewUrl);
          } else {
            bucket.attrOps.delete(snap.attr);
            const orig = bucket.origAttrs.get(snap.attr);
            if (sharedAnchor?.isConnected) {
              if (orig === null || orig === undefined) sharedAnchor.removeAttribute(snap.attr);
              else sharedAnchor.setAttribute(snap.attr, orig);
            }
          }
        }
      }
      if (
        bucket.styleOps.size === 0 &&
        bucket.rangeStyleOps.size === 0 &&
        bucket.textOps.size === 0 &&
        bucket.attrOps.size === 0 &&
        !bucket.deleteOp
      ) {
        pendingRef.current.delete(key);
      }
      refreshCount();
    },
    [findAnchor, refreshCount],
  );

  const bufferOps = useCallback(
    (line: number, column: number, anchor: HTMLElement, ops: EditOp[]) => {
      const instanceId = ops.some(
        (op) => op.kind === 'set-text' || op.kind === 'set-text-range-style',
      )
        ? ensureInstanceId(anchor)
        : undefined;
      const snaps = snapshotForOps(line, column, anchor, ops);
      applyOpsRaw(line, column, anchor, ops);
      const first = ops[0];
      const opKey = first
        ? first.kind === 'set-style'
          ? first.key
          : first.kind === 'set-attr-asset'
            ? first.attr
            : 'text'
        : 'noop';
      const coalesceKey = `inspector:${line}:${column}:${first?.kind ?? 'noop'}:${opKey}`;
      history.record({
        coalesceKey,
        undo: () => restoreSnapshot(line, column, snaps),
        redo: () => applyOpsRaw(line, column, findAnchor(line, column, instanceId), ops),
      });
    },
    [applyOpsRaw, snapshotForOps, restoreSnapshot, findAnchor, history, ensureInstanceId],
  );

  const commitEdits = useCallback(async () => {
    const buckets = pendingRef.current;
    if (buckets.size === 0) return;
    const pending = buildPendingItems(buckets);
    if (pending.length === 0) {
      pendingRef.current = new Map();
      setPendingCount(0);
      history.clear();
      return;
    }
    setCommitting(true);
    try {
      const results = await applyEdits(pending.map((p) => p.edit));
      const failures: string[] = [];
      for (let i = 0; i < results.length; i++) {
        const item = pending[i];
        const r = results[i];
        const bucket = pendingRef.current.get(item.key);
        if (r.ok) {
          if (bucket) {
            item.onSuccess(bucket);
            if (
              bucket.styleOps.size === 0 &&
              bucket.rangeStyleOps.size === 0 &&
              bucket.textOps.size === 0 &&
              bucket.attrOps.size === 0 &&
              !bucket.deleteOp
            ) {
              pendingRef.current.delete(item.key);
            }
          }
        } else {
          failures.push(`line ${item.edit.line}: ${r.error ?? 'edit failed'}`);
        }
      }
      refreshCount();
      if (failures.length > 0) toast.error(`${t.inspector.saveFailed} ${failures.join('; ')}`);
      // The server rewrote the source, so DOM-level undo entries are stale.
      // On transport failure nothing was applied — keep the undo stack.
      history.clear();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`${t.inspector.saveFailed} ${msg}`);
      throw err;
    } finally {
      setCommitting(false);
    }
  }, [applyEdits, history, refreshCount, t]);

  const cancelEdits = useCallback(() => {
    if (pendingRef.current.size === 0) {
      history.clear();
      return;
    }
    const root = document.querySelector<HTMLElement>('[data-inspector-root]');
    for (const b of pendingRef.current.values()) {
      const sharedEl = root?.querySelector<HTMLElement>(`[data-slide-loc="${b.line}:${b.column}"]`);
      if (sharedEl) {
        const style = sharedEl.style as unknown as Record<string, string>;
        for (const [k, v] of b.origStyle) style[k] = v;
        for (const [attr, value] of b.origAttrs) {
          if (value === null) sharedEl.removeAttribute(attr);
          else sharedEl.setAttribute(attr, value);
        }
      }
      // Each text edit has its own anchor — locate by instance id.
      for (const [instanceId, html] of b.origHtmls) {
        const textEl =
          root?.querySelector<HTMLElement>(`[${INSTANCE_ID_ATTR}="${instanceId}"]`) ?? null;
        if (textEl?.isConnected) textEl.innerHTML = html;
      }
      for (const [instanceId, orig] of b.origTexts) {
        const textEl =
          root?.querySelector<HTMLElement>(`[${INSTANCE_ID_ATTR}="${instanceId}"]`) ?? null;
        if (textEl?.isConnected) setEditableText(textEl, orig.value);
      }
    }
    pendingRef.current = new Map();
    setPendingCount(0);
    history.clear();
  }, [history]);

  const deleteElement = useCallback(
    (target: SelectedTarget) => {
      if (!target.anchor.isConnected) return;
      if (!target.anchor.parentElement?.closest('[data-slide-loc]')) {
        toast.error(t.inspector.cannotDeleteRoot);
        return;
      }
      bufferOps(target.line, target.column, target.anchor, [
        { kind: 'delete-element', tag: target.anchor.tagName.toLowerCase() },
      ]);
      setSelected(null);
    },
    [bufferOps, t],
  );

  // Auto-flush on inspector close and on route unmount so toggling
  // off or navigating away doesn't drop buffered edits. Failures are
  // surfaced via toast inside `commitEdits`; the catch here only
  // swallows the rethrown rejection.
  const commitRef = useRef(commitEdits);
  commitRef.current = commitEdits;
  useEffect(() => {
    if (!active) commitRef.current().catch(() => {});
  }, [active]);
  useEffect(() => {
    return () => {
      commitRef.current().catch(() => {});
    };
  }, []);

  // Re-apply buffered ops onto any `[data-slide-loc]` element that gets
  // (re)mounted in the slide canvas. Without this, navigating to a
  // different page and back drops the optimistic styles, since the
  // page's DOM nodes are torn down on unmount even though the buffer
  // (keyed by source line:col) survives.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-inspector-root]');
    if (!root) return;

    const applyBuffered = (el: HTMLElement) => {
      const loc = el.dataset.slideLoc;
      if (!loc) return;
      const bucket = pendingRef.current.get(loc);
      if (!bucket) return;
      const style = el.style as unknown as Record<string, string>;
      for (const [key, op] of bucket.styleOps) {
        const v = op.value ?? '';
        if (style[key] !== v) style[key] = v;
      }
      if (bucket.deleteOp && style.display !== 'none') style.display = 'none';
      // Text replays per-instance: only the originally clicked DOM node
      // (stamped with its `data-slide-instance-id`) gets the buffered
      // value, so siblings of a reused component aren't clobbered.
      const instanceId = readInstanceId(el);
      if (instanceId) {
        const html = bucket.origHtmls.get(instanceId);
        if (html !== undefined) {
          replayDomTextRangeStyles(
            el,
            html,
            Array.from(bucket.rangeStyleOps.values()).filter((op) => op.instanceId === instanceId),
          );
        }
        const textOp = bucket.textOps.get(instanceId);
        if (textOp && readEditableText(el) !== textOp.value) {
          setEditableText(el, textOp.value);
        }
      }
      for (const [attr, op] of bucket.attrOps) {
        if (el.getAttribute(attr) !== op.previewUrl) el.setAttribute(attr, op.previewUrl);
      }
    };

    let observer: MutationObserver | null = null;
    const replayAll = () => {
      if (pendingRef.current.size === 0) return;
      observer?.disconnect();
      root.querySelectorAll<HTMLElement>('[data-slide-loc]').forEach(applyBuffered);
      observer?.observe(root, { childList: true, subtree: true });
    };

    replayAll();
    observer = new MutationObserver(replayAll);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer?.disconnect();
  }, []);

  useEffect(() => {
    void pageIndex;
    setSelected(null);
  }, [pageIndex]);

  // Never clear `selected` on a miss: the observer can fire between an
  // "old removed" and "new added" mutation batch, and clearing then would
  // drop a selection that's about to reattach on the next fire.
  useEffect(() => {
    if (!selected) return;
    const root = document.querySelector<HTMLElement>('[data-inspector-root]');
    if (!root) return;

    const revalidate = () => {
      if (selected.anchor.isConnected) return;
      const next = root.querySelector<HTMLElement>(
        `[data-slide-loc="${selected.line}:${selected.column}"]`,
      );
      if (next && next !== selected.anchor) {
        setSelected({ ...selected, anchor: next });
      }
    };

    revalidate();
    const observer = new MutationObserver(revalidate);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [selected]);

  const toggle = useCallback(() => {
    setActive((a) => {
      if (a) setSelected(null);
      return !a;
    });
  }, []);

  const cancel = useCallback(() => {
    setActive(false);
    setSelected(null);
  }, []);

  const openReplace = useCallback((anchor: HTMLElement) => {
    const loc = anchor.dataset.slideLoc;
    if (!loc) return;
    const [lineStr, columnStr] = loc.split(':');
    const line = Number(lineStr);
    const column = Number(columnStr);
    if (!Number.isFinite(line) || !Number.isFinite(column)) return;
    setReplaceTarget({ line, column, anchor });
  }, []);

  useEffect(() => {
    if (import.meta.env.PROD) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.matches('input, textarea')) return;
      if (e.key !== 'i' && e.key !== 'I') return;
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  const openCrop = useCallback((anchor: HTMLImageElement) => {
    const loc = anchor.dataset.slideLoc;
    if (!loc) return;
    const [lineStr, columnStr] = loc.split(':');
    const line = Number(lineStr);
    const column = Number(columnStr);
    if (!Number.isFinite(line) || !Number.isFinite(column)) return;
    const cs = window.getComputedStyle(anchor);
    setCropTarget({
      line,
      column,
      anchor,
      src: anchor.currentSrc || anchor.src,
      targetWidth: anchor.offsetWidth || anchor.getBoundingClientRect().width,
      targetHeight: anchor.offsetHeight || anchor.getBoundingClientRect().height,
      initialFit: cs.objectFit === 'contain' ? 'contain' : 'cover',
      initialPosition: parseObjectPosition(cs.objectPosition),
      initialRect: parseObjectViewBox(cs.getPropertyValue('object-view-box')),
    });
  }, []);

  const value = useMemo<InspectorCtx>(
    () => ({
      slideId,
      active,
      toggle,
      cancel,
      comments,
      error,
      refetch,
      add,
      remove,
      selected,
      setSelected,
      applyEdit,
      applyEdits,
      bufferOps,
      pendingCount,
      commitEdits,
      cancelEdits,
      committing,
      openCrop,
      openReplace,
      deleteElement,
    }),
    [
      slideId,
      active,
      toggle,
      cancel,
      comments,
      error,
      refetch,
      add,
      remove,
      selected,
      applyEdit,
      applyEdits,
      bufferOps,
      pendingCount,
      commitEdits,
      cancelEdits,
      committing,
      openCrop,
      openReplace,
      deleteElement,
    ],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {replaceTarget && (
        <AssetPickerDialog
          slideId={slideId}
          onClose={() => setReplaceTarget(null)}
          onPick={(asset, scope) => {
            const { line, column, anchor } = replaceTarget;
            const assetPath =
              scope === 'global' ? `@assets/${asset.name}` : `./assets/${asset.name}`;
            const ops: EditOp[] = [
              {
                kind: 'set-attr-asset',
                attr: 'src',
                assetPath,
                previewUrl: asset.url,
              },
            ];
            if (anchor.tagName === 'IMG' && anchor.isConnected) {
              const cs = window.getComputedStyle(anchor);
              if (cs.objectFit !== 'cover' && cs.objectFit !== 'contain') {
                ops.push({ kind: 'set-style', key: 'objectFit', value: 'cover' });
              }
              const op = cs.objectPosition.trim();
              if (!op || op === '0% 0%' || op === 'auto') {
                ops.push({ kind: 'set-style', key: 'objectPosition', value: '50% 50%' });
              }
            }
            bufferOps(line, column, anchor, ops);
            setReplaceTarget(null);
          }}
        />
      )}
      {cropTarget && (
        <ImageCropDialog
          src={cropTarget.src}
          targetWidth={cropTarget.targetWidth}
          targetHeight={cropTarget.targetHeight}
          initialFit={cropTarget.initialFit}
          initialPosition={cropTarget.initialPosition}
          initialRect={cropTarget.initialRect}
          onClose={() => setCropTarget(null)}
          onApply={(result) => {
            const { line, column, anchor } = cropTarget;
            if (anchor.isConnected) {
              const ops: EditOp[] = [
                { kind: 'set-style', key: 'objectFit', value: result.fit },
                { kind: 'set-style', key: 'objectPosition', value: '50% 50%' },
              ];
              if (result.fit === 'cover') {
                const { x, y, width, height } = result.rect;
                const top = round2(y);
                const left = round2(x);
                const right = round2(100 - x - width);
                const bottom = round2(100 - y - height);
                ops.push({
                  kind: 'set-style',
                  key: 'objectViewBox',
                  value: `inset(${top}% ${right}% ${bottom}% ${left}%)`,
                });
              } else {
                ops.push({ kind: 'set-style', key: 'objectViewBox', value: null });
              }
              bufferOps(line, column, anchor, ops);
            }
            setCropTarget(null);
          }}
        />
      )}
    </Ctx.Provider>
  );
}

export function InspectToggleButton() {
  const t = useLocale();
  const { active, toggle } = useInspector();
  if (import.meta.env.PROD) return null;
  return (
    <Button
      size="sm"
      variant={active ? 'default' : 'ghost'}
      onClick={toggle}
      data-inspector-ui
      title={t.inspector.inspect}
    >
      <Crosshair className="size-3.5" />
      <span className="hidden md:inline">{t.inspector.inspect}</span>
      <kbd className="ml-1 hidden rounded-[3px] bg-foreground/10 px-1 font-mono text-[9.5px] tracking-[0.04em] md:inline">
        I
      </kbd>
    </Button>
  );
}
