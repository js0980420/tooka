import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';

export function InlineTitleEditor({
  title,
  onSubmit,
}: {
  title: string;
  onSubmit: (name: string) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const t = useLocale();

  useEffect(() => {
    if (!editing) setValue(title);
  }, [title, editing]);

  useEffect(() => {
    if (editing) {
      queueMicrotask(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing]);

  const commit = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === title) {
      setValue(title);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setValue(title);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-center">
        <div className="inline-grid max-w-full items-center">
          <span
            aria-hidden
            className="invisible col-start-1 row-start-1 overflow-hidden whitespace-pre border border-transparent px-2 py-0.5 font-heading text-[13.5px] font-semibold tracking-[-0.01em]"
          >
            {value || ' '}
          </span>
          <input
            ref={inputRef}
            size={1}
            value={value}
            disabled={saving}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              if (!saving) commit();
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
              }
            }}
            maxLength={80}
            className="col-start-1 row-start-1 w-full min-w-0 rounded-[5px] border border-foreground/30 bg-card px-2 py-0.5 text-center font-heading text-[13.5px] font-semibold tracking-[-0.01em] outline-none"
          />
        </div>
      </div>
    );
  }

  if (!import.meta.env.DEV) {
    return (
      <div className="flex min-w-0 items-baseline justify-center">
        <h1 className="truncate font-heading text-[13.5px] font-semibold tracking-[-0.01em]">
          {title}
        </h1>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center justify-center">
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={t.slide.renameSlide}
        className={cn(
          'min-w-0 max-w-full cursor-text rounded-[5px] border border-transparent px-2 py-0.5 transition-colors',
          'hover:border-foreground/30 hover:bg-card focus-visible:border-foreground/30 focus-visible:bg-card focus-visible:outline-none',
        )}
      >
        <h1 className="truncate font-heading text-[13.5px] font-semibold tracking-[-0.01em]">
          {title}
        </h1>
      </button>
    </div>
  );
}
