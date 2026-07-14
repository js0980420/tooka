import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type PageTab = { label: string; path: string };

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
        return (
          <button
            key={tab.path}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (!active) navigate(tab.path, { replace: true });
            }}
            className={cn(
              'h-6 rounded-[5px] px-2.5 text-[12px] font-medium transition-colors',
              active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
