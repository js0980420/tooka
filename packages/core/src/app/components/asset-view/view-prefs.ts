import { useState } from 'react';
import type { AssetSortDirection, AssetSortKey, AssetSortOptions } from '@/lib/asset-filter';

export type ViewMode = 'grid' | 'list';

const VIEW_MODE_STORAGE_KEY = 'tooka:asset-view-mode';
const SORT_STORAGE_KEY = 'tooka:asset-sort-v1';
const GRID_COLUMNS_STORAGE_KEY = 'tooka:asset-grid-columns-v1';
export const MIN_GRID_COLUMNS = 2;
export const MAX_GRID_COLUMNS = 10;
const DEFAULT_GRID_COLUMNS = 4;
export const SORT_KEYS: readonly AssetSortKey[] = ['name', 'modified', 'size', 'type'];
const DEFAULT_SORT: AssetSortOptions = { key: 'name', direction: 'asc' };
export const DEFAULT_SORT_DIRECTIONS: Record<AssetSortKey, AssetSortDirection> = {
  name: 'asc',
  modified: 'desc',
  size: 'desc',
  type: 'asc',
};

function readViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'grid';
  try {
    return window.localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

export function useViewMode(): [ViewMode, (next: ViewMode) => void] {
  const [viewMode, setViewMode] = useState<ViewMode>(readViewMode);
  const update = (next: ViewMode) => {
    setViewMode(next);
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, next);
    } catch {}
  };
  return [viewMode, update];
}

function readSortPreference(): AssetSortOptions {
  if (typeof window === 'undefined') return DEFAULT_SORT;
  try {
    const [key, direction] = window.localStorage.getItem(SORT_STORAGE_KEY)?.split(':') ?? [];
    if (SORT_KEYS.includes(key as AssetSortKey) && (direction === 'asc' || direction === 'desc')) {
      return { key: key as AssetSortKey, direction };
    }
  } catch {}
  return DEFAULT_SORT;
}

export function useSortPreference(): [AssetSortOptions, (next: AssetSortOptions) => void] {
  const [sort, setSort] = useState<AssetSortOptions>(readSortPreference);
  const update = (next: AssetSortOptions) => {
    setSort(next);
    try {
      window.localStorage.setItem(SORT_STORAGE_KEY, `${next.key}:${next.direction}`);
    } catch {}
  };
  return [sort, update];
}

function readGridColumns(): number {
  if (typeof window === 'undefined') return DEFAULT_GRID_COLUMNS;
  try {
    const value = Number(window.localStorage.getItem(GRID_COLUMNS_STORAGE_KEY));
    if (Number.isInteger(value) && value >= MIN_GRID_COLUMNS && value <= MAX_GRID_COLUMNS) {
      return value;
    }
  } catch {}
  return DEFAULT_GRID_COLUMNS;
}

export function useGridColumns(): [number, (next: number) => void] {
  const [gridColumns, setGridColumns] = useState(readGridColumns);
  const update = (next: number) => {
    const value = Math.min(MAX_GRID_COLUMNS, Math.max(MIN_GRID_COLUMNS, Math.round(next)));
    setGridColumns(value);
    try {
      window.localStorage.setItem(GRID_COLUMNS_STORAGE_KEY, String(value));
    } catch {}
  };
  return [gridColumns, update];
}
