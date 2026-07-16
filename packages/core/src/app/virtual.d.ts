declare module 'virtual:tooka/slides' {
  import type { SlideModule } from './lib/sdk';
  export const slideIds: string[];
  export const slideThemes: Record<string, string>;
  export const slideCreatedAt: Record<string, number>;
  export const slideTemplates: string[];
  export const slideTemplateCategories: Record<string, string>;
  export function loadSlide(id: string): Promise<SlideModule>;
}

declare module 'virtual:tooka/config' {
  import type { Locale } from '../locale/types';

  const config: {
    base?: string;
    slidesDir?: string;
    port?: number;
    locale?: Locale;
    version: string;
    build: {
      showSlideBrowser: boolean;
      showSlideUi: boolean;
      allowHtmlDownload: boolean;
    };
  };
  export default config;
}

declare module 'virtual:tooka/folders' {
  import type { FoldersManifest } from './lib/sdk';

  const manifest: FoldersManifest;
  export default manifest;
}

declare module 'virtual:tooka/themes' {
  import type { DesignSystem } from './lib/design';
  import type { Page } from './lib/sdk';

  export type ThemeMeta = {
    id: string;
    name: string;
    description: string;
    body: string;
    hasDemo: boolean;
  };

  export const themes: ThemeMeta[];
  export function loadThemeDemo(id: string): Promise<{
    default: Page[];
    design?: DesignSystem;
  }>;
}
