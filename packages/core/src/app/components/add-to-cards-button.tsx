import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { buttonVariants } from '@/components/ui/button';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';

export function AddToCardsButton({
  onAdd,
  className,
}: {
  onAdd: () => Promise<void>;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const t = useLocale();

  const add = async () => {
    setBusy(true);
    try {
      await onAdd();
      toast.success(t.home.toastPromoted);
    } catch {
      toast.error(t.home.toastPromoteFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        add();
      }}
      className={cn(buttonVariants({ variant: 'brand', size: 'sm' }), className)}
    >
      <Plus className="size-3.5" />
      {t.home.addToCards}
    </button>
  );
}
