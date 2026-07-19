import type React from 'react';

export function hasFiles(e: React.DragEvent): boolean {
  const types = e.dataTransfer?.types;
  if (!types) return false;
  for (let i = 0; i < types.length; i++) {
    if (types[i] === 'Files') return true;
  }
  return false;
}

export function basenameFromUrl(u: string): string {
  try {
    return new URL(u).pathname.split('/').pop() || '';
  } catch {
    return '';
  }
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const ASSET_DATE_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

export function formatAssetDate(timestamp: number, locale: string, includeTime = false): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  const key = `${locale}:${includeTime ? 'date-time' : 'date'}`;
  let formatter = ASSET_DATE_FORMATTERS.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(
      locale,
      includeTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' },
    );
    ASSET_DATE_FORMATTERS.set(key, formatter);
  }
  return formatter.format(date);
}

export function assetDateTime(timestamp: number): string | undefined {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
