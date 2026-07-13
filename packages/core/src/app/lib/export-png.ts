import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { designToCssVars } from './design';
import { pngFileName } from './export-png-name';
import { SlidePageProvider } from './page-context';
import { PngExportVariantProvider } from './png-export-variant';
import { isFrameAnimationSettled, waitForDataWaitfor, waitForFonts } from './print-ready';
import { CANVAS_HEIGHT, CANVAS_WIDTH, type PngExportVariant, type SlideModule } from './sdk';

const CAPTURE_PIXEL_RATIO = 1;

const ANIMATION_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 100;

const CAPTURE_CLASS = 'os-png-capture';
const CAPTURE_STYLE_ID = 'os-png-capture-style';
// Properties intro animations drive from a hidden start state to a visible end
// state. We read them back once settled and pin them inline so the capture clone
// can't re-run the keyframes from their invisible 0% frame (see freezeForCapture).
const FROZEN_PROPS = ['opacity', 'transform', 'filter', 'clip-path'] as const;

export type PngExportProgress = {
  phase: 'processing' | 'generating' | 'done';
  current: number;
  total: number;
  percent: number;
};

export async function exportSlideAsPng(
  slide: SlideModule,
  slideId: string,
  onProgress?: (progress: PngExportProgress) => void,
  variant?: PngExportVariant,
): Promise<void> {
  const pages = slide.default ?? [];
  if (pages.length === 0) return;

  const total = pages.length;
  onProgress?.({ phase: 'processing', current: 0, total, percent: 0 });

  const container = document.createElement('div');
  container.className = CAPTURE_CLASS;
  container.setAttribute('aria-hidden', 'true');
  Object.assign(container.style, {
    position: 'fixed',
    left: '-99999px',
    top: '0',
    pointerEvents: 'none',
  });
  document.body.appendChild(container);

  // html-to-image clones each frame and copies its computed style — including the
  // intro animation — into the clone, which then re-runs the keyframes from their
  // hidden 0% frame in the rasterised SVG. Fast-forward every animation to its end
  // frame in the live DOM (a large negative delay lands past a 1ms duration, so
  // even pseudo-elements paint their final state on the first frame).
  const captureStyle = document.createElement('style');
  captureStyle.id = CAPTURE_STYLE_ID;
  captureStyle.textContent = `.${CAPTURE_CLASS} *, .${CAPTURE_CLASS} *::before, .${CAPTURE_CLASS} *::after {
    animation-delay: -1s !important;
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    animation-fill-mode: forwards !important;
    transition: none !important;
  }`;
  document.head.appendChild(captureStyle);

  const designVars = slide.design ? designToCssVars(slide.design) : null;

  const reactRoots: Root[] = [];
  const frames: HTMLElement[] = [];
  for (let i = 0; i < pages.length; i++) {
    const Page = pages[i];
    if (!Page) continue;
    const host = document.createElement('div');
    host.setAttribute('data-osd-canvas', '');
    host.style.width = `${CANVAS_WIDTH}px`;
    host.style.height = `${CANVAS_HEIGHT}px`;
    host.style.overflow = 'hidden';
    host.style.background = '#fff';
    if (designVars) {
      for (const [k, v] of Object.entries(designVars)) host.style.setProperty(k, v);
    }
    container.appendChild(host);
    frames.push(host);
    const r = createRoot(host);
    r.render(
      createElement(
        PngExportVariantProvider,
        { value: variant?.id ?? null },
        createElement(SlidePageProvider, { index: i, total: pages.length }, createElement(Page)),
      ),
    );
    reactRoots.push(r);
  }
  await nextPaint();

  try {
    await waitForFonts();

    const deadline = performance.now() + ANIMATION_TIMEOUT_MS;
    while (performance.now() < deadline) {
      const settled = frames.every((frame) => isFrameAnimationSettled(frame));
      if (settled) break;
      await sleep(POLL_INTERVAL_MS);
    }
    await waitForDataWaitfor(container);

    const { toBlob } = await import('html-to-image');
    const images: Uint8Array[] = [];
    for (let i = 0; i < frames.length; i++) {
      freezeForCapture(frames[i]);
      const blob = await toBlob(frames[i], {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        pixelRatio: CAPTURE_PIXEL_RATIO,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      if (!blob) throw new Error(`failed to capture page ${i + 1}`);
      images.push(new Uint8Array(await blob.arrayBuffer()));
      onProgress?.({
        phase: 'processing',
        current: i + 1,
        total,
        percent: Math.min(95, ((i + 1) / total) * 95),
      });
    }

    onProgress?.({ phase: 'generating', current: total, total, percent: 98 });
    const exportId = variant ? `${slideId}-${variant.fileSuffix}` : slideId;
    if (images.length === 1) {
      downloadBlob(new Blob([images[0] as BlobPart], { type: 'image/png' }), `${exportId}.png`);
    } else {
      const { zipSync } = await import('fflate');
      const files: Record<string, Uint8Array> = {};
      for (let i = 0; i < images.length; i++) {
        files[pngFileName(i, images.length)] = images[i];
      }
      const zipped = zipSync(files);
      downloadBlob(new Blob([zipped as BlobPart], { type: 'application/zip' }), `${exportId}.zip`);
    }
  } finally {
    onProgress?.({ phase: 'done', current: total, total, percent: 100 });
    for (const r of reactRoots) r.unmount();
    container.remove();
    captureStyle.remove();
  }
}

// Pin each element's settled visual state inline and remove its animation so the
// clone html-to-image rasterises renders the final frame instead of replaying the
// (initially invisible) keyframes. Pseudo-elements are handled by CAPTURE_STYLE_ID.
function freezeForCapture(root: HTMLElement): void {
  for (const el of root.querySelectorAll<HTMLElement>('*')) {
    const cs = getComputedStyle(el);
    for (const prop of FROZEN_PROPS) {
      el.style.setProperty(prop, cs.getPropertyValue(prop), 'important');
    }
    el.style.setProperty('animation', 'none', 'important');
    el.style.setProperty('transition', 'none', 'important');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    requestAnimationFrame(settle);
    setTimeout(settle, 50);
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
