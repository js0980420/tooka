import { useLocale } from '@/lib/use-locale';
import { useResizableWidth } from '@/lib/use-resizable-width';
import { cn } from '@/lib/utils';
import { type ThumbnailActions, ThumbnailRail } from '../../components/thumbnail-rail';
import type { CanvasSize, SlideModule } from '../../lib/sdk';

const RAIL_WIDTH_STORAGE_KEY = 'tooka:thumbnail-rail-width';
const DEFAULT_RAIL_WIDTH = 264;
const MIN_RAIL_WIDTH = 200;
const MAX_RAIL_WIDTH = 480;

export function ResizableRail(props: {
  pages: SlideModule['default'];
  design?: SlideModule['design'];
  canvas?: CanvasSize;
  current: number;
  onSelect: (i: number) => void;
  onReorder?: (from: number, to: number) => void;
  actions?: ThumbnailActions;
  moduleTransition?: SlideModule['transition'];
  onOverview?: () => void;
}) {
  const t = useLocale();
  const { width, resizing, onPointerDown, onPointerMove, onPointerUp, onKeyDown, reset } =
    useResizableWidth({
      storageKey: RAIL_WIDTH_STORAGE_KEY,
      defaultWidth: DEFAULT_RAIL_WIDTH,
      min: MIN_RAIL_WIDTH,
      max: MAX_RAIL_WIDTH,
    });

  return (
    <div className="relative hidden shrink-0 md:block" style={{ width }}>
      <ThumbnailRail width={width} {...props} />
      {/* biome-ignore lint/a11y/useSemanticElements: focusable resize handle (splitter pattern), not a static <hr> */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t.thumbnailRail.resizeRail}
        aria-valuenow={width}
        aria-valuemin={MIN_RAIL_WIDTH}
        aria-valuemax={MAX_RAIL_WIDTH}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onDoubleClick={reset}
        className={cn(
          'group/resize absolute inset-y-0 right-0 z-20 w-1.5 translate-x-1/2 cursor-col-resize touch-none outline-none',
          'focus-visible:bg-brand/20',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-brand opacity-0 transition-opacity',
            'group-hover/resize:opacity-100 group-focus-visible/resize:opacity-100',
            resizing && 'opacity-100',
          )}
        />
      </div>
    </div>
  );
}
