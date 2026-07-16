import { describe, expect, it } from 'vitest';
import { extractMeta } from './tooka-plugin';

describe('extractMeta', () => {
  it('extracts template categories from exported slide metadata', () => {
    expect(
      extractMeta(`
        const templateCategory = 'not-this-one';
        export const meta = {
          template: true,
          templateCategory: 'video-banner-thumbnail',
        };
      `),
    ).toMatchObject({
      template: true,
      templateCategory: 'video-banner-thumbnail',
    });
  });

  it('ignores category-like text outside exported metadata', () => {
    expect(extractMeta(`const templateCategory = 'video-banner-thumbnail';`)).toMatchObject({
      template: false,
      templateCategory: null,
    });
  });
});
