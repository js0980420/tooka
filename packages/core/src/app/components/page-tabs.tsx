import type { ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type PageTab = {
  label: string;
  path: string;
  icon?: ComponentType<{ className?: string }>;
};

export function PageTabs({ tabs, className }: { tabs: PageTab[]; className?: string }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-0.5 rounded-[7px] border border-hairline bg-card p-0.5 shadow-edge',
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        const Icon = tab.icon;
        return (
          <button
            key={tab.path}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (!active) navigate(tab.path, { replace: true });
            }}
            className={cn(
              'flex h-6 items-center gap-1.5 rounded-[5px] px-2.5 text-[12px] font-medium transition-colors',
              active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {Icon && <Icon className="size-3.5" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
