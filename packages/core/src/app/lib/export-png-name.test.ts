import { describe, expect, it } from 'vitest';
import { pngFileName } from './export-png-name.ts';

describe('pngFileName', () => {
  it('uses zero-padded numbers so uploads sort naturally', () => {
    expect(pngFileName(0, 5)).toBe('01.png');
    expect(pngFileName(2, 12)).toBe('03.png');
    expect(pngFileName(11, 12)).toBe('12.png');
    expect(pngFileName(0, 100)).toBe('001.png');
  });
});
