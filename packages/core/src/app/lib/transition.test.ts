import { describe, expect, it } from 'vitest';
import type { Page } from './sdk.ts';
import { defaultCarouselTransition, resolveTransition } from './transition.ts';

const page = (transition?: Page['transition']) => Object.assign(() => null, { transition }) as Page;

describe('resolveTransition', () => {
  it('falls back to the IG-style horizontal slide', () => {
    expect(resolveTransition([page()], 0)).toBe(defaultCarouselTransition);
  });

  it('prefers the page transition, then the module default', () => {
    const pageTransition = { duration: 1 };
    const moduleTransition = { duration: 2 };
    expect(resolveTransition([page(pageTransition)], 0, moduleTransition)).toBe(pageTransition);
    expect(resolveTransition([page()], 0, moduleTransition)).toBe(moduleTransition);
  });
});
