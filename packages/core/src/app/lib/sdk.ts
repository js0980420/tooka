import type { ComponentType } from 'react';
import type { DesignSystem } from './design.ts';
import type { SlideTransition } from './transition.ts';

export type Page = ComponentType & { transition?: SlideTransition };

export type PngExportVariant = {
  id: string;
  label: string;
  fileSuffix: string;
  previewLabel?: string;
  /** Center-crop the captured canvas to this size on export (e.g. 1080×1080 for IG square). */
  crop?: { width: number; height: number };
};

export type SlideMeta = {
  title?: string;
  theme?: string;
  /** ISO 8601 timestamp. Set once at scaffold time; used to sort the slide list. */
  createdAt?: string;
  /** Marks this deck as a reusable template shown on the Templates page. */
  template?: boolean;
};

export type SlideModule = {
  default: Page[];
  meta?: SlideMeta;
  design?: DesignSystem;
  pngExportVariants?: readonly PngExportVariant[];
  // Index-aligned with `default`.
  notes?: (string | undefined)[];
  transition?: SlideTransition;
};

export type FolderIcon = { type: 'emoji'; value: string } | { type: 'color'; value: string };

export type Folder = {
  id: string;
  name: string;
  icon: FolderIcon;
};

export type FoldersManifest = {
  folders: Folder[];
  assignments: Record<string, string>;
};

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1350;
