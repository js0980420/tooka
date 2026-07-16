import { useEffect, useMemo, useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { format, useLocale } from '@/lib/use-locale';
import { SlidePageProvider } from '../../lib/page-context';
import type { SlideModule } from '../../lib/sdk';
import { loadSlide, slideTemplateCategories, slideTemplates } from '../../lib/slides';
import { SlideCanvas } from '../slide-canvas';

export function TemplatesGallery({ onOpen }: { onOpen: (id: string) => void }) {
  const t = useLocale();
  const [category, setCategory] = useState('all');
  const categories = useMemo(
    () => [
      { id: 'all', label: t.templates.allCategory },
      { id: 'carousel', label: t.templates.carouselCategory },
      { id: 'video-banner-thumbnail', label: t.templates.videoBannerThumbnailCategory },
      { id: 'short-video-thumbnail', label: t.templates.shortVideoThumbnailCategory },
    ],
    [t],
  );
  const visibleTemplates = useMemo(
    () =>
      category === 'all'
        ? slideTemplates
        : slideTemplates.filter((id) => (slideTemplateCategories[id] ?? 'carousel') === category),
    [category],
  );

  if (slideTemplates.length === 0) {
    return <TemplatesEmptyState />;
  }

  return (
    <div className="flex flex-col gap-6">
      <ToggleGroup
        value={[category]}
        onValueChange={(value) => setCategory(value[0] ?? 'all')}
        variant="outline"
        spacing={1}
        aria-label={t.templates.categoryLabel}
        className="flex-wrap"
      >
        {categories.map((item) => (
          <ToggleGroupItem key={item.id} value={item.id}>
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {visibleTemplates.length > 0 ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-x-6 gap-y-9 md:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
          {visibleTemplates.map((id) => (
            <li key={id}>
              <TemplateCard
                id={id}
                onOpen={() => onOpen(id)}
                ariaLabel={format(t.templates.openTemplateAria, { name: id })}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-[8px] border border-dashed border-border px-6 py-14 text-center text-[13px] text-muted-foreground">
          {t.templates.noTemplatesInCategory}
        </p>
      )}
    </div>
  );
}

function TemplateCard({
  id,
  onOpen,
  ariaLabel,
}: {
  id: string;
  onOpen: () => void;
  ariaLabel: string;
}) {
  const t = useLocale();
  const slide = useTemplateSlide(id);
  const FirstPage = slide?.default[0];
  const displayTitle = slide?.meta?.title ?? id;
  const canvas = slide?.meta?.canvas;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      className="group block w-full text-left focus-visible:outline-none"
    >
      <div
        className="relative overflow-hidden rounded-[6px] border border-hairline bg-card shadow-edge ring-1 ring-foreground/[0.04] group-hover:shadow-floating group-hover:ring-foreground/20 motion-safe:transition-[box-shadow,--tw-ring-color] motion-safe:duration-200"
        style={{ aspectRatio: canvas ? `${canvas.width}/${canvas.height}` : '4/5' }}
      >
        {FirstPage ? (
          <div className="h-full w-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]">
            <SlideCanvas flat freezeMotion design={slide?.design} canvas={canvas}>
              <SlidePageProvider index={0} total={slide?.default.length ?? 1}>
                <FirstPage />
              </SlidePageProvider>
            </SlideCanvas>
          </div>
        ) : (
          <div className="grid h-full w-full place-items-center text-[10px] tracking-[0.08em] uppercase text-muted-foreground/60">
            {t.common.loading}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <h3 className="min-w-0 truncate font-heading text-[14px] font-medium tracking-tight">
          {displayTitle}
        </h3>
        {slide ? (
          <span className="folio">{slide.default.length.toString().padStart(2, '0')}</span>
        ) : null}
      </div>
      <p className="mt-1 truncate font-mono text-[10.5px] text-muted-foreground/80">{id}</p>
    </button>
  );
}

function TemplatesEmptyState() {
  const t = useLocale();
  return (
    <div className="rounded-[10px] border border-dashed border-border bg-card/60 px-8 py-20">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="text-2xl">🎨</div>
        <p className="mt-3 font-heading text-[15px] font-semibold tracking-tight">
          {t.templates.noTemplatesTitle}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {t.templates.noTemplatesHintPrefix}
          <code className="rounded-[4px] bg-muted px-1.5 py-0.5 font-mono text-[11.5px] text-foreground">
            template: true
          </code>
          {t.templates.noTemplatesHintSuffix}
        </p>
      </div>
    </div>
  );
}

export function useTemplateSlide(id: string): SlideModule | null {
  const [slide, setSlide] = useState<SlideModule | null>(null);
  useEffect(() => {
    let cancelled = false;
    setSlide(null);
    loadSlide(id)
      .then((mod) => {
        if (!cancelled) setSlide(mod);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);
  return slide;
}
