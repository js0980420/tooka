import config from 'virtual:tooka/config';
import { useEffect, useState } from 'react';
import { openPresenterWindow } from '../../components/player';

const { showSlideUi } = config.build;

export function useSlideKeyboardNavigation({
  index,
  goTo,
  slideId,
}: {
  index: number;
  goTo: (i: number) => void;
  slideId: string;
}) {
  const [playMode, setPlayMode] = useState<'window' | 'fullscreen' | null>(null);
  const [designOpen, setDesignOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);

  useEffect(() => {
    // When showSlideUi is false the read-only <Player> is rendered and owns
    // keyboard navigation (including step-aware advance/retreat). Attaching this
    // page-nav handler too would race it and skip <Steps> reveals, so bail out.
    if (playMode || !showSlideUi) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          e.target.matches('input, textarea, select, button, a, [role="button"]'))
      ) {
        return;
      }
      // Letter shortcuts only fire bare so browser combos (Cmd/Ctrl-P, ⌘F…) stay intact.
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      // Toggle overview from either state — the overview's own capture-phase
      // handler doesn't consume O, so this stays consistent open ↔ closed.
      if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        setOverviewOpen((v) => !v);
        return;
      }
      // Once overview owns focus, swallow everything else here — its
      // capture-phase listener drives the focused thumbnail.
      if (overviewOpen) return;
      if (
        e.key === 'ArrowRight' ||
        e.key === 'ArrowDown' ||
        e.key === ' ' ||
        e.key === 'PageDown'
      ) {
        e.preventDefault();
        goTo(index + 1);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goTo(index - 1);
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        setPlayMode('fullscreen');
      } else if (e.key === 'Enter') {
        setPlayMode('window');
      } else if (e.key === 'p' || e.key === 'P') {
        if (slideId) openPresenterWindow(slideId);
        setPlayMode('window');
      } else if (import.meta.env.DEV && (e.key === 'd' || e.key === 'D')) {
        setDesignOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, goTo, playMode, slideId, overviewOpen]);

  return { playMode, setPlayMode, designOpen, setDesignOpen, overviewOpen, setOverviewOpen };
}
