import {
  BookOpen,
  LayoutGrid,
  LayoutTemplate,
  MoreHorizontal,
  Pencil,
  PencilLine,
  Rocket,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Folder, FolderIcon } from '@/lib/sdk';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { IconPicker } from './icon-picker';

export const SLIDE_DND_MIME = 'application/x-slide-id';

const BUILTIN_ICONS = {
  all: LayoutGrid,
  draft: PencilLine,
  templates: LayoutTemplate,
  publish: Rocket,
  tutorials: BookOpen,
} as const;

function useSlideDragActive() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const onStart = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes(SLIDE_DND_MIME)) setActive(true);
    };
    const onEnd = () => setActive(false);
    document.addEventListener('dragstart', onStart);
    document.addEventListener('dragend', onEnd);
    document.addEventListener('drop', onEnd);
    return () => {
      document.removeEventListener('dragstart', onStart);
      document.removeEventListener('dragend', onEnd);
      document.removeEventListener('drop', onEnd);
    };
  }, []);
  return active;
}

export function FolderIconChip({ icon, className }: { icon: FolderIcon; className?: string }) {
  if (icon.type === 'emoji') {
    return (
      <span
        className={cn(
          'inline-flex size-7 items-center justify-center text-[19px] leading-none',
          className,
        )}
      >
        {icon.value}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-block size-4 rounded-[3px] ring-1 ring-foreground/15 shadow-[inset_0_1px_0_oklch(1_0_0/0.18)]',
        className,
      )}
      style={{ background: icon.value }}
    />
  );
}

type Row =
  | {
      kind: 'folder';
      folder: Folder;
      onRename: (name: string) => void;
      onChangeIcon: (icon: FolderIcon) => void;
      onDelete: () => void;
    }
  | {
      kind: 'all';
    }
  | {
      kind: 'draft';
    }
  | {
      kind: 'templates';
    }
  | {
      kind: 'tutorials';
    }
  | {
      kind: 'publish';
    };

export function FolderItem({
  row,
  count,
  selected,
  onSelect,
  onDropSlide,
}: {
  row: Row;
  count?: number;
  selected: boolean;
  onSelect: () => void;
  onDropSlide: (slideId: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);
  const [draftName, setDraftName] = useState(row.kind === 'folder' ? row.folder.name : '');
  const slideDragActive = useSlideDragActive();
  const t = useLocale();

  const acceptsSlideDrop = row.kind === 'draft' || row.kind === 'folder';
  const isSlideDrag = (e: React.DragEvent) =>
    acceptsSlideDrop && e.dataTransfer.types.includes(SLIDE_DND_MIME);
  const handleDragEnter = (e: React.DragEvent) => {
    if (!isSlideDrag(e)) return;
    dragDepth.current += 1;
    if (dragDepth.current === 1) setDragOver(true);
  };
  const handleDragOver = (e: React.DragEvent) => {
    if (!isSlideDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!isSlideDrag(e)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    if (!acceptsSlideDrop) return;
    const slideId = e.dataTransfer.getData(SLIDE_DND_MIME);
    dragDepth.current = 0;
    setDragOver(false);
    if (!slideId) return;
    e.preventDefault();
    onDropSlide(slideId);
  };

  const BuiltinIcon = row.kind === 'folder' ? null : BUILTIN_ICONS[row.kind];
  const label =
    row.kind === 'all'
      ? t.home.slides
      : row.kind === 'draft'
        ? t.home.draft
        : row.kind === 'templates'
          ? t.home.templates
          : row.kind === 'tutorials'
            ? t.home.tutorials
            : row.kind === 'publish'
              ? t.home.publish
              : row.folder.name;

  const commitRename = () => {
    if (row.kind !== 'folder') return;
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== row.folder.name) row.onRename(trimmed);
    setRenaming(false);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop target wraps interactive children
    <div
      className={cn(
        'group relative flex items-center gap-2.5 rounded-[6px] px-2.5 py-2.5 text-[15px] transition-colors',
        selected
          ? 'bg-muted text-foreground before:absolute before:inset-y-1.5 before:-left-0.5 before:w-[2px] before:rounded-full before:bg-brand'
          : 'text-foreground/70 hover:bg-muted/60 hover:text-foreground',
        slideDragActive && acceptsSlideDrop && !dragOver && 'ring-1 ring-foreground/10',
        dragOver &&
          'bg-brand/10 text-foreground ring-1 ring-brand ring-offset-1 ring-offset-sidebar motion-safe:scale-[1.01] motion-safe:transition-transform',
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {row.kind === 'folder' && import.meta.env.DEV ? (
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="flex size-7 shrink-0 items-center justify-center rounded transition-transform hover:scale-110"
                aria-label={t.home.changeIcon}
                onClick={(e) => e.stopPropagation()}
              >
                <FolderIconChip icon={row.folder.icon} />
              </button>
            }
          />
          <PopoverContent side="right" align="start" className="w-auto p-2">
            <IconPicker value={row.folder.icon} onChange={(next) => row.onChangeIcon(next)} />
          </PopoverContent>
        </Popover>
      ) : (
        <button
          type="button"
          onClick={onSelect}
          aria-label={label}
          className="flex size-7 shrink-0 items-center justify-center"
        >
          {BuiltinIcon ? (
            <BuiltinIcon className="size-5" />
          ) : (
            row.kind === 'folder' && <FolderIconChip icon={row.folder.icon} />
          )}
        </button>
      )}

      {renaming && row.kind === 'folder' ? (
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') {
              setDraftName(row.folder.name);
              setRenaming(false);
            }
          }}
          maxLength={40}
          className="min-w-0 flex-1 rounded-[3px] bg-card px-1 text-[15px] outline-none ring-1 ring-foreground/20"
        />
      ) : (
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate text-left">
          {label}
        </button>
      )}

      {count !== undefined ? (
        <span
          className={cn(
            'folio ml-auto shrink-0 text-[13px] transition-opacity',
            row.kind === 'folder' &&
              import.meta.env.DEV &&
              'group-hover:opacity-0 group-has-[[aria-expanded=true]]:opacity-0',
          )}
        >
          {count.toString().padStart(2, '0')}
        </span>
      ) : null}

      {row.kind === 'folder' && import.meta.env.DEV && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="absolute right-2 top-1/2 size-7 -translate-y-1/2 rounded opacity-0 transition-opacity hover:bg-foreground/10 group-hover:opacity-100 aria-expanded:opacity-100"
                aria-label={t.home.folderActions}
              >
                <MoreHorizontal className="mx-auto size-[18px]" />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-[140px]">
            <DropdownMenuItem
              onClick={() => {
                setDraftName(row.folder.name);
                setRenaming(true);
              }}
            >
              <Pencil />
              {t.common.rename}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => row.onDelete()}>
              <Trash2 />
              {t.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
