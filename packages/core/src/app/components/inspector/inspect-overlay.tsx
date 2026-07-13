import { Crop, ImageIcon } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PANEL_TRANSITION_MS } from '@/components/panel/panel-shell';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { canvasScale, composeTranslate, parseTranslate } from '@/lib/inspector/drag';
import { findSlideSource, type SlideSourceHit } from '@/lib/inspector/fiber';
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
  dragging: boolean;
};

type RelRect = { left: number; top: number; width: number; height: number };

const FRAME_FADE_MS = 150;
const FRAME_MORPH_MS = 180;
const LAYOUT_TRACK_MS = PANEL_TRANSITION_MS + FRAME_MORPH_MS;

export function InspectOverlay() {
  const { active, slideId, selected, setSelected, cancel, openCrop, bufferOps } = useInspector();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Highlight | null>(null);

  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  });
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (!active) {
      setHover(null);
      return;
    }

    const endDrag = (revert: boolean) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      document.documentElement.style.cursor = '';
      if (revert && drag.anchor.isConnected) drag.anchor.style.translate = drag.origInline;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      if (dragRef.current) {
        endDrag(true);
        suppressClickRef.current = true;
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
          document.documentElement.style.cursor = 'move';
          setHover(null);
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

    const onPointerDown = (e: PointerEvent) => {
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
      const root = sel.anchor.closest<HTMLElement>('[data-inspector-root]');
      if (!root) return;
      const scale = canvasScale(root.getBoundingClientRect().width, root.offsetWidth);
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
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerCancel, true);
      window.removeEventListener('dragstart', onDragStart, true);
    };
  }, [active, slideId, setSelected, cancel, openCrop, bufferOps]);

  const hoverAnchor = hover?.hit.anchor.isConnected ? hover.hit.anchor : null;
  const selectedAnchor = selected?.anchor.isConnected ? selected.anchor : null;
  const dedupedHover = hoverAnchor && hoverAnchor !== selectedAnchor ? hoverAnchor : null;

  if (!active) return null;
  return (
    <div ref={overlayRef} data-inspector-ui className="pointer-events-none absolute inset-0 z-30">
      <Frame anchor={selectedAnchor} overlayRef={overlayRef} variant="selected" showImageActions />
      <Frame anchor={dedupedHover} overlayRef={overlayRef} variant="hover" />
    </div>
  );
}

type FrameVariant = 'selected' | 'hover';

const FRAME_STYLES: Record<FrameVariant, React.CSSProperties> = {
  selected: { outline: '2px solid #3b82f6', background: 'rgba(59,130,246,0.1)' },
  hover: { outline: '1.5px dashed #3b82f6', background: 'rgba(59,130,246,0.05)' },
};

function Frame({
  anchor,
  overlayRef,
  variant,
  showImageActions = false,
}: {
  anchor: HTMLElement | null;
  overlayRef: React.RefObject<HTMLDivElement>;
  variant: FrameVariant;
  showImageActions?: boolean;
}) {
  const [rect, setRect] = useState<RelRect | null>(null);
  const [hasTarget, setHasTarget] = useState(false);

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
    setRect((prev) => (sameRect(prev, next) ? prev : next));
  }, [overlayRef, anchor]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    if (!anchor) {
      setHasTarget(false);
      return;
    }

    let scheduled = 0;
    let tracking = 0;
    const scheduleMeasure = () => {
      cancelAnimationFrame(scheduled);
      scheduled = requestAnimationFrame(measure);
    };

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    const root = document.querySelector<HTMLElement>('[data-inspector-root]');
    if (root) resizeObserver.observe(root);
    if (overlayRef.current) resizeObserver.observe(overlayRef.current);
    resizeObserver.observe(anchor);

    const stopAt = performance.now() + LAYOUT_TRACK_MS;
    const trackPanelTransition = () => {
      measure();
      if (performance.now() < stopAt) tracking = requestAnimationFrame(trackPanelTransition);
    };
    tracking = requestAnimationFrame(trackPanelTransition);

    window.addEventListener('resize', scheduleMeasure, true);
    window.addEventListener('scroll', scheduleMeasure, true);
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(scheduled);
      cancelAnimationFrame(tracking);
      window.removeEventListener('resize', scheduleMeasure, true);
      window.removeEventListener('scroll', scheduleMeasure, true);
    };
  }, [measure, overlayRef, anchor]);

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

  if (!rect) return null;
  const transition = morph
    ? `left ${FRAME_MORPH_MS}ms ease-out, top ${FRAME_MORPH_MS}ms ease-out, ` +
      `width ${FRAME_MORPH_MS}ms ease-out, height ${FRAME_MORPH_MS}ms ease-out, ` +
      `opacity ${FRAME_FADE_MS}ms ease-out`
    : `opacity ${FRAME_FADE_MS}ms ease-out`;

  const imageAnchor = anchor instanceof HTMLImageElement ? anchor : null;
  const actionsVisible = showImageActions && visible && !!imageAnchor;

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
