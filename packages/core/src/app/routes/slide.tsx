import config from 'virtual:tooka/config';
import { ImageDown } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AssetPanel } from '@/components/asset-panel/asset-panel';
import { HistoryProvider } from '@/components/history-provider';
import { CommentWidget } from '@/components/inspector/comment-widget';
import { InspectOverlay } from '@/components/inspector/inspect-overlay';
import { InspectorPanel } from '@/components/inspector/inspector-panel';
import { InspectorProvider } from '@/components/inspector/inspector-provider';
import { SaveBar } from '@/components/inspector/save-bar';
import { DesignProvider } from '@/components/style-panel/design-provider';
import { DesignPanel } from '@/components/style-panel/style-panel';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useFolders } from '@/lib/folders';
import { useLocale } from '@/lib/use-locale';
import { CarouselDots } from '../components/carousel-dots';
import { ExportCropPreview } from '../components/export-crop-preview';
import { NotesDrawer } from '../components/notes-drawer';
import { OverviewGrid } from '../components/overview-grid';
import { Player } from '../components/player';
import { SlideCanvas } from '../components/slide-canvas';
import { isDeckWarmed, markDeckWarmed } from '../components/slide-preload-layer';
import { SlideTransitionLayer } from '../components/slide-transition-layer';
import { ThumbnailRail } from '../components/thumbnail-rail';
import { PngExportVariantProvider } from '../lib/png-export-variant';
import { usePrefersReducedMotion } from '../lib/use-prefers-reduced-motion';
import { useSlideModule } from '../lib/use-slide-module';
import { ExportVariantPreviewToggle } from './slide/export-variant-preview-toggle';
import { ResizableRail } from './slide/resizable-rail';
import { SelectionReporter } from './slide/selection-reporter';
import {
  DeckWarmingScreen,
  SlideEmptyScreen,
  SlideErrorScreen,
  SlideLoadingScreen,
} from './slide/slide-status-screens';
import { SlideToolbar } from './slide/slide-toolbar';
import { SlideViewportNavigation } from './slide/slide-viewport-navigation';
import { useCanvasAssetDrop } from './slide/use-canvas-asset-drop';
import { usePngExport } from './slide/use-png-export';
import { useSlideKeyboardNavigation } from './slide/use-slide-keyboard-navigation';
import { useSlidePages } from './slide/use-slide-pages';

const { showSlideUi } = config.build;

