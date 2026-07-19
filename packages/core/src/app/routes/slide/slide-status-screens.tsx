import config from 'virtual:tooka/config';
import { Link } from 'react-router-dom';
import { useLocale } from '@/lib/use-locale';
import { SlidePreloadLayer } from '../../components/slide-preload-layer';
import type { CanvasSize, SlideModule } from '../../lib/sdk';

const { showSlideBrowser } = config.build;

export function SlideErrorScreen({ error }: { error: string }) {
  const t = useLocale();
  return (
    <div className="mx-auto max-w-3xl px-8 py-16 text-muted-foreground">
      {showSlideBrowser && (
        <Link to="/" className="text-[12px] font-medium text-foreground/70 hover:text-foreground">
          ← {t.common.home}
        </Link>
      )}
      <span className="mt-6 block eyebrow text-destructive/80">{t.common.loadFailed}</span>
      <h2 className="mt-2 font-heading text-xl font-semibold tracking-tight text-foreground">
        {t.common.failedToLoadSlide}
      </h2>
      <pre className="mt-4 overflow-auto rounded-[6px] border border-border bg-card p-4 text-[11.5px] leading-relaxed whitespace-pre-wrap shadow-edge">
        {error}
      </pre>
    </div>
  );
}

export function SlideLoadingScreen({ slideId }: { slideId: string }) {
  const t = useLocale();
  return (
    <div className="grid min-h-dvh place-items-center px-8 text-muted-foreground">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-px w-56 overflow-hidden bg-hairline">
          <span
            aria-hidden
            className="line-loader-bar absolute inset-y-[-0.5px] left-0 w-1/4 bg-foreground"
          />
        </div>
        <div className="flex flex-wrap items-baseline justify-center gap-x-2 text-[11.5px]">
          <span className="eyebrow">{t.slide.loadingEyebrow}</span>
          <span className="font-mono">{slideId}</span>
        </div>
      </div>
    </div>
  );
}

export function SlideEmptyScreen({ slideId }: { slideId: string }) {
  const t = useLocale();
  return (
    <div className="mx-auto max-w-3xl px-8 py-16 text-muted-foreground">
      {showSlideBrowser && (
        <Link to="/" className="text-[12px] font-medium text-foreground/70 hover:text-foreground">
          ← {t.common.home}
        </Link>
      )}
      <span className="mt-6 block eyebrow">{t.slide.emptyEyebrow}</span>
      <h2 className="mt-2 font-heading text-xl font-semibold tracking-tight text-foreground">
        {t.slide.nothingToShow}
      </h2>
      <p className="mt-3 text-[13px] leading-relaxed">
        <code className="rounded-[4px] bg-muted px-1.5 py-0.5 font-mono text-[11.5px]">
          slides/{slideId}/index.tsx
        </code>
        {t.slide.emptyHintMust}
        <code className="rounded-[4px] bg-muted px-1.5 py-0.5 font-mono text-[11.5px]">
          export default
        </code>
        {t.slide.emptyHintSuffix}
      </p>
    </div>
  );
}

export function DeckWarmingScreen({
  slideId,
  pages,
  index,
  design,
  canvas,
  onDone,
}: {
  slideId: string;
  pages: SlideModule['default'];
  index: number;
  design?: SlideModule['design'];
  canvas?: CanvasSize;
  onDone: () => void;
}) {
  const t = useLocale();
  return (
    <div className="grid min-h-dvh place-items-center px-8 text-muted-foreground">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-px w-56 overflow-hidden bg-hairline">
          <span
            aria-hidden
            className="line-loader-bar absolute inset-y-[-0.5px] left-0 w-1/4 bg-foreground"
          />
        </div>
        <div className="flex flex-wrap items-baseline justify-center gap-x-2 text-[11.5px]">
          <span className="eyebrow">{t.slide.loadingAssetsEyebrow}</span>
          <span className="font-mono">{slideId}</span>
        </div>
      </div>
      <SlidePreloadLayer
        pages={pages}
        index={index}
        design={design}
        canvas={canvas}
        includeCurrent
        onDone={onDone}
      />
    </div>
  );
}
