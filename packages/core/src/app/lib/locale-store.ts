import { useSyncExternalStore } from 'react';
import { en } from '../../locale/en';
import type { Locale } from '../../locale/types';
import { zhCN } from '../../locale/zh-cn';
import { zhTW } from '../../locale/zh-tw';

export type LocaleId = Locale['id'];

const LOCALES: Record<LocaleId, Locale> = {
  'zh-TW': zhTW,
  en,
  'zh-CN': zhCN,
};

export const LOCALE_OPTIONS: ReadonlyArray<{ id: LocaleId; label: string }> = [
  { id: 'zh-TW', label: '繁體中文' },
  { id: 'en', label: 'English' },
  { id: 'zh-CN', label: '简体中文' },
];

const STORAGE_KEY = 'tooka:locale';

function isLocaleId(value: string | null): value is LocaleId {
  return value === 'zh-TW' || value === 'en' || value === 'zh-CN';
}

function readStored(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocaleId(stored)) return LOCALES[stored];
  } catch {}
  return zhTW;
}

// A module-level store (rather than React context) so every React root the
// runtime mounts — the app shell plus the standalone roots used for HTML/PDF
// export — shares one locale without needing a provider above each of them.
let current: Locale = readStored();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Locale {
  return current;
}

export function setLocale(id: LocaleId): void {
  current = LOCALES[id];
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
  for (const listener of listeners) listener();
}

export function useLocaleValue(): Locale {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
