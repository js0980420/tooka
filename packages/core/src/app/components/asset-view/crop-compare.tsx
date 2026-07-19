import { FileImage } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AssetEntry } from '@/lib/assets';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '@/lib/sdk';
import { format, useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { assetDateTime, formatAssetDate, formatSize } from './utils';

export type Scope = 'slide' | 'global';

type ImageDims = { w: number; h: number };

function CanvasCompare({ url, name, dims }: { url: string; name: string; dims: ImageDims }) {
  const t = useLocale();
  const maxW = 560;
  const maxH = 320;
  const scale = Math.min(
    maxW / Math.max(dims.w, CANVAS_WIDTH),
    maxH / Math.max(dims.h, CANVAS_HEIGHT),
  );
  const frameW = CANVAS_WIDTH * scale;
  const frameH = CANVAS_HEIGHT * scale;
  const imgW = dims.w * scale;
  const imgH = dims.h * scale;

  const exact = dims.w === CANVAS_WIDTH && dims.h === CANVAS_HEIGHT;
  const ratioMatch = Math.abs(dims.w / dims.h - CANVAS_WIDTH / CANVAS_HEIGHT) < 0.01;
  const lowRes = !exact && (dims.w < CANVAS_WIDTH || dims.h < CANVAS_HEIGHT);
  const fitLabel = exact
    ? t.asset.canvasFitExact
    : ratioMatch
      ? t.asset.canvasFitRatio
      : t.asset.canvasFitMismatch;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-md border bg-muted/30"
        style={{ height: maxH + 32 }}
      >
        <img
          src={url}
          alt={name}
          className="absolute outline outline-1 outline-foreground/25"
          style={{
            width: imgW,
            height: imgH,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 border-2 border-brand/80"
          style={{
            width: frameW,
            height: frameH,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <span className="absolute -top-6 left-0 rounded-sm bg-brand/90 px-1.5 py-0.5 font-mono text-[10px] text-white">
            {format(t.asset.canvasFrameLabel, { w: CANVAS_WIDTH, h: CANVAS_HEIGHT })}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="font-mono text-foreground">
          {format(t.asset.imageDimsLabel, { w: dims.w, h: dims.h })}
        </span>
        <span
          className={cn(
            exact
              ? 'text-emerald-600 dark:text-emerald-400'
              : ratioMatch
                ? 'text-foreground'
                : 'text-amber-600 dark:text-amber-400',
          )}
        >
          {fitLabel}
        </span>
        {lowRes && <span className="text-muted-foreground">{t.asset.canvasFitLowRes}</span>}
      </div>
    </div>
  );
}

function AssetTimestamp({
  label,
  timestamp,
  locale,
}: {
  label: string;
  timestamp: number;
  locale: string;
}) {
  return (
    <div className="bg-card px-3 py-2.5">
      <span className="eyebrow block text-[9px]">{label}</span>
      <time
        dateTime={assetDateTime(timestamp)}
        className="mt-1 block text-[12px] font-medium tabular-nums"
      >
        {formatAssetDate(timestamp, locale, true)}
      </time>
    </div>
  );
}

export function PreviewDialog({
  asset,
  scope,
  onClose,
}: {
  asset: AssetEntry;
  scope: Scope;
  onClose: () => void;
}) {
  const isImage = asset.mime.startsWith('image/');
  const isSvg = asset.mime === 'image/svg+xml';
  const importPath = scope === 'global' ? `@assets/${asset.name}` : `./assets/${asset.name}`;
  const t = useLocale();
  const [dims, setDims] = useState<ImageDims | null>(null);
  const [mode, setMode] = useState<'canvas' | 'original'>('canvas');

  useEffect(() => {
    if (!isImage || isSvg) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setDims({ w: img.naturalWidth, h: img.naturalHeight });
      }
    };
    img.src = asset.url;
  }, [asset.url, isImage, isSvg]);

  const canCompare = isImage && !isSvg && dims !== null;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-base">{asset.name}</DialogTitle>
          <DialogDescription>
            {formatSize(asset.size)} · {asset.mime}
          </DialogDescription>
        </DialogHeader>
        {canCompare && (
          <Tabs value={mode} onValueChange={(next) => setMode(next as 'canvas' | 'original')}>
            <TabsList>
              <TabsTrigger value="canvas">{t.asset.previewTabCanvas}</TabsTrigger>
              <TabsTrigger value="original">{t.asset.previewTabOriginal}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        {canCompare && mode === 'canvas' ? (
          <CanvasCompare url={asset.url} name={asset.name} dims={dims} />
        ) : isImage ? (
          <div className="flex max-h-[60vh] items-center justify-center overflow-hidden rounded-md border bg-[repeating-conic-gradient(theme(colors.muted)_0_25%,transparent_0_50%)] bg-[length:16px_16px]">
            <img
              src={asset.url}
              alt={asset.name}
              className="max-h-[60vh] max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-md border bg-muted/40 py-12 text-muted-foreground">
            <FileImage className="mr-2 size-5" />
            <span className="text-sm">{t.asset.noPreview}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-hairline bg-hairline">
          <AssetTimestamp label={t.asset.createdAt} timestamp={asset.createdAt} locale={t.id} />
          <AssetTimestamp label={t.asset.modifiedAt} timestamp={asset.mtime} locale={t.id} />
        </div>
        <div className="rounded-[5px] border border-hairline bg-muted/50 px-3 py-2 font-mono text-[11.5px] leading-relaxed">
          <span className="text-muted-foreground">{t.asset.importHintComment}</span>
          <span className="text-brand">'{importPath}'</span>
          <span className="text-muted-foreground">{t.asset.importHintSemi}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
