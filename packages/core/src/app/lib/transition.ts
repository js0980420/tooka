import type { Page } from './sdk';

export type TransitionPhase = {
  keyframes: Keyframe[] | PropertyIndexedKeyframes;
  easing?: string;
  duration?: number;
  delay?: number;
};

export type SlideTransition = {
  duration: number;
  easing?: string;
  enter?: TransitionPhase;
  exit?: TransitionPhase;
  sharedElements?: boolean | SharedElementTransition;
};

export type SharedElementTransition = {
  duration?: number;
  easing?: string;
  delay?: number;
};

export const defaultCarouselTransition: SlideTransition = {
  duration: 300,
  enter: {
    keyframes: [
      { transform: 'translateX(calc(var(--osd-dir, 1) * 100%))' },
      { transform: 'translateX(0)' },
    ],
  },
  exit: {
    keyframes: [
      { transform: 'translateX(0)' },
      { transform: 'translateX(calc(var(--osd-dir, 1) * -100%))' },
    ],
  },
};

export function resolveTransition(
  pages: Page[],
  index: number,
  moduleDefault?: SlideTransition,
): SlideTransition | undefined {
  return pages[index]?.transition ?? moduleDefault ?? defaultCarouselTransition;
}
