import { cn } from '../lib/utils';

export function CarouselDots({
  total,
  current,
  onSelect,
}: {
  total: number;
  current: number;
  onSelect: (index: number) => void;
}) {
  if (total <= 1) return null;

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5">
      {Array.from({ length: total }, (_, index) => (
        <button
          // biome-ignore lint/suspicious/noArrayIndexKey: Fixed page positions never reorder.
          key={index}
          type="button"
          aria-label={`${index + 1} / ${total}`}
          aria-current={index === current ? 'page' : undefined}
          onClick={() => onSelect(index)}
          className={cn(
            'size-1.5 rounded-full transition-colors',
            index === current ? 'bg-foreground/80' : 'bg-foreground/25 hover:bg-foreground/40',
          )}
        />
      ))}
    </div>
  );
}
