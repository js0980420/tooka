import { File as FileIcon, ImageIcon, MoreVertical, Pencil, SearchX, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AssetEntry } from '@/lib/assets';
import { format, useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { assetDateTime, formatAssetDate, formatSize } from './utils';
import type { ViewMode } from './view-prefs';

export function EmptyState() {
  const t = useLocale();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-hairline bg-card text-muted-foreground">
        <ImageIcon className="size-5" />
      </div>
      <div>
        <p className="font-heading text-[14px] font-semibold tracking-tight">
          {t.asset.noAssetsYet}
        </p>
        <p className="mt-1 max-w-xs text-[12.5px] leading-relaxed text-muted-foreground">
          {t.asset.noAssetsHintPrefix}
          <span className="font-mono text-foreground">{t.asset.upload}</span>
          {t.asset.noAssetsHintSuffix}
        </p>
      </div>
    </div>
  );
}

export function NoMatchingAssets({ onClear }: { onClear: () => void }) {
  const t = useLocale();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-hairline bg-card text-muted-foreground">
        <SearchX className="size-5" />
      </div>
      <div>
        <p className="font-heading text-[14px] font-semibold tracking-tight">
          {t.asset.noMatchingAssets}
        </p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{t.asset.noMatchingAssetsHint}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onClear}>
        {t.asset.clearFilters}
      </Button>
    </div>
  );
}

export function AssetCard({
  asset,
  onPreview,
  onRename,
  onDelete,
}: {
  asset: AssetEntry;
  onPreview: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const isImage = asset.mime.startsWith('image/');
  const t = useLocale();
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[6px] border border-border bg-card shadow-edge transition-shadow hover:shadow-floating focus-within:ring-2 focus-within:ring-ring/30">
      <button
        type="button"
        onClick={onPreview}
        aria-label={format(t.asset.previewAria, { name: asset.name })}
        className="relative flex aspect-square w-full items-center justify-center overflow-hidden border-b border-hairline bg-[repeating-conic-gradient(theme(colors.muted)_0_25%,transparent_0_50%)] bg-[length:14px_14px]"
      >
        {isImage ? (
          <img
            src={asset.url}
            alt=""
            className="size-full object-contain"
            draggable={false}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <FileIcon className="size-9 text-muted-foreground" />
        )}
      </button>

      <div className="flex items-center gap-1 px-2.5 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-medium" title={asset.name}>
            {asset.name}
          </div>
          <div className="folio flex items-center gap-1.5">
            <span className="truncate">{formatSize(asset.size)}</span>
            <UsageBadge unused={asset.unused} />
          </div>
          <div
            className="mt-0.5 flex min-w-0 items-center gap-1 text-[10.5px] leading-tight text-muted-foreground"
            title={`${t.asset.modifiedAt}: ${formatAssetDate(asset.mtime, t.id, true)}`}
          >
            <span className="shrink-0">{t.asset.modifiedAt}</span>
            <span className="opacity-40">·</span>
            <time dateTime={assetDateTime(asset.mtime)} className="truncate font-mono">
              {formatAssetDate(asset.mtime, t.id)}
            </time>
          </div>
        </div>
        <AssetActions asset={asset} onPreview={onPreview} onRename={onRename} onDelete={onDelete} />
      </div>
    </div>
  );
}

