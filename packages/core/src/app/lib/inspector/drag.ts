export type Translate = { x: number; y: number };

const PX = /^(-?\d+(?:\.\d+)?)px$/;

export function parseTranslate(value: string): Translate | null {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'none') return { x: 0, y: 0 };
  const parts = trimmed.split(/\s+/);
  if (parts.length > 2) return null;
  const nums = parts.map((part) => PX.exec(part)?.[1]);
  if (nums.some((n) => n === undefined)) return null;
  return { x: Number(nums[0]), y: parts.length === 2 ? Number(nums[1]) : 0 };
}

export function composeTranslate(x: number, y: number): string | null {
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (rx === 0 && ry === 0) return null;
  return `${rx}px ${ry}px`;
}

export function canvasScale(renderedWidth: number, layoutWidth: number): number | null {
  if (!Number.isFinite(renderedWidth) || !Number.isFinite(layoutWidth)) return null;
  if (renderedWidth <= 0 || layoutWidth <= 0) return null;
  return renderedWidth / layoutWidth;
}