export function Slide() {
  const { slideId = '' } = useParams();
  const { slide, error } = useSlideModule(slideId);
  const [linkCopied, setLinkCopied] = useState(false);
  const linkCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setWarmedTick] = useState(0);
  const handleAssetsWarmed = useCallback(() => {
    markDeckWarmed(slideId);
    setWarmedTick((n) => n + 1);
  }, [slideId]);

  useEffect(() => {
    return () => {
      if (linkCopiedTimerRef.current) clearTimeout(linkCopiedTimerRef.current);
    };
  }, []);
  const { renameSlide, manifest, loading: foldersLoading, assign } = useFolders();
  const slideViewportRef = useRef<HTMLElement>(null);
  const t = useLocale();
  const prefersReducedMotion = usePrefersReducedMotion();

  const { pages, pageCount, index, goTo, reorderPage, thumbnailActions } = useSlidePages(
    slideId,
    slide,
  );
  const [assetsPanelOpen, setAssetsPanelOpen] = useState(false);
  const view = assetsPanelOpen ? 'assets' : 'slides';
  const [previewVariantOverride, setPreviewVariantOverride] = useState<string | null>(null);
  const pngExportVariants = slide?.pngExportVariants ?? [];
  const defaultPreviewVariantId =
    pngExportVariants.find((variant) => variant.id === 'original')?.id ??
    pngExportVariants[0]?.id ??
    null;
  const previewVariantId = pngExportVariants.some(
    (variant) => variant.id === previewVariantOverride,
  )
    ? previewVariantOverride
    : defaultPreviewVariantId;
  const previewCrop =
    pngExportVariants.find((variant) => variant.id === previewVariantId)?.crop ?? null;

  const { playMode, setPlayMode, designOpen, setDesignOpen, overviewOpen, setOverviewOpen } =
    useSlideKeyboardNavigation({ index, goTo, slideId });
  const { handleCanvasAssetDragOver, handleCanvasAssetDrop } = useCanvasAssetDrop(slideId);
  const { exporting, exportPng } = usePngExport(slide, slideId, pages);

  useEffect(() => {
    if (!import.meta.hot) return;
    if (!slideId || !slide || pageCount === 0) return;
    import.meta.hot.send('tooka:current', {
      slideId,
      pageIndex: index,
      totalPages: pageCount,
      slideTitle: slide.meta?.title ?? slideId,
      view,
    });
  }, [slideId, index, pageCount, slide, view]);

  if (error) {
    return <SlideErrorScreen error={error} />;
  }

  if (!slide) {
    return <SlideLoadingScreen slideId={slideId} />;
  }

  if (pageCount === 0) {
    return <SlideEmptyScreen slideId={slideId} />;
  }

  // Hold the loader while a hidden layer warms the whole deck's images and
  // fonts, so the slide UI first paints with every asset already in cache.
  if (!isDeckWarmed(slideId)) {
    return (
      <DeckWarmingScreen
        slideId={slideId}
        pages={pages}
        index={index}
        design={slide.design}
        canvas={slide.meta?.canvas}
        onDone={handleAssetsWarmed}
      />
    );
  }

  if (!showSlideUi) {
    return (
      <Player
        pages={pages}
        design={slide.design}
        canvas={slide.meta?.canvas}
        transition={slide.transition}
        index={index}
        onIndexChange={goTo}
        onExit={() => {}}
        allowExit={false}
      />
    );
  }

  if (playMode) {
    return (
      <Player
        pages={pages}
        design={slide.design}
        canvas={slide.meta?.canvas}
        transition={slide.transition}
        index={index}
        onIndexChange={goTo}
        onExit={() => setPlayMode(null)}
        controls
        slideId={slideId}
        fullscreen={playMode === 'fullscreen'}
      />
    );
  }

  const title = slide.meta?.title ?? slideId;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t.slide.toastCopyLinkSuccess);
      setLinkCopied(true);
      if (linkCopiedTimerRef.current) clearTimeout(linkCopiedTimerRef.current);
      linkCopiedTimerRef.current = setTimeout(() => setLinkCopied(false), 1200);
    } catch (err) {
      console.error('[tooka] copy link failed', err);
      toast.error(t.slide.toastCopyLinkFailed);
    }
  };

  const exportMenuItems = (
    <>
      {/* PDF 匯出暫時停用
      <DropdownMenuItem disabled={exporting} onClick={exportPdf}>
        <FileText />
        {t.slide.exportAsPdf}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      */}
      {slide?.pngExportVariants?.length ? (
        slide.pngExportVariants.map((variant) => (
          <DropdownMenuItem
            key={variant.id}
            disabled={exporting}
            onClick={() => exportPng(variant)}
          >
            <ImageDown />
            {variant.label}
          </DropdownMenuItem>
        ))
      ) : (
        <DropdownMenuItem disabled={exporting} onClick={() => exportPng()}>
          <ImageDown />
          {t.slide.exportAsPng}
        </DropdownMenuItem>
      )}
    </>
  );

  return (
    <HistoryProvider>
      <InspectorProvider slideId={slideId} pageIndex={index}>
        <SelectionReporter />
        <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
          <SlideToolbar
            slideId={slideId}
            title={title}
            view={view}
            setAssetsPanelOpen={setAssetsPanelOpen}
            renameSlide={renameSlide}
            foldersLoading={foldersLoading}
            manifest={manifest}
            assign={assign}
            copyLink={copyLink}
            linkCopied={linkCopied}
            exporting={exporting}
            exportMenuItems={exportMenuItems}
            designOpen={designOpen}
            setDesignOpen={setDesignOpen}
            setPlayMode={setPlayMode}
          />

          <PngExportVariantProvider value={previewVariantId}>
            <DesignProvider slideId={slideId}>
              <div className="relative flex min-h-0 flex-1 flex-col">
                <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                  <ResizableRail
                    pages={pages}
                    design={slide.design}
                    canvas={slide.meta?.canvas}
                    current={index}
                    onSelect={goTo}
                    onReorder={import.meta.env.DEV ? reorderPage : undefined}
                    actions={thumbnailActions}
                    moduleTransition={slide.transition}
                    onOverview={() => setOverviewOpen(true)}
                  />
                  {import.meta.env.DEV && assetsPanelOpen && slideId && (
                    <AssetPanel slideId={slideId} />
                  )}
                  <main
                    ref={slideViewportRef}
                    data-inspector-root
                    data-slide-id={slideId}
                    className="relative min-h-0 min-w-0 flex-1 bg-canvas p-1 md:p-3"
                    onDragOver={import.meta.env.DEV ? handleCanvasAssetDragOver : undefined}
                    onDrop={import.meta.env.DEV ? handleCanvasAssetDrop : undefined}
                  >
                    {pngExportVariants.length > 1 && previewVariantId && (
                      <ExportVariantPreviewToggle
                        label={t.slide.preview}
                        variants={pngExportVariants}
                        value={previewVariantId}
                        onChange={setPreviewVariantOverride}
                      />
                    )}
                    <SlideViewportNavigation
                      targetRef={slideViewportRef}
                      onPrev={() => goTo(index - 1)}
                      onNext={() => goTo(index + 1)}
                      canPrev={index > 0}
                      canNext={index < pageCount - 1}
                    />
                    <SlideCanvas design={slide.design} canvas={slide.meta?.canvas}>
                      <SlideTransitionLayer
                        pages={pages}
                        index={index}
                        total={pageCount}
                        moduleTransition={slide.transition}
                        disabled={prefersReducedMotion}
                      />
                      {previewCrop && <ExportCropPreview crop={previewCrop} />}
                    </SlideCanvas>
                    <CarouselDots total={pageCount} current={index} onSelect={goTo} />
                    <InspectOverlay />
                    <SaveBar />
                    {import.meta.env.DEV && <CommentWidget />}
                  </main>
                  {/* Mobile-only horizontal rail. Sits below the canvas and
                    pads its bottom for the iOS home indicator / Safari URL bar. */}
                  <div
                    className="shrink-0 border-t border-hairline md:hidden"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                  >
                    <ThumbnailRail
                      pages={pages}
                      design={slide.design}
                      canvas={slide.meta?.canvas}
                      current={index}
                      onSelect={goTo}
                      orientation="horizontal"
                      actions={thumbnailActions}
                    />
                  </div>
                  <InspectorPanel />
                  <DesignPanel open={designOpen} onClose={() => setDesignOpen(false)} />
                </div>
                {import.meta.env.DEV && (
                  <NotesDrawer
                    slideId={slideId}
                    index={index}
                    total={pageCount}
                    initial={slide.notes?.[index]}
                  />
                )}
                <OverviewGrid
                  pages={pages}
                  design={slide.design}
                  canvas={slide.meta?.canvas}
                  open={overviewOpen}
                  current={index}
                  onClose={() => setOverviewOpen(false)}
                  onSelect={goTo}
                  variant="editor"
                  moduleTransition={slide.transition}
                />
              </div>
            </DesignProvider>
          </PngExportVariantProvider>
        </div>
      </InspectorProvider>
    </HistoryProvider>
  );
}
