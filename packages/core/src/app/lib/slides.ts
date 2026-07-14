import {
  slideCreatedAt as createdAt,
  slideIds as ids,
  loadSlide as load,
  slideTemplates as templates,
  slideThemes as themes,
} from 'virtual:tooka/slides';
import type { SlideModule } from './sdk';

export const slideIds: string[] = ids;
export const slideThemes: Record<string, string> = themes;
export const slideCreatedAt: Record<string, number> = createdAt;
export const slideTemplates: string[] = templates;

export function slidesByTheme(themeId: string): string[] {
  return slideIds.filter((id) => slideThemes[id] === themeId);
}

export async function loadSlide(id: string): Promise<SlideModule> {
  return load(id);
}

export function slideChangeIncludes(data: unknown, slideId: string): boolean {
  if (!data || typeof data !== 'object') return false;
  const payload = data as { slideId?: unknown; slideIds?: unknown };
  if (payload.slideId === slideId) return true;
  return Array.isArray(payload.slideIds) && payload.slideIds.includes(slideId);
}
