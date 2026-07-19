import type React from 'react';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { assetPathFor, hasAssetDrag, readAssetDrag } from '@/lib/asset-dnd';
import { type EditOp, useEditor } from '@/lib/inspector/use-editor';

export function useCanvasAssetDrop(slideId: string) {
  const { applyEdit } = useEditor(slideId ?? '');

  const handleCanvasAssetDragOver = useCallback((e: React.DragEvent) => {
    if (!hasAssetDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleCanvasAssetDrop = useCallback(
    (e: React.DragEvent) => {
      const payload = readAssetDrag(e.dataTransfer);
      if (!payload) return;
      e.preventDefault();
      const target = e.target instanceof HTMLElement ? e.target : null;
      // Drops on an ImagePlaceholder are handled by the placeholder itself.
      if (target?.closest('[data-slide-placeholder]')) return;
      const boundary = e.currentTarget as HTMLElement;
      let el = target;
      let root: HTMLElement | null = null;
      while (el && el !== boundary) {
        if (el.dataset.slideLoc) root = el;
        el = el.parentElement;
      }
      const loc = root?.dataset.slideLoc;
      if (!root || !loc) {
        console.warn('tooka: asset drop landed outside a card root');
        return;
      }
      const sep = loc.indexOf(':');
      const line = Number(loc.slice(0, sep));
      const column = Number(loc.slice(sep + 1));
      if (sep <= 0 || !Number.isFinite(line) || !Number.isFinite(column)) return;
      const rect = root.getBoundingClientRect();
      const scale = root.offsetWidth > 0 ? rect.width / root.offsetWidth : 1;
      const x = Math.round((e.clientX - rect.left) / scale);
      const y = Math.round((e.clientY - rect.top) / scale);
      const ops: EditOp[] = [];
      if (getComputedStyle(root).position === 'static') {
        ops.push({ kind: 'set-style', key: 'position', value: 'relative' });
      }
      ops.push({ kind: 'insert-image', assetPath: assetPathFor(payload), x, y });
      applyEdit(line, column, ops).catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : String(err));
      });
    },
    [applyEdit],
  );

  return { handleCanvasAssetDragOver, handleCanvasAssetDrop };
}
