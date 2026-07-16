import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH, resolveCanvasSize } from './sdk.ts';

describe('canvas constants', () => {
  it('targets a 1080x1350 canvas', () => {
    expect(CANVAS_WIDTH).toBe(1080);
    expect(CANVAS_HEIGHT).toBe(1350);
  });

  it('preserves a 4:5 aspect ratio', () => {
    expect(CANVAS_WIDTH / CANVAS_HEIGHT).toBeCloseTo(4 / 5);
  });

  it('resolves a custom canvas from slide metadata', () => {
    expect(resolveCanvasSize({ canvas: { width: 1920, height: 1080 } })).toEqual({
      width: 1920,
      height: 1080,
    });
  });

  it('falls back when custom canvas dimensions are invalid', () => {
    expect(resolveCanvasSize({ canvas: { width: 0, height: 1080 } })).toEqual({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });
    expect(resolveCanvasSize({ canvas: { width: Number.NaN, height: 1080 } })).toEqual({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });
  });
});
