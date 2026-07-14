import { BookOpen, Check, Copy, Edit3, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { PageTabs } from '../components/page-tabs';

type PromptItem = {
  id: string;
  title: string;
  category: string;
  content: string;
  isBuiltIn?: boolean;
};

const STORAGE_KEY = 'open-cards-prompts';

function readCustomPrompts(): PromptItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return (JSON.parse(stored) as PromptItem[]).filter((p) => !p.isBuiltIn);
  } catch {
    return [];
  }
}

export function PromptsPage() {
  const t = useLocale();
  const [customPrompts, setCustomPrompts] = useState<PromptItem[]>([]);
  const [activeId, setActiveId] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formContent, setFormContent] = useState('');

  // Built-ins render from the active locale and never touch localStorage,
  // so switching languages retranslates them.
  const builtInPrompts = useMemo<PromptItem[]>(
    () =>
      ([1, 2, 3, 4, 5] as const).map((n) => ({
        id: `carousel-p${n}`,
        title: t.prompts[`sample${n}Title`],
        category: t.prompts.sampleCategory,
        content: t.prompts[`sample${n}Content`],
        isBuiltIn: true,
      })),
    [t],
  );

  useEffect(() => {
    setCustomPrompts(readCustomPrompts());
  }, []);

  const prompts = useMemo(
    () => [...customPrompts, ...builtInPrompts],
    [customPrompts, builtInPrompts],
  );

  const saveToStorage = (next: PromptItem[]) => {
    setCustomPrompts(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    const category = formCategory.trim() || t.prompts.defaultCategory;
    if (editingId) {
      const updated = customPrompts.map((p) =>
        p.id === editingId ? { ...p, title: formTitle, category, content: formContent } : p,
      );
      saveToStorage(updated);
      setEditingId(null);
    } else {
      const newPrompt: PromptItem = {
        id: `custom-${Date.now()}`,
        title: formTitle,
        category,
        content: formContent,
      };
      saveToStorage([newPrompt, ...customPrompts]);
      setActiveId(newPrompt.id);
    }
    setIsAdding(false);
    setFormTitle('');
    setFormCategory('');
    setFormContent('');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPrompts.filter((p) => p.id !== id);
    saveToStorage(updated);
    if (activeId === id) setActiveId('');
  };

  const startEdit = (p: PromptItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(p.id);
    setFormTitle(p.title);
    setFormCategory(p.category);
    setFormContent(p.content);
    setIsAdding(true);
  };

  const currentPrompt = prompts.find((p) => p.id === activeId) ?? prompts[0];

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <header className="mb-8 md:mb-12">
        <div className="flex flex-wrap items-center gap-2.5">
          <Sparkles className="size-5 text-brand" />
          <h1 className="font-heading text-xl font-bold tracking-tight md:text-2xl">
            {t.prompts.title}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <PageTabs
              tabs={[
                { label: t.home.tutorials, path: '/tutorials', icon: BookOpen },
                { label: t.home.prompts, path: '/prompts', icon: Sparkles },
              ]}
            />
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => {
                setIsAdding(true);
                setEditingId(null);
                setFormTitle('');
                setFormCategory('');
                setFormContent('');
              }}
            >
              <Plus className="size-4" />
              {t.prompts.addPrompt}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden border-t border-hairline">
        <div className="w-72 shrink-0 border-r border-hairline bg-card/30 overflow-y-auto p-4 space-y-4">
          <div>
            <span className="eyebrow text-xs tracking-wider opacity-60 px-3">
              {t.prompts.listHeading}
            </span>
            <div className="mt-2 space-y-1">
              {prompts.map((p) => {
                const active = p.id === (currentPrompt?.id ?? '');
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setActiveId(p.id);
                      setIsAdding(false);
                    }}
                    className={cn(
                      'group flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors text-left',
                      active
                        ? 'bg-brand/10 text-brand'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <div className="truncate pr-2">
                      <span className="text-[10px] opacity-60 block leading-tight font-normal">
                        {p.category}
                      </span>
                      <span className="truncate block font-semibold">{p.title}</span>
                    </div>
                    {!p.isBuiltIn && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => startEdit(p, e)}
                          className="p-1 hover:text-brand"
                          title={t.prompts.editAction}
                        >
                          <Edit3 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(p.id, e)}
                          className="p-1 hover:text-red-500"
                          title={t.prompts.deleteAction}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          {isAdding ? (
            <div className="mx-auto max-w-2xl rounded-xl border border-hairline bg-card p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                {editingId ? t.prompts.editTitle : t.prompts.addTitle}
              </h2>
              <form onSubmit={handleCreateOrUpdate} className="space-y-4 text-[13px]">
                <div className="space-y-1">
                  <label htmlFor="p-title" className="font-semibold text-muted-foreground">
                    {t.prompts.formTitleLabel}
                  </label>
                  <input
                    id="p-title"
                    type="text"
                    required
                    placeholder={t.prompts.formTitlePlaceholder}
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full rounded-md border bg-transparent px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="p-category" className="font-semibold text-muted-foreground">
                    {t.prompts.formCategoryLabel}
                  </label>
                  <input
                    id="p-category"
                    type="text"
                    placeholder={t.prompts.formCategoryPlaceholder}
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-md border bg-transparent px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="p-content" className="font-semibold text-muted-foreground">
                    {t.prompts.formContentLabel}
                  </label>
                  <textarea
                    id="p-content"
                    required
                    rows={6}
                    placeholder={t.prompts.formContentPlaceholder}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="w-full rounded-md border bg-transparent px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-brand font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAdding(false)}
                  >
                    {t.prompts.cancel}
                  </Button>
                  <Button type="submit" size="sm" className="gap-1.5">
                    <Save className="size-4" />
                    {t.prompts.save}
                  </Button>
                </div>
              </form>
            </div>
          ) : currentPrompt ? (
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                  {currentPrompt.category}
                </span>
                {currentPrompt.isBuiltIn && (
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {t.prompts.builtInBadge}
                  </span>
                )}
              </div>
              <div>
                <h2 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
                  {currentPrompt.title}
                </h2>
              </div>
              <hr className="border-hairline" />

              <div className="relative rounded-xl border bg-muted/40 p-5 font-mono text-[13px] leading-relaxed text-foreground whitespace-pre-wrap select-all">
                {currentPrompt.content}
                <button
                  type="button"
                  onClick={() => handleCopy(currentPrompt.content, currentPrompt.id)}
                  className="absolute right-4 top-4 rounded-md border bg-card p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                  title={t.prompts.copyTitle}
                >
                  {copiedId === currentPrompt.id ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
              </div>

              <div className="rounded-lg border border-brand/15 bg-brand/5 p-4 text-[12px] text-muted-foreground leading-normal space-y-1.5">
                <span className="font-bold text-brand block">{t.prompts.tipsTitle}</span>
                <p>{t.prompts.tipsBody}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">{t.prompts.emptyState}</div>
          )}
        </div>
      </div>
    </div>
  );
}
