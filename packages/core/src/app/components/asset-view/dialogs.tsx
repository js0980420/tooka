import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AssetEntry, AssetUsage } from '@/lib/assets';
import { format, useLocale } from '@/lib/use-locale';

export function ConflictDialog({
  file,
  onChoose,
}: {
  file: File;
  onChoose: (decision: 'replace' | 'rename' | 'cancel') => void;
}) {
  const t = useLocale();
  const [descPrefix, descSuffix] = t.asset.conflictDescription.split('{name}');
  return (
    <Dialog open onOpenChange={(open) => !open && onChoose('cancel')}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.asset.conflictTitle}</DialogTitle>
          <DialogDescription>
            {descPrefix}
            <span className="font-mono">{file.name}</span>
            {descSuffix}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onChoose('cancel')}>
            {t.common.cancel}
          </Button>
          <Button variant="outline" onClick={() => onChoose('rename')}>
            {t.asset.conflictRenameCopy}
          </Button>
          <Button onClick={() => onChoose('replace')}>{t.asset.conflictReplace}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDialog({
  asset,
  usages,
  onCancel,
  onConfirm,
}: {
  asset: AssetEntry;
  usages: AssetUsage[] | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useLocale();
  const inUse = (usages?.length ?? 0) > 0;
  const totalUses = usages?.reduce((acc, u) => acc + u.count, 0) ?? 0;
  const slideCount = usages?.length ?? 0;
  const [descPrefix, descSuffix] = t.asset.deleteAssetDescription.split('{name}');
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.asset.deleteAssetTitle}</DialogTitle>
          <DialogDescription>
            {inUse ? (
              <>
                {format(t.asset.deleteAssetInUseDescription, {
                  name: asset.name,
                  count: totalUses,
                  slides: slideCount,
                })}{' '}
                {t.asset.deleteAssetInUseHint}
              </>
            ) : (
              <>
                {descPrefix}
                <span className="font-mono">{asset.name}</span>
                {descSuffix}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {inUse && usages && (
          <ul className="max-h-40 overflow-y-auto rounded-[5px] border border-hairline bg-muted/40 px-3 py-2 font-mono text-[11.5px] leading-relaxed">
            {usages.map((u) => (
              <li key={u.slideId} className="flex items-center justify-between gap-3">
                <span className="truncate">{u.slideId}</span>
                <span className="text-muted-foreground">×{u.count}</span>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t.common.cancel}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={usages === null}>
            {inUse ? t.asset.deleteAndRevert : t.common.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