export function AssetListItem({
  asset,
  onPreview,
  onRename,
  onDelete,
}: {
  asset: AssetEntry;
  onPreview: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const isImage = asset.mime.startsWith('image/');
  const t = useLocale();
  return (
    <div className="group flex min-h-14 items-center gap-3 rounded-[6px] border border-border bg-card p-2 shadow-edge transition-shadow hover:shadow-floating focus-within:ring-2 focus-within:ring-ring/30">
      <button
        type="button"
        onClick={onPreview}
        aria-label={format(t.asset.previewAria, { name: asset.name })}
        className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-hairline bg-[repeating-conic-gradient(theme(colors.muted)_0_25%,transparent_0_50%)] bg-[length:10px_10px]"
      >
        {isImage ? (
          <img
            src={asset.url}
            alt=""
            className="size-full object-contain"
            draggable={false}
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <FileIcon className="size-5 text-muted-foreground" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-medium" title={asset.name}>
          {asset.name}
        </div>
        <div className="folio mt-0.5 flex min-w-0 items-center gap-1.5 lg:hidden">
          <span className="sm:hidden">{formatSize(asset.size)}</span>
          <span className="opacity-40 sm:hidden">·</span>
          <span className="truncate md:hidden">{asset.mime}</span>
          <span className="opacity-40 md:hidden">·</span>
          <span className="shrink-0">{t.asset.modifiedAt}</span>
          <time dateTime={assetDateTime(asset.mtime)} className="truncate">
            {formatAssetDate(asset.mtime, t.id)}
          </time>
          <span className="sm:hidden">
            <UsageBadge unused={asset.unused} showUsed />
          </span>
        </div>
      </div>
      <span className="hidden w-40 shrink-0 truncate font-mono text-[11px] text-muted-foreground md:block">
        {asset.mime}
      </span>
      <time
        dateTime={assetDateTime(asset.mtime)}
        title={`${t.asset.modifiedAt}: ${formatAssetDate(asset.mtime, t.id, true)}`}
        className="hidden w-28 shrink-0 text-[11.5px] text-muted-foreground lg:block"
      >
        <span className="sr-only">{t.asset.modifiedAt}: </span>
        {formatAssetDate(asset.mtime, t.id)}
      </time>
      <span className="folio hidden w-16 shrink-0 sm:block">{formatSize(asset.size)}</span>
      <div className="hidden w-16 shrink-0 justify-end sm:flex">
        <UsageBadge unused={asset.unused} showUsed />
      </div>
      <AssetActions asset={asset} onPreview={onPreview} onRename={onRename} onDelete={onDelete} />
    </div>
  );
}

function AssetActions({
  asset,
  onPreview,
  onRename,
  onDelete,
}: {
  asset: AssetEntry;
  onPreview: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const t = useLocale();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label={format(t.asset.actionsAria, { name: asset.name })}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
          'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100',
        )}
      >
        <MoreVertical />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuItem onClick={onPreview}>
          <ImageIcon />
          {t.asset.previewMenuItem}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRename}>
          <Pencil />
          {t.asset.renameMenuItem}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete}>
          <Trash2 />
          {t.asset.deleteMenuItem}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UsageBadge({ unused, showUsed = false }: { unused: boolean; showUsed?: boolean }) {
  const t = useLocale();
  if (!unused && !showUsed) return null;
  return (
    <span
      className={cn(
        'shrink-0 rounded-sm px-1 py-px text-[10px] font-medium leading-none',
        unused
          ? 'bg-muted text-muted-foreground'
          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
      )}
    >
      {unused ? t.asset.usageUnused : t.asset.usageUsed}
    </span>
  );
}

export function RenameAsset({
  asset,
  viewMode,
  onCancel,
  onSubmit,
}: {
  asset: AssetEntry;
  viewMode: ViewMode;
  onCancel: () => void;
  onSubmit: (next: string) => Promise<void> | void;
}) {
  const [value, setValue] = useState(asset.name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const t = useLocale();

  useEffect(() => {
    queueMicrotask(() => {
      inputRef.current?.focus();
      const dot = asset.name.lastIndexOf('.');
      if (dot > 0) inputRef.current?.setSelectionRange(0, dot);
      else inputRef.current?.select();
    });
  }, [asset.name]);

  const commit = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    setSaving(true);
    try {
      await onSubmit(trimmed);
    } finally {
      setSaving(false);
    }
  };

  const isImage = asset.mime.startsWith('image/');
  if (viewMode === 'list') {
    return (
      <div className="flex min-h-14 items-center gap-3 rounded-[6px] border border-primary bg-card p-2 shadow-edge ring-2 ring-primary/15">
        <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-hairline bg-[repeating-conic-gradient(theme(colors.muted)_0_25%,transparent_0_50%)] bg-[length:10px_10px]">
          {isImage ? (
            <img src={asset.url} alt="" className="size-full object-contain" draggable={false} />
          ) : (
            <FileIcon className="size-5 text-muted-foreground" />
          )}
        </div>
        <input
          ref={inputRef}
          value={value}
          disabled={saving}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => {
            if (!saving) commit();
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              onCancel();
            }
          }}
          maxLength={120}
          className="h-8 min-w-0 flex-1 rounded-[5px] border bg-background px-2.5 text-[12.5px] outline-none ring-ring/40 focus:ring-2"
        />
        <span className="hidden w-40 shrink-0 truncate font-mono text-[11px] text-muted-foreground md:block">
          {asset.mime}
        </span>
        <time
          dateTime={assetDateTime(asset.mtime)}
          className="hidden w-28 shrink-0 text-[11.5px] text-muted-foreground lg:block"
        >
          <span className="sr-only">{t.asset.modifiedAt}: </span>
          {formatAssetDate(asset.mtime, t.id)}
        </time>
        <span className="folio hidden w-16 shrink-0 sm:block">{formatSize(asset.size)}</span>
        <div className="hidden w-16 shrink-0 justify-end sm:flex">
          <UsageBadge unused={asset.unused} showUsed />
        </div>
        <div className="size-6 shrink-0" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col overflow-hidden rounded-[6px] border border-primary bg-card shadow-edge ring-2 ring-primary/15">
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-[repeating-conic-gradient(theme(colors.muted)_0_25%,transparent_0_50%)] bg-[length:16px_16px]">
        {isImage ? (
          <img src={asset.url} alt="" className="size-full object-contain" draggable={false} />
        ) : (
          <FileIcon className="size-10 text-muted-foreground" />
        )}
      </div>
      <div className="border-t bg-card px-2 py-2">
        <input
          ref={inputRef}
          value={value}
          disabled={saving}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (!saving) commit();
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
          maxLength={120}
          className="w-full rounded-md border bg-background px-2 py-1 text-sm outline-none ring-ring/40 focus:ring-2"
        />
      </div>
    </div>
  );
}
