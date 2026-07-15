import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Folder, FolderIcon } from '@/lib/sdk';
import { format, useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { FolderIconChip } from './sidebar/folder-item';
import { PRESET_COLORS } from './sidebar/icon-picker';

export function AddToCardsButton({
  folders,
  onAssign,
  onCreateFolder,
  className,
}: {
  folders: Folder[];
  onAssign: (folderId: string) => Promise<void>;
  onCreateFolder: (name: string, icon: FolderIcon) => Promise<Folder>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useLocale();

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const close = () => {
    setOpen(false);
    setCreating(false);
    setNewName('');
  };

  const promoteTo = async (folder: Folder) => {
    setBusy(true);
    try {
      await onAssign(folder.id);
      close();
      toast.success(format(t.home.toastPromoted, { folder: folder.name }));
    } catch {
      toast.error(t.home.toastPromoteFailed);
    } finally {
      setBusy(false);
    }
  };

  const createAndPromote = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const icon: FolderIcon = {
        type: 'color',
        value: PRESET_COLORS[folders.length % PRESET_COLORS.length],
      };
      const folder = await onCreateFolder(trimmed, icon);
      await onAssign(folder.id);
      close();
      toast.success(format(t.home.toastPromoted, { folder: folder.name }));
    } catch {
      toast.error(t.home.toastPromoteFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setCreating(false);
          setNewName('');
        }
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            className={cn(buttonVariants({ variant: 'brand', size: 'sm' }), className)}
          >
            <Plus className="size-3.5" />
            {t.home.addToCards}
          </button>
        }
      />
      <PopoverContent align="start" className="w-56 p-1">
        {folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            disabled={busy}
            onClick={() => promoteTo(folder)}
            className="flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left text-[12.5px] hover:bg-muted/60 disabled:opacity-50"
          >
            <FolderIconChip icon={folder.icon} />
            <span className="truncate">{folder.name}</span>
          </button>
        ))}
        {folders.length > 0 && <div className="my-1 h-px bg-hairline" aria-hidden />}
        {creating ? (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Enter') createAndPromote();
                if (e.key === 'Escape') setCreating(false);
              }}
              placeholder={t.home.folderName}
              maxLength={40}
              disabled={busy}
              className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left text-[12px] text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            <Plus className="size-3.5" />
            {t.home.newFolder}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
