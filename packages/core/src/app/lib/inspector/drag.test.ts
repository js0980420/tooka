import { describe, expect, it } from 'vitest';
import { canvasScale, composeTranslate, parseTranslate } from './drag.ts';

describe('parseTranslate', () => {
  it('treats empty and none as origin', () => {
    expect(parseTranslate('')).toEqual({ x: 0, y: 0 });
    expect(parseTranslate('  ')).toEqual({ x: 0, y: 0 });
    expect(parseTranslate('none')).toEqual({ x: 0, y: 0 });
  });

  it('parses single px value with y defaulting to 0', () => {
    expect(parseTranslate('12px')).toEqual({ x: 12, y: 0 });
    expect(parseTranslate('-8.5px')).toEqual({ x: -8.5, y: 0 });
  });

  it('parses two px values', () => {
    expect(parseTranslate('24px -60px')).toEqual({ x: 24, y: -60 });
    expect(parseTranslate('0px 0px')).toEqual({ x: 0, y: 0 });
  });

  it('rejects non-px forms', () => {
    expect(parseTranslate('-50% -50%')).toBeNull();
    expect(parseTranslate('calc(100% - 10px)')).toBeNull();
    expect(parseTranslate('1px 2px 3px')).toBeNull();
    expect(parseTranslate('12')).toBeNull();
    expect(parseTranslate('12px 50%')).toBeNull();
  });
});

describe('composeTranslate', () => {
  it('returns null at origin so the style key is removed', () => {
    expect(composeTranslate(0, 0)).toBeNull();
    expect(composeTranslate(0.4, -0.4)).toBeNull();
  });

  it('rounds to integer px', () => {
    expect(composeTranslate(24.6, -59.5)).toBe('25px -59px');
    expect(composeTranslate(-1, 0)).toBe('-1px 0px');
  });
});

describe('canvasScale', () => {
  it('computes rendered/layout ratio', () => {
    expect(canvasScale(540, 1080)).toBe(0.5);
    expect(canvasScale(1080, 1080)).toBe(1);
  });

  it('rejects degenerate inputs', () => {
    expect(canvasScale(0, 1080)).toBeNull();
    expect(canvasScale(540, 0)).toBeNull();
    expect(canvasScale(Number.NaN, 1080)).toBeNull();
    expect(canvasScale(540, Number.NaN)).toBeNull();
  });
});
