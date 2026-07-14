import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../lib/sdk';

export function ExportCropPreview({ crop }: { crop: { width: number; height: number } }) {
  const insetX = Math.max(0, (CANVAS_WIDTH - crop.width) / 2);
  const insetY = Math.max(0, (CANVAS_HEIGHT - crop.height) / 2);
  // IG's profile grid shows posts as 3:4 tiles and hides the sides of any
  // wider image, so mark the zone that survives that crop too.
  const gridSafeInset = Math.max(0, (crop.width - (crop.height * 3) / 4) / 2);

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: insetX,
        top: insetY,
        width: crop.width,
        height: crop.height,
        boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.5)',
        pointerEvents: 'none',
      }}
    >
      {gridSafeInset > 0 && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: gridSafeInset,
              borderLeft: '3px dashed rgb(255 255 255 / 0.75)',
              mixBlendMode: 'difference',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: gridSafeInset,
              borderRight: '3px dashed rgb(255 255 255 / 0.75)',
              mixBlendMode: 'difference',
            }}
          />
        </>
      )}
    </div>
  );
}
