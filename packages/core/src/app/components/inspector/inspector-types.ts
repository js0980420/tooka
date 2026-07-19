import type { SlideComment } from '@/lib/inspector/use-comments';
import type { Edit, EditOp, EditResult } from '@/lib/inspector/use-editor';

export type SelectedTarget = {
  line: number;
  column: number;
  anchor: HTMLElement;
};

export type InspectorCtx = {
  slideId: string;
  active: boolean;
  toggle: () => void;
  cancel: () => void;
  comments: SlideComment[];
  error: string | null;
  refetch: () => Promise<void>;
  add: (line: number, column: number, text: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  selected: SelectedTarget | null;
  setSelected: (s: SelectedTarget | null) => void;
  applyEdit: (line: number, column: number, ops: EditOp[]) => Promise<void>;
  applyEdits: (edits: Edit[]) => Promise<EditResult[]>;
  // Mutate the DOM optimistically, snapshot the pre-edit values, and
  // remember the ops. `commitEdits` (manual Save or auto-flush on
  // close) is what actually writes to disk; `cancelEdits` reverts.
  bufferOps: (line: number, column: number, anchor: HTMLElement, ops: EditOp[]) => void;
  pendingCount: number;
  commitEdits: () => Promise<void>;
  cancelEdits: () => void;
  committing: boolean;
  openCrop: (anchor: HTMLImageElement) => void;
  openReplace: (anchor: HTMLElement) => void;
  deleteElement: (target: SelectedTarget) => void;
};
