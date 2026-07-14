import { Globe, Languages } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LOCALE_OPTIONS, setLocale } from '@/lib/locale-store';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';

export function LanguageToggle() {
  const t = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label={t.languageToggle.toggleAria}
        title={t.languageToggle.title}
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
      >
        <Globe className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {LOCALE_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => setLocale(option.id)}
            data-active={t.id === option.id}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TranslationButton() {
  const t = useLocale();

  const handleToggle = () => {
    if (t.id === 'zh-TW') {
      setLocale('en');
    } else {
      setLocale('zh-TW');
    }
  };

  const title = t.id === 'zh-TW' ? 'Translate to English' : '翻譯成繁體中文';

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={title}
      title={title}
      className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
    >
      <Languages className="size-3.5" />
    </button>
  );
}
