import type { ComponentType, ReactNode } from 'react';

export type TutorialArticle = {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  category: string;
  content: ReactNode;
};
