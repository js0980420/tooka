import config from 'virtual:tooka/config';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Download,
  Link2,
  Loader2,
  Maximize,
  MonitorSpeaker,
  MoreHorizontal,
  Play,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { InspectToggleButton } from '@/components/inspector/inspector-provider';
import { DesignToggleButton } from '@/components/style-panel/style-panel';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isDraftSlide, PROMOTED_ID } from '@/lib/promotion';
import { slideTemplates } from '@/lib/slides';
import { useIsMobile } from '@/lib/use-is-mobile';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { AddToCardsButton } from '../../components/add-to-cards-button';
import { openPresenterWindow } from '../../components/player';
import type { FoldersManifest } from '../../lib/sdk';
import { AgentConnectedBadge } from './agent-connected-badge';
import { InlineTitleEditor } from './inline-title-editor';

const { showSlideBrowser, allowHtmlDownload } = config.build;

export function SlideToolbar({
  slideId,
  title,
  view,
  setAssetsPanelOpen,
  renameSlide,
  foldersLoading,
  manifest,
  assign,
  copyLink,
  linkCopied,
  exporting,
  exportMenuItems,
  designOpen,
  setDesignOpen,
  setPlayMode,
}: {
  slideId: string;
  title: string;
  view: 'assets' | 'slides';
  setAssetsPanelOpen: (open: boolean) => void;
  renameSlide: (slideId: string, name: string) => Promise<void>;
  foldersLoading: boolean;
  manifest: FoldersManifest;
  assign: (slideId: string, folderId: string | null) => Promise<void>;
  copyLink: () => Promise<void>;
  linkCopied: boolean;
  exporting: boolean;
  exportMenuItems: ReactNode;
  designOpen: boolean;
  setDesignOpen: (update: (v: boolean) => boolean) => void;
  setPlayMode: (mode: 'window' | 'fullscreen' | null) => void;
}) {
  const t = useLocale();
  const isMobile = useIsMobile();

  return (
    /* Editorial toolbar — three zones, hairline separators, mono-folio center */
    <header className="relative flex h-12 shrink-0 items-center gap-2 border-b border-hairline bg-sidebar/85 px-2 backdrop-blur-md md:px-3">
      <div className="flex flex-1 items-center gap-1.5 md:flex-none md:gap-2">
        {showSlideBrowser && (
          <Link
            to="/"
            aria-label={t.slide.backToHome}
            title={t.slide.home}
            className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
          >
            <ChevronLeft className="size-4" />
          </Link>
        )}
        <span aria-hidden className="mx-0.5 hidden h-5 w-px bg-hairline md:block" />
        {import.meta.env.DEV && (
          <Tabs value={view} onValueChange={(next) => setAssetsPanelOpen(next === 'assets')}>
            <TabsList>
              <TabsTrigger value="slides">{t.slide.slidesTab}</TabsTrigger>
              <TabsTrigger value="assets">{t.slide.assetsTab}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        {import.meta.env.DEV && <AgentConnectedBadge />}
      </div>

      {/* On md+ the title centers to the viewport via absolute positioning. On mobile the
          two side groups each flex-1, so the in-flow title lands at the viewport center too —
          and min-w-0 lets it truncate instead of overlapping the icons on narrow widths. */}
      <div className="pointer-events-none relative flex min-w-0 justify-center px-2 md:absolute md:inset-x-0">
        <div className="pointer-events-auto min-w-0 max-w-[34rem]">
          <InlineTitleEditor title={title} onSubmit={(next) => renameSlide(slideId, next)} />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-1 md:ml-auto md:flex-none">
        {import.meta.env.DEV &&
          !foldersLoading &&
          !slideTemplates.includes(slideId) &&
          isDraftSlide(slideId, manifest) && (
            <AddToCardsButton onAdd={() => assign(slideId, PROMOTED_ID)} />
          )}
        {
          <button
            type="button"
            aria-label={t.slide.copyLink}
            title={t.slide.copyLink}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
              'hidden md:inline-flex',
            )}
            onClick={copyLink}
          >
            <span className="relative grid size-4 place-items-center">
              <Link2
                className={cn(
                  'col-start-1 row-start-1 size-4 transition-opacity duration-200',
                  linkCopied ? 'opacity-0' : 'opacity-100',
                )}
              />
              <Check
                className={cn(
                  'col-start-1 row-start-1 size-4 transition-opacity duration-200',
                  linkCopied ? 'opacity-100' : 'opacity-0',
                )}
              />
            </span>
          </button>
        }
        {allowHtmlDownload && (
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              disabled={exporting}
              aria-label={t.slide.download}
              title={t.slide.download}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                'hidden md:inline-flex',
              )}
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              {exportMenuItems}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              disabled={exporting}
              aria-label={t.slide.moreActions}
              title={t.slide.moreActions}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                'inline-flex md:hidden',
              )}
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MoreHorizontal className="size-4" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuItem onClick={copyLink}>
                <Link2 />
                {t.slide.copyLink}
              </DropdownMenuItem>
              {allowHtmlDownload && <DropdownMenuSeparator />}
              {allowHtmlDownload && exportMenuItems}
            </DropdownMenuContent>
          </DropdownMenu>
        }
        {<DesignToggleButton active={designOpen} onToggle={() => setDesignOpen((v) => !v)} />}
        <InspectToggleButton />
        <span aria-hidden className="mx-0.5 hidden h-5 w-px bg-hairline md:block" />
        {
          <div className="inline-flex items-stretch">
            <Button
              size="sm"
              variant="brand"
              onClick={() => setPlayMode(isMobile ? 'window' : 'fullscreen')}
              className="px-2.5 md:rounded-r-none md:px-3"
            >
              <Play className="size-3.5 fill-current" />
              <span className="hidden md:inline">{t.slide.present}</span>
              <kbd className="ml-1 hidden rounded-[3px] bg-brand-foreground/15 px-1 font-mono text-[9.5px] tracking-[0.04em] md:inline">
                F
              </kbd>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                aria-label={t.slide.presentMenuAria}
                title={t.slide.presentMenuAria}
                className={cn(
                  buttonVariants({ variant: 'brand', size: 'sm' }),
                  'hidden rounded-l-none px-1.5 shadow-[inset_1px_0_0_oklch(0_0_0/0.12),inset_0_1px_0_oklch(1_0_0/0.18),0_1px_0_oklch(0_0_0/0.16)] md:inline-flex',
                )}
              >
                <ChevronDown className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
                <DropdownMenuItem onClick={() => setPlayMode('window')}>
                  <Play />
                  {t.slide.presentInWindow}
                  <DropdownMenuShortcut>↵</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPlayMode('fullscreen')}>
                  <Maximize />
                  {t.slide.presentFullscreen}
                  <DropdownMenuShortcut>F</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (slideId) openPresenterWindow(slideId);
                    setPlayMode('window');
                  }}
                >
                  <MonitorSpeaker />
                  {t.slide.presentPresenter}
                  <DropdownMenuShortcut>P</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      </div>
    </header>
  );
}
