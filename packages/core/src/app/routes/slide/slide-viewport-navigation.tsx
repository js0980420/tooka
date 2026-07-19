import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { RefObject } from 'react';
import { useInspector } from '@/components/inspector/inspector-provider';
import { Button } from '@/components/ui/button';
import { useClickPageNavigation } from '@/lib/use-click-page-navigation';
import { useIsMobile } from '@/lib/use-is-mobile';
import { useLocale } from '@/lib/use-locale';
import { useWheelPageNavigation } from '@/lib/use-wheel-page-navigation';

export function SlideViewportNavigation({
  targetRef,
  onPrev,
  onNext,
  canPrev,
  canNext,
}: {
  targetRef: RefObject<HTMLElement>;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}) {
  const { active } = useInspector();
  const isMobile = useIsMobile();
  const t = useLocale();

  useWheelPageNavigation({
    ref: targetRef,
    enabled: !active,
    canPrev,
    canNext,
    onPrev,
    onNext,
  });

  // Tap-to-navigate is a touch affordance — desktop has visible prev/next
  // chrome, so it stays edge-only on small screens (matches the old md:hidden
  // zones). Interactive slide content keeps its tap via the hook's passthrough.
  useClickPageNavigation({
    ref: targetRef,
    enabled: isMobile && !active,
    edgeRatio: 0.18,
    canPrev,
    canNext,
    onPrev,
    onNext,
  });

  return (
    <>
      {canPrev ? (
        <Button
          type="button"
          variant="secondary"
          size="icon-lg"
          aria-label={t.slide.prevPageAria}
          onClick={onPrev}
          className="absolute top-1/2 left-3 z-20 -translate-y-1/2 rounded-full shadow-floating backdrop-blur-sm md:left-5"
        >
          <ChevronLeft />
        </Button>
      ) : null}
      {canNext ? (
        <Button
          type="button"
          variant="secondary"
          size="icon-lg"
          aria-label={t.slide.nextPageAria}
          onClick={onNext}
          className="absolute top-1/2 right-3 z-20 -translate-y-1/2 rounded-full shadow-floating backdrop-blur-sm md:right-5"
        >
          <ChevronRight />
        </Button>
      ) : null}
    </>
  );
}
