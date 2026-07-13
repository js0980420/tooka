import { ImagePlaceholder, type Page, type SlideMeta } from '@open-cards/core';

const Canvas: Page = () => (
  <div style={{ width: '100%', height: '100%', background: '#FFFFFF' }}>
    <ImagePlaceholder
      hint="Drop an image here"
      width={1080}
      height={1350}
      style={{ border: 'none', borderRadius: 0 }}
    />
  </div>
);

export const meta: SlideMeta = {
  title: 'Blank canvas',
  createdAt: '2026-07-13T22:00:00.000Z',
};

export default [Canvas] satisfies Page[];
