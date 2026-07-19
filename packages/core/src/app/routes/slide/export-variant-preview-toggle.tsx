import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PngExportVariant } from '../../lib/sdk';

export function ExportVariantPreviewToggle({
  label,
  variants,
  value,
  onChange,
}: {
  label: string;
  variants: readonly PngExportVariant[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="absolute top-3 right-3 z-30 flex items-center gap-1 rounded-lg border border-hairline bg-background/95 p-1 shadow-sm backdrop-blur-md">
      <span className="flex items-center gap-1 px-1.5 text-[11px] font-medium text-muted-foreground">
        <Eye className="size-3.5" />
        <span className="hidden xl:inline">{label}</span>
      </span>
      {variants.map((variant) => {
        const active = variant.id === value;
        const variantLabel = variant.previewLabel ?? variant.label;
        return (
          <button
            key={variant.id}
            type="button"
            aria-label={`${label}: ${variantLabel}`}
            aria-pressed={active}
            className={cn(
              'rounded-md px-2 py-1 text-[11px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              active
                ? 'bg-brand text-brand-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            onClick={() => onChange(variant.id)}
          >
            {variantLabel}
          </button>
        );
      })}
    </div>
  );
}
