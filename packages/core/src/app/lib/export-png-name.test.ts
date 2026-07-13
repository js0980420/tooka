import { describe, expect, it } from 'vitest';
import { pngFileName } from './export-png-name.ts';

describe('pngFileName', () => {
  it('zero-pads to the width of the total count', () => {
    expect(pngFileName(0, 5)).toBe('card-1.png');
    expect(pngFileName(2, 12)).toBe('card-03.png');
    expect(pngFileName(11, 12)).toBe('card-12.png');
  });
});
