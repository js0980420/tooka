import { Crop, ImageIcon, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { canvasScale, composeTranslate, parseTranslate } from '@/lib/inspector/drag';
import { findSlideSource, type SlideSourceHit } from '@/lib/inspector/fiber';
import type { EditOp } from '@/lib/inspector/use-editor';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { useInspector } from './inspector-provider';

type Highlight = { hit: SlideSourceHit };

type DragState = {
  pointerId: number;
  anchor: HTMLElement;
  line: number;
  column: number;
  startX: number;
  startY: number;
  base: { x: number; y: number };
  scale: number;
  origInline: string;
  origTransition: string;
  dragging: boolean;
};

type RelRect = { left: number; top: number; width: number; height: number };

const FRAME_FADE_MS = 150;
const FRAME_MORPH_MS = 180;
const RAPID_CHANGE_MS = 120;

export function InspectOverlay() {
  const { active, slideId, selected, setSelected, cancel, openCrop, bufferOps, deleteElement } =
    useInspector();
  const t = useLocale();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Highlight | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const selectedRef = useRef(selected);
  const menuRef = useRef(menu);
  useEffect(() => {
    selectedRef.current = selected;
    menuRef.current = menu;
  });
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (!active) {
      setHover(null);
      setMenu(null);
      return;
    }

    const endDrag = (revert: boolean) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      document.documentElement.style.cursor = '';
      if (drag.anchor.isConnected) {
        if (revert) drag.anchor.style.translate = drag.origInline;
        if (drag.dragging) {
          // Restore after the post-drag translate writes have painted, so the
          // element's own transition can't animate the revert.
          const { anchor, origTransition } = drag;
          requestAnimationFrame(() => {
            anchor.style.transition = origTransition;
          });
        }
      }
      setIsDragging(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (dragRef.current) return;
        const sel = selectedRef.current;
        if (!sel?.anchor.isConnected) return;
        const target = e.target;
        if (
          target instanceof HTMLElement &&
          (target.isContentEditable || target.matches('input, textarea, select'))
        ) {
          // The comment box steals focus on selection; an empty box plus the
          // Delete key (never Backspace) still reads as "delete the element".
          const emptyCommentBox =
            e.key === 'Delete' &&
            target instanceof HTMLTextAreaElement &&
            target.value === '' &&
            target.closest('[data-inspector-comment]');
          if (!emptyCommentBox) return;
        }
        e.preventDefault();
        e.stopPropagation();
        setMenu(null);
        deleteElement(sel);
        return;
      }
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      if (dragRef.current) {
        endDrag(true);
        suppressClickRef.current = true;
        return;
      }
      if (menuRef.current) {
        setMenu(null);
        return;
      }
      cancel();
    };

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (drag && e.pointerId === drag.pointerId) {
        if (!drag.anchor.isConnected) {
          endDrag(false);
          return;
        }
        if (!drag.dragging) {
          if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 3) return;
          drag.dragging = true;
          drag.anchor.setPointerCapture(drag.pointerId);
          // A transition on the element would re-interpolate from scratch on
          // every pointermove, leaving it crawling far behind the cursor.
          drag.anchor.style.transition = 'none';
          document.documentElement.style.cursor = 'move';
          setHover(null);
          setIsDragging(true);
        }
        const dx = (e.clientX - drag.startX) / drag.scale;
        const dy = (e.clientY - drag.startY) / drag.scale;
        drag.anchor.style.translate = `${Math.round(drag.base.x + dx)}px ${Math.round(drag.base.y + dy)}px`;
        return;
      }
      if (!isInspectableEventTarget(e.target)) return setHover(null);
      const el = pickElement(e.clientX, e.clientY);
      if (!el) return setHover(null);
      const hit = findSlideSource(el, slideId, { hostOnly: true });
      if (!hit) return setHover(null);
      setHover({ hit });
    };

    const onClick = (e: MouseEvent) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (!isInspectableEventTarget(e.target)) return;
      const el = pickElement(e.clientX, e.clientY);
      if (!el) return;
      const hit = findSlideSource(el, slideId, { hostOnly: true });
      if (!hit) return;
      e.preventDefault();
      e.stopPropagation();
      setSelected({ line: hit.line, column: hit.column, anchor: hit.anchor });
      setHover({ hit });
    };

    const onDblClick = (e: MouseEvent) => {
      if (!isInspectableEventTarget(e.target)) return;
      const el = pickElement(e.clientX, e.clientY);
      if (!el) return;
      const hit = findSlideSource(el, slideId, { hostOnly: true });
      if (!hit) return;
      if (!(hit.anchor instanceof HTMLImageElement)) return;
      e.preventDefault();
      e.stopPropagation();
      setSelected({ line: hit.line, column: hit.column, anchor: hit.anchor });
      openCrop(hit.anchor);
    };

    const onContextMenu = (e: MouseEvent) => {
      // Shift+right-click keeps the browser's native menu available.
      if (e.shiftKey) {
        setMenu(null);
        return;
      }
      if (!isInspectableEventTarget(e.target)) {
        setMenu(null);
        return;
      }
      const el = pickElement(e.clientX, e.clientY);
      if (!el) return setMenu(null);
      const hit = findSlideSource(el, slideId, { hostOnly: true });
      if (!hit) return setMenu(null);
      e.preventDefault();
      e.stopPropagation();
      setSelected({ line: hit.line, column: hit.column, anchor: hit.anchor });
      setHover(null);
      const overlayRect = overlayRef.current?.getBoundingClientRect();
      setMenu({
        x: e.clientX - (overlayRect?.left ?? 0),
        y: e.clientY - (overlayRect?.top ?? 0),
      });
    };

    const onPointerDown = (e: PointerEvent) => {
      if (
        menuRef.current &&
        !(e.target instanceof Element && e.target.closest('[data-inspector-menu]'))
      ) {
        setMenu(null);
      }
      if (e.button !== 0) return;
      const sel = selectedRef.current;
      if (!sel?.anchor.isConnected) return;
      if (!isInspectableEventTarget(e.target)) return;
      const el = pickElement(e.clientX, e.clientY);
      if (!el) return;
      const hit = findSlideSource(el, slideId, { hostOnly: true });
      if (!hit || hit.anchor !== sel.anchor) return;
      const base = parseTranslate(sel.anchor.style.translate);
      if (!base) return;
      // The canvas is the transform-scaled element; the inspector root is the
      // unscaled viewport around it and always measures at scale 1.
      const canvas = sel.anchor.closest<HTMLElement>('[data-osd-canvas]');
      if (!canvas) return;
      const scale = canvasScale(canvas.getBoundingClientRect().width, canvas.offsetWidth);
      if (scale === null) return;
      e.preventDefault();
      dragRef.current = {
        pointerId: e.pointerId,
        anchor: sel.anchor,
        line: sel.line,
        column: sel.column,
        startX: e.clientX,
        startY: e.clientY,
        base,
        scale,
        origInline: sel.anchor.style.translate,
        origTransition: sel.anchor.style.transition,
        dragging: false,
      };
    };

    const onPointerUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      const moved = drag.dragging;
      endDrag(false);
      if (!moved) return;
      suppressClickRef.current = true;
      if (!drag.anchor.isConnected) return;
      const dx = (e.clientX - drag.startX) / drag.scale;
      const dy = (e.clientY - drag.startY) / drag.scale;
      const value = composeTranslate(drag.base.x + dx, drag.base.y + dy);
      // bufferOps 以當下 DOM 值快照原始 style;先還原預覽,快照才是拖曳前的值
      drag.anchor.style.translate = drag.origInline;
      if (value === drag.origInline || (value === null && drag.origInline === '')) return;
      bufferOps(drag.line, drag.column, drag.anchor, [
        { kind: 'set-style', key: 'translate', value },
      ]);
    };

    const onPointerCancel = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      endDrag(true);
      suppressClickRef.current = true;
    };

    const onDragStart = (e: DragEvent) => {
      if (dragRef.current) e.preventDefault();
    };

    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('dblclick', onDblClick, true);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('contextmenu', onContextMenu, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerCancel, true);
    window.addEventListener('dragstart', onDragStart, true);
    return () => {
      endDrag(true);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('dblclick', onDblClick, true);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('contextmenu', onContextMenu, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerCancel, true);
      window.removeEventListener('dragstart', onDragStart, true);
    };
  }, [active, slideId, setSelected, cancel, openCrop, bufferOps, deleteElement]);

  const hoverAnchor = hover?.hit.anchor.isConnected ? hover.hit.anchor : null;
  const selectedAnchor = selected?.anchor.isConnected ? selected.anchor : null;
  const dedupedHover = hoverAnchor && hoverAnchor !== selectedAnchor ? hoverAnchor : null;

  if (!active) return null;
  return (
    <div ref={overlayRef} data-inspector-ui className="pointer-events-none absolute inset-0 z-30">
      <Frame
        anchor={selectedAnchor}
        overlayRef={overlayRef}
        variant="selected"
        showImageActions
        isDragging={isDragging}
        onResize={(ops) => {
          const sel = selectedRef.current;
          if (sel?.anchor.isConnected) bufferOps(sel.line, sel.column, sel.anchor, ops);
        }}
      />
      <Frame anchor={dedupedHover} overlayRef={overlayRef} variant="hover" />
      {menu && selectedAnchor && (
        <div
          data-inspector-menu
          className="pointer-events-auto absolute z-40 min-w-[150px] rounded-[8px] border border-border bg-popover p-1 text-popover-foreground shadow-floating"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenu(null);
              const sel = selectedRef.current;
              if (sel) deleteElement(sel);
            }}
            className="flex w-full items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-left text-[13px] text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <Trash2 className="size-3.5" />
            <span className="flex-1">{t.inspector.deleteElement}</span>
            <kbd className="rounded-[3px] bg-foreground/10 px-1 font-mono text-[9.5px] tracking-[0.04em]">
              Del
            </kbd>
          </button>
        </div>
      )}
    </div>
  );
}

