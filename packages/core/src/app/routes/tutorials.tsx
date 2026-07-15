import { BookOpen, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { zhTW } from '../../locale/zh-tw';
import { PageTabs } from '../components/page-tabs';
import { tutorialArticlesZhTW } from './tutorials-zh-tw';

export function TutorialsPage() {
  const [activeId, setActiveId] = useState('template-workflow');

  const t = zhTW;
  const articles = tutorialArticlesZhTW;
  const currentArticle = articles.find((a) => a.id === activeId) ?? articles[0];
  const ActiveIcon = currentArticle.icon;

  return (
    <div className="flex h-full flex-col">
      <header className="mb-8 md:mb-12">
        <div className="flex flex-wrap items-center gap-2.5">
          <BookOpen className="size-5 text-brand" />
          <h1 className="font-heading text-xl font-bold tracking-tight md:text-2xl">
            {t.tutorials.pageTitle}
          </h1>
          <PageTabs
            className="ml-auto"
            tabs={[
              { label: t.home.tutorials, path: '/tutorials', icon: BookOpen },
              { label: t.home.prompts, path: '/prompts', icon: Sparkles },
            ]}
          />
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden border-t border-hairline">
        <div className="w-64 shrink-0 border-r border-hairline bg-card/30 overflow-y-auto p-4 space-y-4">
          <div>
            <span className="eyebrow text-xs tracking-wider opacity-60 px-3">
              {t.tutorials.categoryLabel}
            </span>
            <div className="mt-2 space-y-1">
              {articles.map((art) => {
                const Icon = art.icon;
                const active = art.id === activeId;
                return (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => setActiveId(art.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors text-left',
                      active
                        ? 'bg-brand/10 text-brand'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{art.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                {currentArticle.category}
              </span>
            </div>
            <div>
              <h2 className="font-heading text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-3">
                <ActiveIcon className="size-7 text-brand shrink-0" />
                {currentArticle.title}
              </h2>
            </div>
            <hr className="border-hairline" />
            <div className="text-foreground leading-relaxed">{currentArticle.content}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
