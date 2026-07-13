import { FileImage, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { PreviewDialog } from '@/components/asset-view';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ASSET_DND_TYPE } from '@/lib/asset-dnd';
import { type AssetEntry, useAssets } from '@/lib/assets';
import { format, useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';

const GLOBAL_SLIDE_ID = '@global';

type Scope = 'slide' | 'global';

export function AssetPanel({ slideId }: { slideId: string }) {
  const [scope, setScope] = useState<Scope>('slide');
  const effectiveSlideId = scope === 'global' ? GLOBAL_SLIDE_ID : slideId;
  const { assets, loading, upload } = useAssets(effectiveSlideId);
  const [preview, setPreview] = useState<AssetEntry | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const t = useLocale();

  async function handleFiles(files: FileList | File[]) {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const res = await upload(file);
        if (!res.ok) toast.error(format(t.asset.toastUploadFailed, { status: res.status }));
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <aside
      aria-label={t.asset.sectionAria}
      className={cn(
        'relative flex w-60 shrink-0 flex-col border-hairline border-r bg-sidebar/50',
        dragActive && 'bg-brand/5',
      )}
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        dragDepth.current += 1;
        setDragActive(true);
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragActive(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        dragDepth.current = 0;
        setDragActive(false);
        void handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="flex items-center justify-between gap-2 border-hairline border-b px-3 py-2">
        <Tabs value={scope} onValueChange={(next) => setScope(next as Scope)}>
          <TabsList className="h-7">
            <TabsTrigger value="slide" className="px-2 text-xs">
              {t.asset.scopeSlide}
            </TabsTrigger>
            <TabsTrigger value="global" className="px-2 text-xs">
              {t.asset.scopeGlobal}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.asset.upload}
          title={t.asset.upload}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : assets.length === 0 ? (
          <p className="px-2 py-8 text-center text-muted-foreground text-xs">
            {t.asset.noAssetsYet}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {assets.map((asset) => (
              <PanelThumb
                key={asset.name}
                asset={asset}
                scope={scope}
                onPreview={() => setPreview(asset)}
              />
            ))}
          </div>
        )}
      </div>
      {preview && <PreviewDialog asset={preview} scope={scope} onClose={() => setPreview(null)} />}
    </aside>
  );
}

function PanelThumb({
  asset,
  scope,
  onPreview,
}: {
  asset: AssetEntry;
  scope: Scope;
  onPreview: () => void;
}) {
  const isImage = asset.mime.startsWith('image/');
  const t = useLocale();
  return (
    <button
      type="button"
      draggable={isImage}
      aria-label={format(t.asset.previewAria, { name: asset.name })}
      title={asset.name}
      className="group flex flex-col gap-1 rounded-md border border-hairline bg-background p-1 text-left hover:border-brand/50"
      onClick={onPreview}
      onDragStart={(e) => {
        e.dataTransfer.setData(ASSET_DND_TYPE, JSON.stringify({ name: asset.name, scope }));
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <span className="flex aspect-square items-center justify-center overflow-hidden rounded-[4px] bg-[repeating-conic-gradient(theme(colors.muted)_0_25%,transparent_0_50%)] bg-[length:12px_12px]">
        {isImage ? (
          <img
            src={asset.url}
            alt={asset.name}
            draggable={false}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <FileImage className="size-5 text-muted-foreground" />
        )}
      </span>
      <span className="truncate font-mono text-[10px] text-muted-foreground group-hover:text-foreground">
        {asset.name}
      </span>
    </button>
  );
}
