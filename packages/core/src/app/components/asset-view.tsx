import { ArrowDownToLine, LayoutGrid, List, Search, Upload, X } from 'lucide-react';
import { type ReactNode, useDeferredValue, useId, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  type AssetSortKey,
  type AssetTypeFilter,
  type AssetUsageFilter,
  filterAssets,
  sortAssets,
} from '@/lib/asset-filter';
import {
  type AssetEntry,
  type AssetUsage,
  listAssetUsages,
  renamedCopy,
  revertAssetUsage,
  useAssets,
} from '@/lib/assets';
import { format, useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import {
  AssetCard,
  AssetListItem,
  EmptyState,
  NoMatchingAssets,
  RenameAsset,
} from './asset-view/asset-items';
import { PreviewDialog, type Scope } from './asset-view/crop-compare';
import { ConflictDialog, DeleteDialog } from './asset-view/dialogs';
import { LogoSearchDialog } from './asset-view/logo-search';
import { AssetListHeader, AssetSortControl, GridColumnsControl } from './asset-view/toolbar';
import { hasFiles } from './asset-view/utils';
import {
  DEFAULT_SORT_DIRECTIONS,
  useGridColumns,
  useSortPreference,
  useViewMode,
  type ViewMode,
} from './asset-view/view-prefs';

export { PreviewDialog };

type Props = { slideId: string | null; headerTabs?: ReactNode };

const GLOBAL_SLIDE_ID = '@global';

type ConflictState = {
  file: File;
  resolve: (decision: 'replace' | 'rename' | 'cancel') => void;
};

export function AssetView({ slideId, headerTabs }: Props) {
  const lockedToGlobal = slideId === null;
  const [scope, setScope] = useState<Scope>(lockedToGlobal ? 'global' : 'slide');
  const effectiveSlideId = scope === 'global' || slideId === null ? GLOBAL_SLIDE_ID : slideId;
  const { assets, loading, available, upload, rename, remove } = useAssets(effectiveSlideId);
  const [dragActive, setDragActive] = useState(false);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [preview, setPreview] = useState<AssetEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AssetEntry | null>(null);
  const [confirmDeleteUsages, setConfirmDeleteUsages] = useState<AssetUsage[] | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [logoSearchOpen, setLogoSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [usageFilter, setUsageFilter] = useState<AssetUsageFilter>('all');
  const [typeFilter, setTypeFilter] = useState<AssetTypeFilter>('all');
  const [viewMode, setViewMode] = useViewMode();
  const [sort, setSort] = useSortPreference();
  const [gridColumns, setGridColumns] = useGridColumns();
  const dragDepth = useRef(0);
  const inputId = useId();
  const t = useLocale();

  const deferredQuery = useDeferredValue(query);
  const visibleAssets = useMemo(
    () =>
      sortAssets(
        filterAssets(assets, {
          usage: usageFilter,
          type: typeFilter,
          search: deferredQuery,
        }),
        { key: sort.key, direction: sort.direction },
      ),
    [assets, deferredQuery, sort.direction, sort.key, typeFilter, usageFilter],
  );
  const existingNames = useMemo(() => new Set(assets.map((asset) => asset.name)), [assets]);

  const clearFilters = () => {
    setQuery('');
    setUsageFilter('all');
    setTypeFilter('all');
  };

  const changeSortKey = (key: AssetSortKey) => {
    setSort({ key, direction: DEFAULT_SORT_DIRECTIONS[key] });
  };

  const toggleSortDirection = () => {
    setSort({ key: sort.key, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
  };

  const sortByColumn = (key: AssetSortKey) => {
    setSort({
      key,
      direction:
        sort.key === key
          ? sort.direction === 'asc'
            ? 'desc'
            : 'asc'
          : DEFAULT_SORT_DIRECTIONS[key],
    });
  };

  async function handleFile(file: File) {
    if (!available) return;
    if (existingNames.has(file.name)) {
      const decision = await new Promise<'replace' | 'rename' | 'cancel'>((resolve) => {
        setConflict({ file, resolve });
      });
      if (decision === 'cancel') return;
      if (decision === 'replace') {
        const res = await upload(file, { overwrite: true });
        if (!res.ok) toast.error(format(t.asset.toastUploadFailed, { status: res.status }));
        else toast.success(format(t.asset.toastReplaced, { name: file.name }));
        return;
      }
      const next = renamedCopy(file, existingNames);
      const res = await upload(next, { overwrite: false });
      if (!res.ok) toast.error(format(t.asset.toastUploadFailed, { status: res.status }));
      else toast.success(format(t.asset.toastUploadedAs, { name: next.name }));
      return;
    }
    const res = await upload(file);
    if (!res.ok) toast.error(format(t.asset.toastUploadFailed, { status: res.status }));
    else toast.success(format(t.asset.toastUploaded, { name: file.name }));
  }

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    for (const f of list) {
      // Sequential — keeps the conflict dialog UX coherent and avoids
      // hammering the dev server's filesystem mutations in parallel.
      await handleFile(f);
    }
  }

  async function handleRename(asset: AssetEntry, next: string) {
    if (next === asset.name) {
      setRenaming(null);
      return;
    }
    if (existingNames.has(next)) {
      toast.error(t.asset.nameAlreadyExists);
      return;
    }
    const res = await rename(asset.name, next);
    if (!res.ok) {
      toast.error(format(t.asset.toastRenameFailed, { status: res.status }));
      return;
    }
    toast.success(format(t.asset.toastRenamed, { name: next }));
    setRenaming(null);
  }

  function prepareDelete(asset: AssetEntry) {
    setConfirmDelete(asset);
    setConfirmDeleteUsages(null);
    listAssetUsages(effectiveSlideId, asset.name)
      .then((usages) => setConfirmDeleteUsages(usages))
      .catch(() => setConfirmDeleteUsages([]));
  }

  if (!available) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
        {t.asset.devOnlyMessage}
      </div>
    );
  }

  return (
    <section
      aria-label={t.asset.sectionAria}
      className={cn('relative flex h-full flex-col bg-background')}
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragDepth.current += 1;
        setDragActive(true);
      }}
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragActive(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragDepth.current = 0;
        setDragActive(false);
        if (e.dataTransfer.files.length > 0) {
          handleFiles(e.dataTransfer.files).catch(() => {});
        }
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline bg-sidebar px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {lockedToGlobal ? (
            <span className="eyebrow">{t.asset.eyebrow}</span>
          ) : (
            <Tabs value={scope} onValueChange={(next) => setScope(next as Scope)}>
              <TabsList>
                <TabsTrigger value="slide">{t.asset.scopeSlide}</TabsTrigger>
                <TabsTrigger value="global">{t.asset.scopeGlobal}</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <p className="min-w-0 truncate text-[12px] text-muted-foreground">
            <span className="font-mono text-[11.5px]">
              {scope === 'global' ? 'assets/' : `slides/${slideId}/assets/`}
            </span>
            {!loading && (
              <>
                <span className="mx-2 opacity-50">·</span>
                <span className="folio">
                  {format(assets.length === 1 ? t.asset.fileCount.one : t.asset.fileCount.other, {
                    count: assets.length.toString().padStart(2, '0'),
                  })}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {headerTabs}
          <button
            type="button"
            onClick={() => setLogoSearchOpen(true)}
            className={cn(
              'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[5px] border border-border bg-card px-2.5 text-[12.5px] font-medium transition-colors',
              'hover:bg-muted/60 hover:border-foreground/20 active:translate-y-px',
            )}
          >
            <Search className="size-3.5" />
            <span>{t.asset.searchLogos}</span>
          </button>
          <label
            htmlFor={inputId}
            className={cn(
              'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[5px] bg-foreground px-3 text-[12.5px] font-medium text-background transition-colors',
              'shadow-[inset_0_1px_0_oklch(1_0_0/0.12),0_1px_0_oklch(0_0_0/0.12)]',
              'hover:bg-foreground/90 active:translate-y-px',
            )}
          >
            <Upload className="size-3.5" />
            <span>{t.asset.upload}</span>
          </label>
          <input
            id={inputId}
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFiles(e.target.files).catch(() => {});
                e.target.value = '';
              }
            }}
          />
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-hairline bg-background px-4 py-2.5 sm:px-6">
        <div className="relative min-w-[180px] flex-1 md:max-w-[280px]">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={t.asset.assetSearchPlaceholder}
            placeholder={t.asset.assetSearchPlaceholder}
            className="h-8 w-full rounded-[6px] border border-border bg-background pl-8 pr-7 text-[12.5px] outline-none placeholder:text-muted-foreground/70 focus-visible:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/30"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t.asset.clearAssetSearch}
              className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-[4px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>

        <Select
          items={{
            all: t.asset.usageAll,
            used: t.asset.usageUsed,
            unused: t.asset.usageUnused,
          }}
          value={usageFilter}
          onValueChange={(next) => setUsageFilter(next as AssetUsageFilter)}
        >
          <SelectTrigger aria-label={t.asset.usageFilterAria} className="h-8 min-w-[112px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">{t.asset.usageAll}</SelectItem>
            <SelectItem value="used">{t.asset.usageUsed}</SelectItem>
            <SelectItem value="unused">{t.asset.usageUnused}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          items={{
            all: t.asset.typeAll,
            image: t.asset.typeImage,
            font: t.asset.typeFont,
            video: t.asset.typeVideo,
            other: t.asset.typeOther,
          }}
          value={typeFilter}
          onValueChange={(next) => setTypeFilter(next as AssetTypeFilter)}
        >
          <SelectTrigger aria-label={t.asset.typeFilterAria} className="h-8 min-w-[108px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">{t.asset.typeAll}</SelectItem>
            <SelectItem value="image">{t.asset.typeImage}</SelectItem>
            <SelectItem value="font">{t.asset.typeFont}</SelectItem>
            <SelectItem value="video">{t.asset.typeVideo}</SelectItem>
            <SelectItem value="other">{t.asset.typeOther}</SelectItem>
          </SelectContent>
        </Select>

        <AssetSortControl
          sort={sort}
          onKeyChange={changeSortKey}
          onToggleDirection={toggleSortDirection}
        />

        <div className="ml-auto flex items-center gap-2">
          {viewMode === 'grid' ? (
            <GridColumnsControl value={gridColumns} onChange={setGridColumns} />
          ) : null}
          <ToggleGroup
            value={[viewMode]}
            onValueChange={(value) => {
              const next = value[0];
              if (next) setViewMode(next as ViewMode);
            }}
            variant="outline"
          >
            <ToggleGroupItem
              value="grid"
              aria-label={t.asset.gridViewAria}
              title={t.asset.gridViewAria}
              className="size-8 px-0"
            >
              <LayoutGrid className="size-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="list"
              aria-label={t.asset.listViewAria}
              title={t.asset.listViewAria}
              className="size-8 px-0"
            >
              <List className="size-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t.asset.loading}
          </div>
        ) : assets.length === 0 ? (
          <EmptyState />
        ) : visibleAssets.length === 0 ? (
          <NoMatchingAssets onClear={clearFilters} />
        ) : (
          <div
            className={cn(
              'p-4 sm:p-6',
              viewMode === 'grid'
                ? 'grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 lg:grid-cols-[repeat(var(--asset-grid-columns),minmax(0,1fr))]'
                : 'flex flex-col gap-1',
            )}
            style={
              viewMode === 'grid'
                ? ({ '--asset-grid-columns': gridColumns } as React.CSSProperties)
                : undefined
            }
          >
            {viewMode === 'list' ? <AssetListHeader sort={sort} onSort={sortByColumn} /> : null}
            {visibleAssets.map((asset) =>
              renaming === asset.name ? (
                <RenameAsset
                  key={asset.name}
                  asset={asset}
                  viewMode={viewMode}
                  onCancel={() => setRenaming(null)}
                  onSubmit={(next) => handleRename(asset, next)}
                />
              ) : viewMode === 'grid' ? (
                <AssetCard
                  key={asset.name}
                  asset={asset}
                  onPreview={() => setPreview(asset)}
                  onRename={() => setRenaming(asset.name)}
                  onDelete={() => prepareDelete(asset)}
                />
              ) : (
                <AssetListItem
                  key={asset.name}
                  asset={asset}
                  onPreview={() => setPreview(asset)}
                  onRename={() => setRenaming(asset.name)}
                  onDelete={() => prepareDelete(asset)}
                />
              ),
            )}
          </div>
        )}
      </div>

      {dragActive && (
        <div
          className="pointer-events-none absolute inset-0 z-30 animate-in fade-in-0 duration-200"
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-brand/5" />
          <div className="absolute inset-2 rounded-[10px] border border-dashed border-brand/40" />
          <div className="absolute inset-x-0 bottom-8 flex justify-center">
            <div className="flex animate-in items-center gap-2 rounded-[6px] border border-border bg-card px-3 py-1.5 text-[12px] font-medium shadow-floating fade-in-0 slide-in-from-bottom-1 duration-300">
              <ArrowDownToLine className="size-3.5 text-brand" />
              <span>{t.asset.dropToUpload}</span>
            </div>
          </div>
        </div>
      )}

      {conflict && (
        <ConflictDialog
          file={conflict.file}
          onChoose={(decision) => {
            conflict.resolve(decision);
            setConflict(null);
          }}
        />
      )}

      {confirmDelete && (
        <DeleteDialog
          asset={confirmDelete}
          usages={confirmDeleteUsages}
          onCancel={() => {
            setConfirmDelete(null);
            setConfirmDeleteUsages(null);
          }}
          onConfirm={async () => {
            const target = confirmDelete;
            const usages = confirmDeleteUsages ?? [];
            setConfirmDelete(null);
            setConfirmDeleteUsages(null);
            const assetPath =
              scope === 'global' ? `@assets/${target.name}` : `./assets/${target.name}`;
            for (const u of usages) {
              const rev = await revertAssetUsage(u.slideId, assetPath);
              if (!rev.ok) {
                toast.error(format(t.asset.toastRevertFailed, { slideId: u.slideId }));
                return;
              }
            }
            const res = await remove(target.name);
            if (!res.ok) {
              toast.error(format(t.asset.toastDeleteFailed, { status: res.status }));
              return;
            }
            const totalUsages = usages.reduce((acc, u) => acc + u.count, 0);
            if (totalUsages > 0) {
              toast.success(
                format(t.asset.toastDeletedWithRevert, {
                  name: target.name,
                  count: totalUsages,
                }),
              );
            } else {
              toast.success(format(t.asset.toastDeleted, { name: target.name }));
            }
          }}
        />
      )}

      {preview && <PreviewDialog asset={preview} scope={scope} onClose={() => setPreview(null)} />}

      {logoSearchOpen && (
        <LogoSearchDialog
          onClose={() => setLogoSearchOpen(false)}
          onPick={(file) => handleFile(file)}
        />
      )}
    </section>
  );
}
