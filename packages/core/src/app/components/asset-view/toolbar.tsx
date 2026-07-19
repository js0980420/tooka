import { ArrowDown, ArrowUp, ArrowUpDown, Columns3 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { AssetSortKey, AssetSortOptions } from '@/lib/asset-filter';
import { format, useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { MAX_GRID_COLUMNS, MIN_GRID_COLUMNS, SORT_KEYS } from './view-prefs';

export function GridColumnsControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const t = useLocale();
  const valueLabel = format(t.asset.gridColumnsValue, { count: value });
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const thumb = sliderContainerRef.current?.querySelector<HTMLElement>('[role="slider"]');
    thumb?.setAttribute('aria-label', t.asset.gridColumnsAria);
    thumb?.setAttribute('aria-valuetext', valueLabel);
  }, [t.asset.gridColumnsAria, valueLabel]);

  return (
    <fieldset
      aria-label={t.asset.gridColumnsAria}
      title={valueLabel}
      className="m-0 hidden h-8 w-[176px] min-w-0 items-center gap-2 rounded-[6px] border border-border bg-background px-2.5 py-0 lg:flex"
    >
      <Columns3 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <div ref={sliderContainerRef} className="min-w-0 flex-1">
        <Slider
          min={MIN_GRID_COLUMNS}
          max={MAX_GRID_COLUMNS}
          step={1}
          value={[value]}
          onValueChange={(v) => onChange((Array.isArray(v) ? v[0] : v) ?? value)}
        />
      </div>
      <output className="w-4 text-right font-mono text-[10.5px] tabular-nums text-muted-foreground">
        {value}
      </output>
    </fieldset>
  );
}

export function AssetSortControl({
  sort,
  onKeyChange,
  onToggleDirection,
}: {
  sort: AssetSortOptions;
  onKeyChange: (key: AssetSortKey) => void;
  onToggleDirection: () => void;
}) {
  const t = useLocale();
  const labels: Record<AssetSortKey, string> = {
    name: t.asset.nameColumn,
    modified: t.asset.modifiedAt,
    size: t.asset.sizeColumn,
    type: t.asset.typeColumn,
  };
  const directionLabel = sort.direction === 'asc' ? t.asset.sortAscending : t.asset.sortDescending;
  const DirectionIcon = sort.direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div className="flex items-center gap-1">
      <Select
        items={labels}
        value={sort.key}
        onValueChange={(next) => onKeyChange(next as AssetSortKey)}
      >
        <SelectTrigger aria-label={t.asset.sortAria} className="h-8 min-w-[116px]">
          <ArrowUpDown className="size-3.5" aria-hidden />
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {SORT_KEYS.map((key) => (
            <SelectItem key={key} value={key}>
              {labels[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onToggleDirection}
        aria-label={directionLabel}
        title={directionLabel}
        className="size-8 bg-background"
      >
        <DirectionIcon className="size-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}

function SortableColumnHeader({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  sortKey: AssetSortKey;
  sort: AssetSortOptions;
  onSort: (key: AssetSortKey) => void;
  className?: string;
}) {
  const t = useLocale();
  const active = sort.key === sortKey;
  const directionLabel = sort.direction === 'asc' ? t.asset.sortAscending : t.asset.sortDescending;
  const DirectionIcon = sort.direction === 'asc' ? ArrowUp : ArrowDown;
  const sortLabel = format(t.asset.sortByColumn, { column: label });

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      aria-label={active ? `${sortLabel}, ${directionLabel}` : sortLabel}
      title={active ? `${sortLabel} · ${directionLabel}` : sortLabel}
      className={cn(
        'group flex h-5 items-center gap-1 rounded-[4px] text-left outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30',
        active && 'text-foreground',
        className,
      )}
    >
      <span className="truncate">{label}</span>
      {active ? (
        <DirectionIcon className="size-2.5 shrink-0" aria-hidden />
      ) : (
        <ArrowUpDown
          className="size-2.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60"
          aria-hidden
        />
      )}
    </button>
  );
}

export function AssetListHeader({
  sort,
  onSort,
}: {
  sort: AssetSortOptions;
  onSort: (key: AssetSortKey) => void;
}) {
  const t = useLocale();
  return (
    <div className="hidden items-center gap-3 px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 sm:flex">
      <SortableColumnHeader
        label={t.asset.nameColumn}
        sortKey="name"
        sort={sort}
        onSort={onSort}
        className="min-w-0 flex-1"
      />
      <SortableColumnHeader
        label={t.asset.typeColumn}
        sortKey="type"
        sort={sort}
        onSort={onSort}
        className="hidden w-40 shrink-0 md:flex"
      />
      <SortableColumnHeader
        label={t.asset.modifiedAt}
        sortKey="modified"
        sort={sort}
        onSort={onSort}
        className="hidden w-28 shrink-0 lg:flex"
      />
      <SortableColumnHeader
        label={t.asset.sizeColumn}
        sortKey="size"
        sort={sort}
        onSort={onSort}
        className="w-16 shrink-0"
      />
      <span className="w-16 shrink-0 text-right">{t.asset.statusColumn}</span>
      <span className="size-6 shrink-0" aria-hidden />
    </div>
  );
}
