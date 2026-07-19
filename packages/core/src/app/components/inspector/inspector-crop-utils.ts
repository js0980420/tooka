import type { ImageCropRect } from './image-crop-dialog';

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function parseObjectViewBox(value: string): ImageCropRect | null {
  const v = value?.trim();
  if (!v || v === 'none') return null;
  const m = v.match(/^inset\(([^)]+)\)$/);
  if (!m?.[1]) return null;
  const nums = m[1]
    .trim()
    .split(/\s+/)
    .map((p) => {
      const n = p.match(/^(-?\d+(?:\.\d+)?)%$/);
      return n?.[1] ? Number(n[1]) : null;
    });
  if (nums.some((n) => n === null)) return null;
  let top: number, right: number, bottom: number, left: number;
  if (nums.length === 1) {
    top = right = bottom = left = nums[0] as number;
  } else if (nums.length === 2) {
    top = bottom = nums[0] as number;
    right = left = nums[1] as number;
  } else if (nums.length === 3) {
    top = nums[0] as number;
    right = left = nums[1] as number;
    bottom = nums[2] as number;
  } else if (nums.length === 4) {
    top = nums[0] as number;
    right = nums[1] as number;
    bottom = nums[2] as number;
    left = nums[3] as number;
  } else {
    return null;
  }
  const x = left;
  const y = top;
  const width = 100 - left - right;
  const height = 100 - top - bottom;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

export function parseObjectPosition(value: string): { x: number; y: number } {
  const parts = value.trim().split(/\s+/);
  const xRaw = parts[0] ?? '50%';
  const yRaw = parts[1] ?? xRaw;
  return { x: parsePercent(xRaw, 50), y: parsePercent(yRaw, 50) };
}

function parsePercent(s: string, fallback: number): number {
  if (s === 'center') return 50;
  if (s === 'left' || s === 'top') return 0;
  if (s === 'right' || s === 'bottom') return 100;
  const m = s.match(/(-?\d+(?:\.\d+)?)%/);
  if (m?.[1]) return Number(m[1]);
  return fallback;
}
