import { CloudOff, Loader2, RotateCw, Search, SearchX } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchSvgAsFile, type SvglItem, searchSvgl } from '@/lib/assets';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { basenameFromUrl, slugify } from './utils';

function NoResultsMessage({ query, t }: { query: string; t: ReturnType<typeof useLocale> }) {
  const [prefix, suffix] = t.asset.logoSearchNoResults.split('{query}');
  return (
    <>
      {prefix}
      <span className="font-mono text-foreground">{query}</span>
      {suffix}
    </>
  );
}

const SKELETON_SLOTS = ['s0', 's1', 's2', 's3', 's4', 's5'] as const;

export function LogoSearchDialog({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (file: File) => Promise<void> | void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SvglItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<number>>(() => new Set());
  const [retryToken, setRetryToken] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const t = useLocale();

  useEffect(() => {
    queueMicrotask(() => inputRef.current?.focus());
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: retryToken is a bump-to-refetch trigger
  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      searchSvgl(query, ctrl.signal)
        .then((next) => {
          setResults(next);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (ctrl.signal.aborted) return;
          setError(err instanceof Error ? err.message : t.asset.toastSearchFailed);
          setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, retryToken]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.asset.logoSearchTitle}</DialogTitle>
          <DialogDescription>
            {t.asset.logoSearchPoweredByPrefix}
            <a
              href="https://svgl.app"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              svgl.app
            </a>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.asset.logoSearchPlaceholder}
            className="h-9 w-full rounded-[6px] border border-border bg-background py-2 pl-8 pr-3 text-[13px] outline-none focus-visible:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>

        <div className="max-h-[60vh] min-h-[16rem] overflow-y-auto">
          {error ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <CloudOff className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{t.asset.logoSearchErrorTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.asset.logoSearchErrorBody}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRetryToken((n) => n + 1)}
                className="gap-1.5"
              >
                <RotateCw className="size-3.5" />
                {t.common.tryAgain}
              </Button>
            </div>
          ) : loading && !results ? (
            <div className="grid grid-cols-3 gap-3">
              {SKELETON_SLOTS.map((slot) => (
                <div
                  key={slot}
                  className="aspect-square animate-pulse rounded-lg border bg-muted/40"
                />
              ))}
            </div>
          ) : results && results.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <SearchX className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {query.trim() ? (
                    <NoResultsMessage query={query.trim()} t={t} />
                  ) : (
                    t.asset.logoSearchEmpty
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.asset.logoSearchEmptyHintPrefix}
                  <a
                    href="https://svgl.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    svgl.app
                  </a>
                  {t.asset.logoSearchEmptyHintSuffix}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {results?.map((item) => (
                <LogoResultCard
                  key={item.id}
                  item={item}
                  pending={pending.has(item.id)}
                  onAdd={async (file) => {
                    setPending((prev) => {
                      const next = new Set(prev);
                      next.add(item.id);
                      return next;
                    });
                    try {
                      await onPick(file);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : t.asset.toastDownloadFailed);
                    } finally {
                      setPending((prev) => {
                        const next = new Set(prev);
                        next.delete(item.id);
                        return next;
                      });
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t.common.done}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LogoResultCard({
  item,
  pending,
  onAdd,
}: {
  item: SvglItem;
  pending: boolean;
  onAdd: (file: File) => Promise<void> | void;
}) {
  const hasVariants = typeof item.route === 'object' && item.route !== null;
  const [variant, setVariant] = useState<'light' | 'dark'>('light');
  const t = useLocale();

  const previewUrl = useMemo(() => {
    if (typeof item.route === 'string') return item.route;
    return item.route[variant];
  }, [item.route, variant]);

  const filename = useMemo(() => {
    const url = previewUrl;
    const fromUrl = basenameFromUrl(url);
    if (fromUrl) return fromUrl;
    const slug = slugify(item.title);
    return hasVariants ? `${slug}-${variant}.svg` : `${slug}.svg`;
  }, [previewUrl, item.title, hasVariants, variant]);

  const category = Array.isArray(item.category) ? item.category.join(', ') : item.category;

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border bg-card">
      <div
        className={cn(
          'relative flex aspect-square w-full items-center justify-center overflow-hidden bg-[repeating-conic-gradient(theme(colors.muted)_0_25%,transparent_0_50%)] bg-[length:16px_16px]',
          variant === 'dark' && hasVariants && 'bg-neutral-900',
        )}
      >
        <img src={previewUrl} alt={item.title} className="size-3/4 object-contain" />
      </div>
      <div className="flex flex-col gap-1.5 border-t bg-card px-2.5 py-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium" title={item.title}>
            {item.title}
          </div>
          <div className="truncate text-[10px] text-muted-foreground">{category}</div>
        </div>
        <div className="flex items-center gap-1.5">
          {hasVariants ? (
            <div className="flex overflow-hidden rounded-md border text-[10px]">
              <button
                type="button"
                onClick={() => setVariant('light')}
                className={cn(
                  'px-1.5 py-0.5 transition-colors',
                  variant === 'light' ? 'bg-foreground text-background' : 'hover:bg-muted',
                )}
              >
                {t.asset.logoVariantLight}
              </button>
              <button
                type="button"
                onClick={() => setVariant('dark')}
                className={cn(
                  'border-l px-1.5 py-0.5 transition-colors',
                  variant === 'dark' ? 'bg-foreground text-background' : 'hover:bg-muted',
                )}
              >
                {t.asset.logoVariantDark}
              </button>
            </div>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={async () => {
              try {
                const file = await fetchSvgAsFile(previewUrl, filename);
                await onAdd(file);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : t.asset.toastDownloadFailed);
              }
            }}
            className="ml-auto h-6 px-2 text-[11px]"
          >
            {pending ? <Loader2 className="size-3 animate-spin" /> : t.common.add}
          </Button>
        </div>
      </div>
    </div>
  );
}