type FrameVariant = 'selected' | 'hover';

type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

const MIN_RESIZE_PX = 24;

const RESIZE_CORNERS: Array<{ corner: ResizeCorner; cursor: string }> = [
  { corner: 'nw', cursor: 'nwse-resize' },
  { corner: 'ne', cursor: 'nesw-resize' },
  { corner: 'sw', cursor: 'nesw-resize' },
  { corner: 'se', cursor: 'nwse-resize' },
];

type ResizeState = {
  pointerId: number;
  corner: ResizeCorner;
  anchor: HTMLElement;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  base: { x: number; y: number } | null;
  scale: number;
  hadExplicitH: boolean;
  orig: { width: string; height: string; translate: string; transition: string };
  result: { w: number; h: number; tx: number; ty: number } | null;
};

const FRAME_STYLES: Record<FrameVariant, React.CSSProperties> = {
  selected: { outline: '2px solid #3b82f6', background: 'rgba(59,130,246,0.1)' },
  hover: { outline: '1.5px dashed #3b82f6', background: 'rgba(59,130,246,0.05)' },
};

function Frame({
  anchor,
  overlayRef,
  variant,
  showImageActions = false,
  isDragging = false,
  onResize,
}: {
  anchor: HTMLElement | null;
  overlayRef: React.RefObject<HTMLDivElement>;
  variant: FrameVariant;
  showImageActions?: boolean;
  isDragging?: boolean;
  onResize?: (ops: EditOp[]) => void;
}) {
  const [rect, setRect] = useState<RelRect | null>(null);
  const [hasTarget, setHasTarget] = useState(false);
  const [rapid, setRapid] = useState(false);
  const rectRef = useRef<RelRect | null>(null);
  const lastChangeRef = useRef(0);

  const measure = useCallback(() => {
    const overlay = overlayRef.current;
    if (!anchor?.isConnected || !overlay) {
      setHasTarget(false);
      return;
    }

    const targetRect = anchor.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    const next = {
      left: targetRect.left - overlayRect.left,
      top: targetRect.top - overlayRect.top,
      width: targetRect.width,
      height: targetRect.height,
    };

    setHasTarget(true);
    if (sameRect(rectRef.current, next)) return;
    // Rapid successive changes (dragging, panel transitions) must track the
    // target 1:1; only isolated jumps (reselect, discard restore) morph.
    const now = performance.now();
    setRapid(now - lastChangeRef.current < RAPID_CHANGE_MS);
    lastChangeRef.current = now;
    rectRef.current = next;
    setRect(next);
  }, [overlayRef, anchor]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  // A continuous measure loop while the frame is visible keeps it glued to
  // the anchor through drags, layout animations, scrolling, and DOM reverts
  // (e.g. discarding buffered edits) — `sameRect` gates re-renders.
  useEffect(() => {
    if (!anchor) {
      setHasTarget(false);
      return;
    }

    let raf = requestAnimationFrame(function loop() {
      measure();
      raf = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(raf);
  }, [measure, anchor]);

  const visible = !!(hasTarget && rect);

  // First render after appearing: snap to the new rect (no transition).
  // Subsequent rect changes in the same visible session: animate.
  const [morph, setMorph] = useState(false);
  useLayoutEffect(() => {
    if (visible) {
      setMorph(true);
      return;
    }
    const t = setTimeout(() => setMorph(false), FRAME_FADE_MS);
    return () => clearTimeout(t);
  }, [visible]);

  const resizeRef = useRef<ResizeState | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const revertResizePreview = useCallback((r: ResizeState) => {
    if (!r.anchor.isConnected) return;
    r.anchor.style.width = r.orig.width;
    r.anchor.style.height = r.orig.height;
    r.anchor.style.translate = r.orig.translate;
    const { anchor: a, orig } = r;
    requestAnimationFrame(() => {
      a.style.transition = orig.transition;
    });
  }, []);

  useEffect(() => {
    return () => {
      const r = resizeRef.current;
      if (r) {
        resizeRef.current = null;
        revertResizePreview(r);
      }
    };
  }, [revertResizePreview]);

  const startResize = (e: React.PointerEvent, corner: ResizeCorner) => {
    if (!anchor?.isConnected || resizeRef.current) return;
    const canvas = anchor.closest<HTMLElement>('[data-osd-canvas]');
    if (!canvas) return;
    const scale = canvasScale(canvas.getBoundingClientRect().width, canvas.offsetWidth);
    if (scale === null) return;
    const startW = anchor.offsetWidth;
    const startH = anchor.offsetHeight;
    if (startW <= 0 || startH <= 0) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = {
      pointerId: e.pointerId,
      corner,
      anchor,
      startX: e.clientX,
      startY: e.clientY,
      startW,
      startH,
      base: parseTranslate(anchor.style.translate),
      scale,
      hadExplicitH: anchor.style.height !== '',
      orig: {
        width: anchor.style.width,
        height: anchor.style.height,
        translate: anchor.style.translate,
        transition: anchor.style.transition,
      },
      result: null,
    };
    anchor.style.transition = 'none';
    setIsResizing(true);
  };

  const moveResize = (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r || e.pointerId !== r.pointerId) return;
    if (!r.anchor.isConnected) {
      resizeRef.current = null;
      setIsResizing(false);
      return;
    }
    const sx = r.corner.includes('e') ? 1 : -1;
    const sy = r.corner.includes('s') ? 1 : -1;
    const kW = (r.startW + (sx * (e.clientX - r.startX)) / r.scale) / r.startW;
    const kH = (r.startH + (sy * (e.clientY - r.startY)) / r.scale) / r.startH;
    const k = Math.abs(kW - 1) >= Math.abs(kH - 1) ? kW : kH;
    const newW = Math.max(MIN_RESIZE_PX, Math.round(r.startW * k));
    const newH = Math.round(newW * (r.startH / r.startW));
    r.anchor.style.width = `${newW}px`;
    if (r.hadExplicitH) r.anchor.style.height = `${newH}px`;
    let tx = r.base?.x ?? 0;
    let ty = r.base?.y ?? 0;
    if (r.base) {
      if (r.corner.includes('w')) tx = r.base.x + (r.startW - newW);
      if (r.corner.includes('n')) ty = r.base.y + (r.startH - newH);
      r.anchor.style.translate = `${Math.round(tx)}px ${Math.round(ty)}px`;
    }
    r.result = { w: newW, h: newH, tx, ty };
  };

  const endResize = (e: React.PointerEvent, cancelled: boolean) => {
    const r = resizeRef.current;
    if (!r || e.pointerId !== r.pointerId) return;
    resizeRef.current = null;
    setIsResizing(false);
    const { result } = r;
    // bufferOps snapshots the current DOM as the pre-edit state, so the
    // preview must be unwound before the ops re-apply the final values.
    revertResizePreview(r);
    if (cancelled || !result || !onResize) return;
    if (result.w === r.startW && result.h === r.startH) return;
    const ops: EditOp[] = [{ kind: 'set-style', key: 'width', value: `${result.w}px` }];
    if (r.hadExplicitH) ops.push({ kind: 'set-style', key: 'height', value: `${result.h}px` });
    if (r.base && (result.tx !== r.base.x || result.ty !== r.base.y)) {
      ops.push({
        kind: 'set-style',
        key: 'translate',
        value: composeTranslate(result.tx, result.ty),
      });
    }
    onResize(ops);
  };

  if (!rect) return null;
  const transition =
    isDragging || isResizing || rapid
      ? `opacity ${FRAME_FADE_MS}ms ease-out`
      : morph
        ? `left ${FRAME_MORPH_MS}ms ease-out, top ${FRAME_MORPH_MS}ms ease-out, ` +
          `width ${FRAME_MORPH_MS}ms ease-out, height ${FRAME_MORPH_MS}ms ease-out, ` +
          `opacity ${FRAME_FADE_MS}ms ease-out`
        : `opacity ${FRAME_FADE_MS}ms ease-out`;

  const imageAnchor = anchor instanceof HTMLImageElement ? anchor : null;
  const actionsVisible = showImageActions && visible && !!imageAnchor && !isResizing;
  const handlesVisible = !!onResize && visible && !!imageAnchor && !isDragging;

  return (
    <>
      <div
        className="absolute"
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          opacity: visible ? 1 : 0,
          transition,
          ...FRAME_STYLES[variant],
        }}
      />
      {handlesVisible &&
        RESIZE_CORNERS.map(({ corner, cursor }) => (
          <div
            key={corner}
            role="presentation"
            className="pointer-events-auto absolute z-10 size-2.5 rounded-[2px] border-[1.5px] border-[#3b82f6] bg-white shadow-sm"
            style={{
              left: rect.left + (corner.includes('e') ? rect.width : 0) - 5,
              top: rect.top + (corner.includes('s') ? rect.height : 0) - 5,
              cursor,
            }}
            onPointerDown={(e) => startResize(e, corner)}
            onPointerMove={moveResize}
            onPointerUp={(e) => endResize(e, false)}
            onPointerCancel={(e) => endResize(e, true)}
          />
        ))}
      {showImageActions && imageAnchor && (
        <ImageActionPanel
          anchor={imageAnchor}
          rect={rect}
          visible={actionsVisible}
          transition={transition}
        />
      )}
    </>
  );
}

