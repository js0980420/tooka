import { PROMOTED_ID } from '../../shared/promotion.ts';
import type { FoldersManifest } from './sdk';

export { PROMOTED_ID };

export type SlidePartition = {
  promoted: string[];
  draft: string[];
  byFolder: Record<string, string[]>;
};

export function partitionSlides(slideIds: string[], manifest: FoldersManifest): SlidePartition {
  const known = new Set(manifest.folders.map((f) => f.id));
  const promoted: string[] = [];
  const draft: string[] = [];
  const byFolder: Record<string, string[]> = {};
  for (const id of slideIds) {
    const folderId = manifest.assignments[id];
    if (folderId === PROMOTED_ID) {
      promoted.push(id);
    } else if (folderId && known.has(folderId)) {
      promoted.push(id);
      byFolder[folderId] ??= [];
      byFolder[folderId].push(id);
    } else {
      draft.push(id);
    }
  }
  return { promoted, draft, byFolder };
}

export function isDraftSlide(slideId: string, manifest: FoldersManifest): boolean {
  const folderId = manifest.assignments[slideId];
  if (folderId === PROMOTED_ID) return false;
  return !folderId || !manifest.folders.some((f) => f.id === folderId);
}
