import { ChevronLeft, Copy, Plus, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format, useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import type { Locale } from '../../../locale/types';
import { SlidePageProvider } from '../../lib/page-context';
import type { HomeOutletContext } from '../../routes/home-shell';
import { SlideCanvas } from '../slide-canvas';
import { useTemplateSlide } from './templates-gallery';

type PromptFields = { hook: string; main: string; cta: string; ta: string };

const promptStorageKey = (id: string) => `tooka:template-prompt:${id}`;

function defaultPrompt(t: Locale): PromptFields {
  return {
    hook: t.templates.promptDefaultHook,
    main: t.templates.promptDefaultMain,
    cta: t.templates.promptDefaultCta,
    ta: t.templates.promptDefaultTa,
  };
}

function loadStoredPrompt(id: string): Partial<PromptFields> | null {
  try {
    const raw = localStorage.getItem(promptStorageKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Partial<PromptFields>;
  } catch {
    return null;
  }
}

export function TemplateDetail({ templateId, onBack }: { templateId: string; onBack: () => void }) {
  const t = useLocale();
  const { duplicateSlide } = useOutletContext<HomeOutletContext>();
  const slide = useTemplateSlide(templateId);

  const [searchParams] = useSearchParams();
  const [view, setView] = useState<'visual' | 'prompt'>(() =>
    searchParams.get('view') === 'prompt' ? 'prompt' : 'visual',
  );
  const [adding, setAdding] = useState(false);

  const defaults = useMemo(() => defaultPrompt(t), [t]);
  const [prompt, setPrompt] = useState<PromptFields>(() => ({
    ...defaultPrompt(t),
    ...loadStoredPrompt(templateId),
  }));

  const displayTitle = slide?.meta?.title ?? templateId;
  const pages = slide?.default ?? [];

  const addToCards = async () => {
    setAdding(true);
    try {
      const newId = await duplicateSlide(templateId);
      toast.success(format(t.templates.toastAdded, { id: newId }));
      // Full document load: the SPA's virtual slide-list module predates the
      // copy, so a client-side navigate would throw "Slide not found".
      window.location.assign(`${import.meta.env.BASE_URL}s/${newId}`);
    } catch {
      toast.error(t.templates.toastAddFailed);
    } finally {
      setAdding(false);
    }
  };

  const assemblePrompt = () =>
    [
      format(t.templates.promptIntro, { name: displayTitle }),
      `## ${t.templates.hookLabel}\n${prompt.hook}`,
      `## ${t.templates.mainLabel}\n${prompt.main}`,
      `## ${t.templates.ctaLabel}\n${prompt.cta}`,
      `## ${t.templates.taLabel}\n${prompt.ta}`,
    ].join('\n\n');

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(assemblePrompt());
      toast.success(t.templates.toastCopied);
    } catch {
      toast.error(t.templates.toastCopyFailed);
    }
  };

  const savePrompt = () => {
    localStorage.setItem(promptStorageKey(templateId), JSON.stringify(prompt));
    toast.success(t.templates.toastPromptSaved);
  };

  const restoreDefaults = () => {
    localStorage.removeItem(promptStorageKey(templateId));
    setPrompt(defaults);
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ChevronLeft className="size-4" />
          {t.templates.backToGallery}
        </Button>
      </div>

      <header className="flex flex-wrap items-center gap-3">
        <h2 className="font-heading text-[26px] font-semibold leading-[1.05] tracking-[-0.025em] md:text-[32px]">
          {displayTitle}
        </h2>
        <span className="folio self-end pb-1.5">{pages.length.toString().padStart(2, '0')}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="brand" size="sm" disabled={adding || !slide} onClick={addToCards}>
            <Plus className="size-4" />
            {adding ? t.templates.adding : t.templates.addToCards}
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-[7px] border border-border bg-card p-0.5">
          <ViewTab active={view === 'visual'} onClick={() => setView('visual')}>
            {t.templates.visualTab}
          </ViewTab>
          <ViewTab active={view === 'prompt'} onClick={() => setView('prompt')}>
            {t.templates.promptTab}
          </ViewTab>
        </div>
      </div>

      {view === 'visual' ? (
        <PagesGrid slide={slide} />
      ) : (
        <PromptEditor
          prompt={prompt}
          onChange={setPrompt}
          onCopy={copyPrompt}
          onSave={savePrompt}
          onRestore={restoreDefaults}
        />
      )}
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-[5px] px-3 py-1.5 text-[12.5px] font-medium transition-colors',
        active
          ? 'bg-brand text-brand-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function PagesGrid({ slide }: { slide: ReturnType<typeof useTemplateSlide> }) {
  const t = useLocale();
  const pages = slide?.default ?? [];

  if (!slide) {
    return (
      <div className="grid place-items-center rounded-[8px] border border-hairline bg-card py-24 text-[11px] tracking-[0.08em] uppercase text-muted-foreground/60">
        {t.common.loading}
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(200px,100%),1fr))] gap-x-5 gap-y-7 md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
      {pages.map((PageComp, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: pages are position-keyed by design
        <li key={i}>
          <div
            className="relative overflow-hidden rounded-[6px] border border-hairline bg-card shadow-edge ring-1 ring-foreground/[0.04]"
            style={{
              aspectRatio: slide.meta?.canvas
                ? `${slide.meta.canvas.width}/${slide.meta.canvas.height}`
                : '4/5',
            }}
          >
            <SlideCanvas flat freezeMotion design={slide.design} canvas={slide.meta?.canvas}>
              <SlidePageProvider index={i} total={pages.length}>
                <PageComp />
              </SlidePageProvider>
            </SlideCanvas>
          </div>
          <p className="folio mt-2 text-center">
            {format(t.templates.pageOf, { n: i + 1, total: pages.length })}
          </p>
        </li>
      ))}
    </ul>
  );
}

function PromptEditor({
  prompt,
  onChange,
  onCopy,
  onSave,
  onRestore,
}: {
  prompt: PromptFields;
  onChange: (next: PromptFields) => void;
  onCopy: () => void;
  onSave: () => void;
  onRestore: () => void;
}) {
  const t = useLocale();

  const fields: Array<{ key: keyof PromptFields; label: string }> = [
    { key: 'hook', label: t.templates.hookLabel },
    { key: 'main', label: t.templates.mainLabel },
    { key: 'cta', label: t.templates.ctaLabel },
    { key: 'ta', label: t.templates.taLabel },
  ];

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="brand" size="sm" onClick={onCopy}>
          <Copy className="size-4" />
          {t.templates.copyPrompt}
        </Button>
        <Button variant="outline" size="sm" onClick={onSave}>
          {t.templates.savePrompt}
        </Button>
        <Button variant="ghost" size="sm" onClick={onRestore}>
          <RotateCcw className="size-4" />
          {t.templates.restoreDefaults}
        </Button>
        <p className="basis-full text-[11.5px] leading-relaxed text-muted-foreground">
          {t.templates.savedLocallyNote}
        </p>
      </div>

      {fields.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-1.5">
          <label htmlFor={`template-prompt-${key}`} className="eyebrow">
            {label}
          </label>
          <Textarea
            id={`template-prompt-${key}`}
            value={prompt[key]}
            rows={4}
            onChange={(e) => onChange({ ...prompt, [key]: e.target.value })}
            className="text-[13px] leading-relaxed"
          />
        </div>
      ))}
    </div>
  );
}
