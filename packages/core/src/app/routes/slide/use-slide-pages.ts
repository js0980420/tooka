import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { format, useLocale } from '@/lib/use-locale';
import { API } from '../../../shared/api-routes';
import type { ThumbnailActions } from '../../components/thumbnail-rail';
import { remapNotesSessionCacheAfterReorder } from '../../lib/inspector/use-notes';
import type { SlideModule } from '../../lib/sdk';

export function useSlidePages(slideId: string, slide: SlideModule | null) {
  const [searchParams, setSearchParams] = useSearchParams();
  const t = useLocale();

  const modulePages = useMemo(() => slide?.default ?? [], [slide]);
  const [pages, setPages] = useState<typeof modulePages>(modulePages);
  useEffect(() => {
    setPages(modulePages);
  }, [modulePages]);
  const pageCount = pages.length;
  const rawIndex = Number(searchParams.get('p') ?? '1') - 1;
  const index = Number.isFinite(rawIndex) ? Math.max(0, Math.min(pageCount - 1, rawIndex)) : 0;

  const goTo = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(pageCount - 1, i));
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('p', String(clamped + 1));
          return next;
        },
        { replace: true },
      );
    },
    [pageCount, setSearchParams],
  );

  const reorderPage = useCallback(
    async (from: number, to: number) => {
      if (from === to) return;
      const before = pages;
      const nextPages = [...before];
      const [moved] = nextPages.splice(from, 1);
      nextPages.splice(to, 0, moved);
      setPages(nextPages);

      const order = before.map((_, i) => i);
      const [movedIdx] = order.splice(from, 1);
      order.splice(to, 0, movedIdx);

      remapNotesSessionCacheAfterReorder(slideId, order);

      // Keep the user looking at the same page they were on before the drag.
      let nextIndex = index;
      if (index === from) nextIndex = to;
      else if (from < index && to >= index) nextIndex = index - 1;
      else if (from > index && to <= index) nextIndex = index + 1;
      if (nextIndex !== index) goTo(nextIndex);

      try {
        const res = await fetch(`${API.slides}/${encodeURIComponent(slideId)}/reorder`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ order }),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(detail.error ?? `HTTP ${res.status}`);
        }
      } catch (err) {
        setPages(before);
        const inverse = order.map((_, i) => order.indexOf(i));
        remapNotesSessionCacheAfterReorder(slideId, inverse);
        toast.error(`Reorder failed: ${String((err as Error).message ?? err)}`);
      }
    },
    [pages, index, slideId, goTo],
  );

  const duplicatePage = useCallback(
    async (i: number) => {
      const before = pages;
      if (i < 0 || i >= before.length) return;
      const nextPages = [...before];
      nextPages.splice(i + 1, 0, before[i]);
      setPages(nextPages);
      if (index > i) goTo(index + 1);

      try {
        const res = await fetch(
          `${API.slides}/${encodeURIComponent(slideId)}/pages/${i}/duplicate`,
          {
            method: 'POST',
          },
        );
        if (!res.ok) {
          const detail = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(detail.error ?? `HTTP ${res.status}`);
        }
        toast.success(format(t.thumbnailRail.toastDuplicated, { n: i + 1 }));
      } catch (err) {
        setPages(before);
        toast.error(
          `${t.thumbnailRail.toastDuplicateFailed}: ${String((err as Error).message ?? err)}`,
        );
      }
    },
    [pages, index, slideId, goTo, t.thumbnailRail],
  );

  const deletePage = useCallback(
    async (i: number) => {
      const before = pages;
      if (i < 0 || i >= before.length || before.length <= 1) return;
      const nextPages = before.slice(0, i).concat(before.slice(i + 1));
      setPages(nextPages);
      if (index >= i && index > 0) {
        const target = index === i ? Math.min(index, nextPages.length - 1) : index - 1;
        goTo(target);
      }

      try {
        const res = await fetch(`${API.slides}/${encodeURIComponent(slideId)}/pages/${i}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(detail.error ?? `HTTP ${res.status}`);
        }
        toast.success(format(t.thumbnailRail.toastDeleted, { n: i + 1 }));
      } catch (err) {
        setPages(before);
        toast.error(
          `${t.thumbnailRail.toastDeleteFailed}: ${String((err as Error).message ?? err)}`,
        );
      }
    },
    [pages, index, slideId, goTo, t.thumbnailRail],
  );

  const thumbnailActions = useMemo<ThumbnailActions | undefined>(
    () =>
      import.meta.env.DEV
        ? {
            onDuplicate: duplicatePage,
            onDelete: deletePage,
          }
        : undefined,
    [duplicatePage, deletePage],
  );

  return { pages, pageCount, index, goTo, reorderPage, thumbnailActions };
}