const FLOATING_PANEL_GAP = 8;

function ImageActionPanel({
  anchor,
  rect,
  visible,
  transition,
}: {
  anchor: HTMLElement;
  rect: RelRect;
  visible: boolean;
  transition: string;
}) {
  const { openCrop, openReplace } = useInspector();
  const t = useLocale();
  return (
    <TooltipProvider delay={200}>
      <div
        className={cn(
          'absolute flex items-center gap-0.5 rounded-[8px] border border-border bg-popover p-1 text-popover-foreground shadow-floating',
          visible ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        style={{
          left: rect.left + rect.width / 2,
          top: rect.top + rect.height + FLOATING_PANEL_GAP,
          transform: 'translateX(-50%)',
          opacity: visible ? 1 : 0,
          transition,
        }}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={t.inspector.replace}
                onClick={(e) => {
                  e.stopPropagation();
                  openReplace(anchor);
                }}
                className="inline-flex size-7 items-center justify-center rounded-[5px] text-foreground/85 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <ImageIcon className="size-3.5" />
              </button>
            }
          />
          <TooltipContent side="bottom" data-inspector-ui>
            {t.inspector.replace}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={t.inspector.crop}
                onClick={(e) => {
                  e.stopPropagation();
                  openCrop(anchor as HTMLImageElement);
                }}
                className="inline-flex size-7 items-center justify-center rounded-[5px] text-foreground/85 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <Crop className="size-3.5" />
              </button>
            }
          />
          <TooltipContent side="bottom" data-inspector-ui>
            {t.inspector.crop}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

function sameRect(a: RelRect | null, b: RelRect): boolean {
  return (
    !!a &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

// Only inspect events that originate inside the slide root. Portaled UI
// (dialogs, tooltips, toasts) mounts on `document.body`, outside the root;
// without this guard the capture-phase window listeners swallow clicks
// meant for a dialog and select the slide element behind it instead.
function isInspectableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('[data-inspector-ui]')) return false;
  return !!target.closest('[data-inspector-root]');
}

function pickElement(x: number, y: number): HTMLElement | null {
  const stack = document.elementsFromPoint(x, y);
  for (const el of stack) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.closest('[data-inspector-ui]')) continue;
    if (!el.closest('[data-inspector-root]')) continue;
    return el;
  }
  return null;
}
