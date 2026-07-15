import { describe, expect, it } from 'vitest';
import { isDraftSlide, PROMOTED_ID, partitionSlides } from './promotion.ts';
import type { FoldersManifest } from './sdk.ts';

const manifest: FoldersManifest = {
  folders: [{ id: 'f-1', name: 'motion', icon: { type: 'color', value: '#e5484d' } }],
  assignments: { a: 'f-1', c: 'f-gone', e: PROMOTED_ID },
};

describe('partitionSlides', () => {
  it('splits slides into promoted, draft, and byFolder', () => {
    const result = partitionSlides(['a', 'b', 'c'], manifest);
    expect(result.promoted).toEqual(['a']);
    expect(result.draft).toEqual(['b', 'c']);
    expect(result.byFolder).toEqual({ 'f-1': ['a'] });
  });

  it('treats folderless promoted slides as promoted but not in byFolder', () => {
    const result = partitionSlides(['a', 'e'], manifest);
    expect(result.promoted).toEqual(['a', 'e']);
    expect(result.draft).toEqual([]);
    expect(result.byFolder).toEqual({ 'f-1': ['a'] });
  });

  it('treats assignments to deleted folders as drafts', () => {
    const result = partitionSlides(['c'], manifest);
    expect(result.draft).toEqual(['c']);
    expect(result.promoted).toEqual([]);
  });

  it('returns empty lists for an empty manifest', () => {
    const empty: FoldersManifest = { folders: [], assignments: {} };
    const result = partitionSlides(['a'], empty);
    expect(result.promoted).toEqual([]);
    expect(result.draft).toEqual(['a']);
    expect(result.byFolder).toEqual({});
  });

  it('preserves slideIds order within each bucket', () => {
    const m: FoldersManifest = {
      folders: [{ id: 'f-1', name: 'x', icon: { type: 'color', value: '#000' } }],
      assignments: { d: 'f-1', b: 'f-1' },
    };
    const result = partitionSlides(['d', 'c', 'b', 'a'], m);
    expect(result.promoted).toEqual(['d', 'b']);
    expect(result.draft).toEqual(['c', 'a']);
    expect(result.byFolder['f-1']).toEqual(['d', 'b']);
  });
});

describe('isDraftSlide', () => {
  it('is false for a slide assigned to an existing folder', () => {
    expect(isDraftSlide('a', manifest)).toBe(false);
  });

  it('is true for an unassigned slide', () => {
    expect(isDraftSlide('b', manifest)).toBe(true);
  });

  it('is true when the assigned folder no longer exists', () => {
    expect(isDraftSlide('c', manifest)).toBe(true);
  });

  it('is false for a folderless promoted slide', () => {
    expect(isDraftSlide('e', manifest)).toBe(false);
  });
});
