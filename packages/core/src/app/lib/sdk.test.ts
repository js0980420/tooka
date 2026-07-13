import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './sdk.ts';

describe('canvas constants', () => {
  it('targets a 1080x1350 canvas', () => {
    expect(CANVAS_WIDTH).toBe(1080);
    expect(CANVAS_HEIGHT).toBe(1350);
  });

  it('preserves a 4:5 aspect ratio', () => {
    expect(CANVAS_WIDTH / CANVAS_HEIGHT).toBeCloseTo(4 / 5);
  });
});
