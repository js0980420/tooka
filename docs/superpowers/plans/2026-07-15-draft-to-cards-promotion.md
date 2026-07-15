# Draft → Cards Promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draft cards stay in the Draft area until the user promotes them via an "新增到卡片" (Add to cards) folder-picker button; "All cards" and the Publish page only list promoted cards.

**Architecture:** Promotion reuses the existing `.folders.json` assignment mechanism — a card is a draft iff it has no valid folder assignment. A pure `partitionSlides` helper computes draft/promoted/byFolder lists from the manifest; `home-shell` exposes `promotedSlides` + `createFolder` through the outlet context; a new `AddToCardsButton` (Popover folder picker) is rendered on draft thumbnails and the slide editor top bar (DEV only, since it writes via the dev server).

**Tech Stack:** React 19, react-router, base-ui Popover (`@/components/ui/popover`), sonner toasts, vitest, biome.

Spec: `docs/superpowers/specs/2026-07-15-draft-to-cards-promotion-design.md`

## Global Constraints

- Biome must pass: run `pnpm check:fix` before every commit.
- No new dependencies.
- No code comments unless a non-obvious constraint demands one (CLAUDE.md).
- Every new UI string goes into ALL FOUR locale files: `types.ts`, `en.ts`, `zh-tw.ts`, `zh-cn.ts`. Typecheck (`pnpm typecheck`) enforces completeness.
- Promotion UI renders only under `import.meta.env.DEV` (writes go through dev-server endpoints).
- Commit messages in English, one commit per task, each ending with the `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` trailer.
- The working tree already contains unrelated uncommitted changes (sidebar-footer + locale edits). `git add` only the files each task touches — never `git add -A`.

---

### Task 1: Pure partition helpers (`partitionSlides`, `isDraftSlide`)

**Files:**
- Create: `packages/core/src/app/lib/promotion.ts`
- Test: `packages/core/src/app/lib/promotion.test.ts`

**Interfaces:**
- Consumes: `FoldersManifest` type from `packages/core/src/app/lib/sdk.ts` (`{ folders: Folder[]; assignments: Record<string, string> }`).
- Produces:
  - `partitionSlides(slideIds: string[], manifest: FoldersManifest): { promoted: string[]; draft: string[]; byFolder: Record<string, string[]> }`
  - `isDraftSlide(slideId: string, manifest: FoldersManifest): boolean`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/app/lib/promotion.test.ts` (note: this repo's tests import with explicit `.ts` extension, see `utils.test.ts`):

```ts
import { describe, expect, it } from 'vitest';
import type { FoldersManifest } from './sdk.ts';
import { isDraftSlide, partitionSlides } from './promotion.ts';

const manifest: FoldersManifest = {
  folders: [{ id: 'f-1', name: 'motion', icon: { type: 'color', value: '#e5484d' } }],
  assignments: { a: 'f-1', c: 'f-gone' },
};

describe('partitionSlides', () => {
  it('splits slides into promoted, draft, and byFolder', () => {
    const result = partitionSlides(['a', 'b', 'c'], manifest);
    expect(result.promoted).toEqual(['a']);
    expect(result.draft).toEqual(['b', 'c']);
    expect(result.byFolder).toEqual({ 'f-1': ['a'] });
  });

  it('treats assignments to deleted folders as drafts', () => {
    const result = partitionSlides(['c'], manifest);
    expect(result.draft).toEqual(['c']);
    expect(result.promoted).toEqual([]);
  });

  it('returns empty lists for an empty manifest', () => {
    const empty: FoldersManifest = { folders: [], assignments: {} };
    const result = partitionSlides(['a'], empty);
    expect(result.promoted).toEqual([]);
    expect(result.draft).toEqual(['a']);
    expect(result.byFolder).toEqual({});
  });

  it('preserves slideIds order within each bucket', () => {
    const m: FoldersManifest = {
      folders: [{ id: 'f-1', name: 'x', icon: { type: 'color', value: '#000' } }],
      assignments: { d: 'f-1', b: 'f-1' },
    };
    const result = partitionSlides(['d', 'c', 'b', 'a'], m);
    expect(result.promoted).toEqual(['d', 'b']);
    expect(result.draft).toEqual(['c', 'a']);
    expect(result.byFolder['f-1']).toEqual(['d', 'b']);
  });
});

describe('isDraftSlide', () => {
  it('is false for a slide assigned to an existing folder', () => {
    expect(isDraftSlide('a', manifest)).toBe(false);
  });

  it('is true for an unassigned slide', () => {
    expect(isDraftSlide('b', manifest)).toBe(true);
  });

  it('is true when the assigned folder no longer exists', () => {
    expect(isDraftSlide('c', manifest)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/core/src/app/lib/promotion.test.ts`
Expected: FAIL — cannot resolve `./promotion.ts`.

- [ ] **Step 3: Write the implementation**

Create `packages/core/src/app/lib/promotion.ts`:

```ts
import type { FoldersManifest } from './sdk';

export type SlidePartition = {
  promoted: string[];
  draft: string[];
  byFolder: Record<string, string[]>;
};

export function partitionSlides(slideIds: string[], manifest: FoldersManifest): SlidePartition {
  const known = new Set(manifest.folders.map((f) => f.id));
  const promoted: string[] = [];
  const draft: string[] = [];
  const byFolder: Record<string, string[]> = {};
  for (const id of slideIds) {
    const folderId = manifest.assignments[id];
    if (folderId && known.has(folderId)) {
      promoted.push(id);
      byFolder[folderId] ??= [];
      byFolder[folderId].push(id);
    } else {
      draft.push(id);
    }
  }
  return { promoted, draft, byFolder };
}

export function isDraftSlide(slideId: string, manifest: FoldersManifest): boolean {
  const folderId = manifest.assignments[slideId];
  return !folderId || !manifest.folders.some((f) => f.id === folderId);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run packages/core/src/app/lib/promotion.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Lint and commit**

```bash
pnpm check:fix
git add packages/core/src/app/lib/promotion.ts packages/core/src/app/lib/promotion.test.ts
git commit -m "feat: add partitionSlides/isDraftSlide promotion helpers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Locale keys for promotion + template button rename

**Files:**
- Modify: `packages/core/src/locale/types.ts` (home section ends at `pickIcon: string;` ~line 113; publish section `pickCardHint: string;` ~line 617)
- Modify: `packages/core/src/locale/en.ts` (home `pickIcon` ~line 109; templates `addToCards` ~line 540; publish `pickCardHint` ~line 592)
- Modify: `packages/core/src/locale/zh-tw.ts` (same keys, ~lines 109 / 533 / 585)
- Modify: `packages/core/src/locale/zh-cn.ts` (same keys, ~lines 109 / 533 / 585)

**Interfaces:**
- Produces locale keys used by later tasks: `t.home.addToCards`, `t.home.toastPromoted` (template `{folder}`), `t.home.toastPromoteFailed`, `t.home.goToDraft`, `t.home.allEmptyWithDraftsTitle`, `t.home.allEmptyWithDraftsHint`, `t.publish.emptyNoCards`, `t.publish.emptyNoCardsHint`.
- Changes existing values only (no key change): `templates.addToCards`, `templates.toastAdded`.

- [ ] **Step 1: Add new keys to `types.ts`**

In the `home` section, immediately after `pickIcon: string;`:

```ts
    addToCards: string;
    /** template: "Added to “{folder}”" */
    toastPromoted: string;
    toastPromoteFailed: string;
    goToDraft: string;
    allEmptyWithDraftsTitle: string;
    allEmptyWithDraftsHint: string;
```

In the `publish` section, immediately after `pickCardHint: string;`:

```ts
    emptyNoCards: string;
    emptyNoCardsHint: string;
```

- [ ] **Step 2: Add values to `en.ts`**

Home section, after `pickIcon: 'Pick icon',`:

```ts
    addToCards: 'Add to cards',
    toastPromoted: 'Added to "{folder}"',
    toastPromoteFailed: 'Failed to add to a folder',
    goToDraft: 'Go to drafts',
    allEmptyWithDraftsTitle: 'No cards yet',
    allEmptyWithDraftsHint: 'Your drafts are waiting — review one and press "Add to cards" to promote it.',
```

Publish section, after the `pickCardHint` entry:

```ts
    emptyNoCards: 'No cards to publish yet',
    emptyNoCardsHint: 'Promote a draft with "Add to cards" first.',
```

Templates section — replace the existing values:

```ts
    addToCards: 'Add to drafts',
```

and

```ts
    toastAdded: 'Added to drafts as "{id}"',
```

- [ ] **Step 3: Add values to `zh-tw.ts`**

Home section, after `pickIcon: '選擇圖示',`:

```ts
    addToCards: '新增到卡片',
    toastPromoted: '已加入「{folder}」',
    toastPromoteFailed: '加入資料夾失敗',
    goToDraft: '前往草稿區',
    allEmptyWithDraftsTitle: '還沒有正式卡片',
    allEmptyWithDraftsHint: '草稿區有卡片等待審核，按「新增到卡片」轉為正式內容。',
```

Publish section, after the `pickCardHint` entry:

```ts
    emptyNoCards: '還沒有可發布的卡片',
    emptyNoCardsHint: '先到草稿區按「新增到卡片」，把內容轉為正式卡片。',
```

Templates section — replace:

```ts
    addToCards: '加入草稿',
```

and

```ts
    toastAdded: '已加入草稿：「{id}」',
```

- [ ] **Step 4: Add values to `zh-cn.ts`**

Home section, after `pickIcon: '选择图标',`:

```ts
    addToCards: '添加到卡片',
    toastPromoted: '已加入“{folder}”',
    toastPromoteFailed: '加入文件夹失败',
    goToDraft: '前往草稿区',
    allEmptyWithDraftsTitle: '还没有正式卡片',
    allEmptyWithDraftsHint: '草稿区有卡片等待审核，按“添加到卡片”转为正式内容。',
```

Publish section, after the `pickCardHint` entry:

```ts
    emptyNoCards: '还没有可发布的卡片',
    emptyNoCardsHint: '先到草稿区按“添加到卡片”，把内容转为正式卡片。',
```

Templates section — replace:

```ts
    addToCards: '加入草稿',
```

and

```ts
    toastAdded: '已加入草稿：“{id}”',
```

- [ ] **Step 5: Verify and commit**

Run: `pnpm typecheck`
Expected: PASS — all four files stay in sync with `LocaleStrings`.

```bash
pnpm check:fix
git add packages/core/src/locale/types.ts packages/core/src/locale/en.ts packages/core/src/locale/zh-tw.ts packages/core/src/locale/zh-cn.ts
git commit -m "feat: add promotion locale strings, rename template button to add-to-drafts

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Note: `git status` may show these locale files already modified by unrelated in-progress work. Only stage them if your diff is additive on top; do not revert existing edits.

---

### Task 3: Expose `promotedSlides` + `createFolder` from home-shell

**Files:**
- Modify: `packages/core/src/app/routes/home-shell.tsx`

**Interfaces:**
- Consumes: `partitionSlides` from Task 1.
- Produces on `HomeOutletContext`: `promotedSlides: string[]` and `createFolder: (name: string, icon: FolderIcon) => Promise<Folder>`. Later tasks (home, publish) read these via `useOutletContext<HomeOutletContext>()`.

- [ ] **Step 1: Update imports and the context type**

Change the sdk type import (line 24) to include `Folder` and `FolderIcon`:

```ts
import type { Folder, FolderIcon, FoldersManifest } from '../lib/sdk';
```

Add below the other `@/lib` imports:

```ts
import { partitionSlides } from '@/lib/promotion';
```

Extend `HomeOutletContext` — after `slidesByFolder: Record<string, string[]>;` add:

```ts
  promotedSlides: string[];
```

and after `assign: (slideId: string, folderId: string | null) => Promise<void>;` add:

```ts
  createFolder: (name: string, icon: FolderIcon) => Promise<Folder>;
```

- [ ] **Step 2: Replace the partition `useMemo`**

Replace the existing `useMemo` block (lines 98–112, the one building `byFolder`/`draft`) with:

```ts
  const { promotedSlides, draftSlides, slidesByFolder } = useMemo(() => {
    const { promoted, draft, byFolder } = partitionSlides(slideIds, manifest);
    return { promotedSlides: promoted, draftSlides: draft, slidesByFolder: byFolder };
  }, [manifest]);
```

- [ ] **Step 3: Use the promoted count and extend ctx**

- In the `ctx` object literal, add `promotedSlides,` after `slidesByFolder,` and `createFolder: create,` after `assign,`.
- Sidebar prop: change `allCount={slideIds.length}` to `allCount={promotedSlides.length}`.
- Mobile dropdown "All slides" count (line ~219): change `{slideIds.length.toString().padStart(2, '0')}` to `{promotedSlides.length.toString().padStart(2, '0')}`.
- If `slideIds` is now unused in this file it is NOT — `partitionSlides(slideIds, …)` still uses it; keep the import.

- [ ] **Step 4: Verify and commit**

Run: `pnpm typecheck`
Expected: FAILS in `home.tsx`/`publish.tsx` ONLY if they were already updated — at this point in sequence they aren't, so expected: PASS (context gained fields; nothing consumes them yet).

```bash
pnpm check:fix
git add packages/core/src/app/routes/home-shell.tsx
git commit -m "feat: expose promoted slides and createFolder via home outlet context

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `AddToCardsButton` component

**Files:**
- Create: `packages/core/src/app/components/add-to-cards-button.tsx`

**Interfaces:**
- Consumes: locale keys from Task 2; `FolderIconChip` from `./sidebar/folder-item`; `PRESET_COLORS` from `./sidebar/icon-picker`; `buttonVariants` from `@/components/ui/button`; base-ui Popover (`PopoverTrigger` takes a `render={<element/>}` prop in this codebase).
- Produces: `AddToCardsButton({ folders, onAssign, onCreateFolder, className }: { folders: Folder[]; onAssign: (folderId: string) => Promise<void>; onCreateFolder: (name: string, icon: FolderIcon) => Promise<Folder>; className?: string })`. Callers gate rendering with `import.meta.env.DEV`.

- [ ] **Step 1: Create the component**

Create `packages/core/src/app/components/add-to-cards-button.tsx` with exactly:

```tsx
import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Folder, FolderIcon } from '@/lib/sdk';
import { format, useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { FolderIconChip } from './sidebar/folder-item';
import { PRESET_COLORS } from './sidebar/icon-picker';

export function AddToCardsButton({
  folders,
  onAssign,
  onCreateFolder,
  className,
}: {
  folders: Folder[];
  onAssign: (folderId: string) => Promise<void>;
  onCreateFolder: (name: string, icon: FolderIcon) => Promise<Folder>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useLocale();

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const close = () => {
    setOpen(false);
    setCreating(false);
    setNewName('');
  };

  const promoteTo = async (folder: Folder) => {
    setBusy(true);
    try {
      await onAssign(folder.id);
      close();
      toast.success(format(t.home.toastPromoted, { folder: folder.name }));
    } catch {
      toast.error(t.home.toastPromoteFailed);
    } finally {
      setBusy(false);
    }
  };

  const createAndPromote = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const icon: FolderIcon = {
        type: 'color',
        value: PRESET_COLORS[folders.length % PRESET_COLORS.length],
      };
      const folder = await onCreateFolder(trimmed, icon);
      await onAssign(folder.id);
      close();
      toast.success(format(t.home.toastPromoted, { folder: folder.name }));
    } catch {
      toast.error(t.home.toastPromoteFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setCreating(false);
          setNewName('');
        }
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            className={cn(buttonVariants({ variant: 'brand', size: 'sm' }), className)}
          >
            <Plus className="size-3.5" />
            {t.home.addToCards}
          </button>
        }
      />
      <PopoverContent align="start" className="w-56 p-1">
        {folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            disabled={busy}
            onClick={() => promoteTo(folder)}
            className="flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left text-[12.5px] hover:bg-muted/60 disabled:opacity-50"
          >
            <FolderIconChip icon={folder.icon} />
            <span className="truncate">{folder.name}</span>
          </button>
        ))}
        {folders.length > 0 && <div className="my-1 h-px bg-hairline" aria-hidden />}
        {creating ? (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Enter') createAndPromote();
                if (e.key === 'Escape') setCreating(false);
              }}
              placeholder={t.home.folderName}
              maxLength={40}
              disabled={busy}
              className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left text-[12px] text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            <Plus className="size-3.5" />
            {t.home.newFolder}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
```

The trigger's `stopPropagation`/`preventDefault` mirrors the existing thumbnail dropdown in `home.tsx` `SlideCard` — it stops clicks from bubbling to the card's `Link`/drag wrapper while base-ui still opens the popover.

- [ ] **Step 2: Verify and commit**

Run: `pnpm typecheck`
Expected: PASS.

```bash
pnpm check:fix
git add packages/core/src/app/components/add-to-cards-button.tsx
git commit -m "feat: add AddToCardsButton folder-picker popover

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Home — All lists promoted only, draft thumbnails get the button

**Files:**
- Modify: `packages/core/src/app/routes/home.tsx`

**Interfaces:**
- Consumes: `promotedSlides`, `createFolder` from `HomeOutletContext` (Task 3); `AddToCardsButton` (Task 4); locale keys (Task 2).

- [ ] **Step 1: Update imports and context destructure**

- Add to the `Home` component's `useOutletContext` destructure: `promotedSlides,` and `createFolder,`.
- Add import: `import { AddToCardsButton } from '../components/add-to-cards-button';`
- Change the slides import (line 44) from `import { loadSlide, slideCreatedAt, slideIds } from '../lib/slides';` to `import { loadSlide, slideCreatedAt } from '../lib/slides';` (both uses of `slideIds` disappear in the next steps).

- [ ] **Step 2: Filter the All view**

Replace:

```ts
  const visibleSlides = isAll
    ? slideIds
    : isDraft
      ? draftSlides
      : (slidesByFolder[selectedId] ?? []);
```

with:

```ts
  const visibleSlides = isAll
    ? promotedSlides
    : isDraft
      ? draftSlides
      : (slidesByFolder[selectedId] ?? []);
```

In the mobile folder dropdown, change the All-slides count from `{slideIds.length.toString().padStart(2, '0')}` to `{promotedSlides.length.toString().padStart(2, '0')}`.

- [ ] **Step 3: Pass the promote action into `SlideCard`**

In the `sortedSlides.map` card render, add a `promote` prop after `currentFolderId`:

```tsx
                promote={
                  isDraft
                    ? {
                        folders: manifest.folders,
                        onAssign: (folderId) => assign(id, folderId),
                        onCreateFolder: createFolder,
                      }
                    : undefined
                }
```

- [ ] **Step 4: Render the button in `SlideCard`**

Extend `SlideCard`'s props (both the destructure and the type):

```tsx
  promote,
```

```ts
  promote?: {
    folders: Folder[];
    onAssign: (folderId: string) => Promise<void>;
    onCreateFolder: (name: string, icon: FolderIcon) => Promise<Folder>;
  };
```

Inside the card's outer `div`, right after the existing DEV dropdown block (`{import.meta.env.DEV && ( <div className="absolute right-2 top-2"> … )}`), add:

```tsx
        {import.meta.env.DEV && promote && (
          <div className="absolute left-2 top-2">
            <AddToCardsButton
              folders={promote.folders}
              onAssign={promote.onAssign}
              onCreateFolder={promote.onCreateFolder}
              className="h-7 px-2 text-[11.5px] opacity-0 shadow-edge group-hover:opacity-100 aria-expanded:opacity-100 motion-safe:transition-opacity"
            />
          </div>
        )}
```

- [ ] **Step 5: Empty state for "All" when drafts are waiting**

Change the `EmptyState` call site from:

```tsx
        <EmptyState isDraft={isAll || isDraft} folderName={selectedFolder?.name} />
```

to:

```tsx
        <EmptyState
          isAll={isAll}
          isDraft={isDraft}
          draftCount={draftSlides.length}
          folderName={selectedFolder?.name}
          onGoToDraft={() => selectFolder(DRAFT_ID)}
        />
```

Rewrite `EmptyState` as:

```tsx
function EmptyState({
  isAll,
  isDraft,
  draftCount,
  folderName,
  onGoToDraft,
}: {
  isAll: boolean;
  isDraft: boolean;
  draftCount: number;
  folderName?: string;
  onGoToDraft: () => void;
}) {
  const t = useLocale();
  const folderEmptyTitle = t.home.folderEmptyTitle.replace(
    '{name}',
    folderName ?? t.home.folderEmptyTitle,
  );
  return (
    <div className="rounded-[10px] border border-dashed border-border bg-card/60 px-8 py-20">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-full border border-hairline bg-card text-muted-foreground">
          <FolderPlus className="size-5" />
        </div>
        {isAll && draftCount > 0 ? (
          <>
            <p className="mt-4 font-heading text-[15px] font-semibold tracking-tight">
              {t.home.allEmptyWithDraftsTitle}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {t.home.allEmptyWithDraftsHint}
            </p>
            <Button variant="ghost" size="sm" className="mt-4" onClick={onGoToDraft}>
              {t.home.goToDraft}
            </Button>
          </>
        ) : isAll || isDraft ? (
          <>
            <p className="mt-4 font-heading text-[15px] font-semibold tracking-tight">
              {t.home.noSlidesYet}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {t.home.createSlideHintPrefix}
              <code className="rounded-[4px] bg-muted px-1.5 py-0.5 font-mono text-[11.5px] text-foreground">
                /create-slide
              </code>
              {t.home.createSlideHintSuffix}
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 font-heading text-[15px] font-semibold tracking-tight">
              {folderEmptyTitle}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {t.home.folderEmptyHint}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify and commit**

Run: `pnpm typecheck` — expected: PASS.
Run: `pnpm vitest run` — expected: all existing tests PASS.

Manual smoke (optional but recommended if a dev server is practical): `pnpm dev`, open the studio app — All view shows 0 cards with the "go to drafts" hint (the studio's two slides are unassigned), Draft view shows both with a hover "新增到卡片" button; promoting one moves it to the chosen folder and into All.

```bash
pnpm check:fix
git add packages/core/src/app/routes/home.tsx
git commit -m "feat: list only promoted cards in All view, promote drafts from thumbnails

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Slide editor — promote button in the top bar

**Files:**
- Modify: `packages/core/src/app/routes/slide.tsx`

**Interfaces:**
- Consumes: `isDraftSlide` (Task 1), `AddToCardsButton` (Task 4), `useFolders()` (`manifest`, `loading`, `assign`, `create`).

- [ ] **Step 1: Extend the `useFolders` destructure**

`slide.tsx` line ~96 currently reads:

```ts
  const { renameSlide } = useFolders();
```

Replace with:

```ts
  const { renameSlide, manifest, loading: foldersLoading, assign, create } = useFolders();
```

- [ ] **Step 2: Add imports**

```ts
import { AddToCardsButton } from '../components/add-to-cards-button';
import { isDraftSlide } from '@/lib/promotion';
```

(Match the file's existing import-path style; `pnpm check:fix` will re-organize order.)

- [ ] **Step 3: Render the button in the header's right zone**

In the `<header>` (line ~596), the right zone starts with `<div className="flex flex-1 items-center justify-end gap-1 md:ml-auto md:flex-none">`. Insert as its FIRST child, before the copy-link button:

```tsx
              {import.meta.env.DEV && !foldersLoading && isDraftSlide(slideId, manifest) && (
                <AddToCardsButton
                  folders={manifest.folders}
                  onAssign={(folderId) => assign(slideId, folderId)}
                  onCreateFolder={(name, icon) => create(name, icon)}
                />
              )}
```

`slideId` is the route param already in scope (it is used by `renameSlide(slideId, next)` in the title editor). The `!foldersLoading` guard stops the button flashing on every card while the manifest is still `EMPTY`.

- [ ] **Step 4: Verify and commit**

Run: `pnpm typecheck` — expected: PASS.

```bash
pnpm check:fix
git add packages/core/src/app/routes/slide.tsx
git commit -m "feat: promote draft cards from the slide editor top bar

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Publish page — promoted cards only + empty state

**Files:**
- Modify: `packages/core/src/app/routes/publish.tsx`

**Interfaces:**
- Consumes: `promotedSlides` from `HomeOutletContext` (Task 3); locale keys `t.publish.emptyNoCards`, `t.publish.emptyNoCardsHint`, `t.home.goToDraft` (Task 2).

- [ ] **Step 1: Read promoted slides from context**

Change:

```ts
  const { titleMap } = useOutletContext<HomeOutletContext>();
```

to:

```ts
  const { titleMap, promotedSlides } = useOutletContext<HomeOutletContext>();
```

Remove `slideIds` from the `../lib/slides` import (keep `loadSlide`):

```ts
import { loadSlide } from '../lib/slides';
```

- [ ] **Step 2: Fix the default-selection effect**

Replace:

```ts
  useEffect(() => {
    if (slideIds.length > 0 && !selectedSlideId) {
      setSelectedSlideId(slideIds[0]);
    }
  }, [selectedSlideId]);
```

with:

```ts
  useEffect(() => {
    if (promotedSlides.length === 0) return;
    if (!selectedSlideId || !promotedSlides.includes(selectedSlideId)) {
      setSelectedSlideId(promotedSlides[0]);
    }
  }, [selectedSlideId, promotedSlides]);
```

(The second condition also handles a selected card losing its promotion — e.g. its folder was deleted — by snapping back to the first promoted card.)

- [ ] **Step 3: Picker lists promoted cards, with an empty state**

In the "Card Selection" panel, replace the `<div className="relative">…</div>` select block AND the `<p …>{t.publish.pickCardHint}</p>` line that follows it with:

```tsx
            {promotedSlides.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-background px-3 py-4 text-center">
                <p className="text-[12.5px] font-medium">{t.publish.emptyNoCards}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t.publish.emptyNoCardsHint}
                </p>
                <Link
                  to="/?f=draft"
                  className="mt-2 inline-block text-[11.5px] font-medium text-brand hover:underline"
                >
                  {t.home.goToDraft}
                </Link>
              </div>
            ) : (
              <>
                <div className="relative">
                  <select
                    value={selectedSlideId}
                    onChange={(e) => setSelectedSlideId(e.target.value)}
                    className="w-full h-9 rounded-md border border-hairline bg-background px-3 py-1.5 text-[13px] font-medium shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-brand appearance-none pr-8 cursor-pointer"
                  >
                    {promotedSlides.map((id) => (
                      <option key={id} value={id}>
                        {titleMap[id] || id}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">{t.publish.pickCardHint}</p>
              </>
            )}
```

`Link` is already imported from react-router-dom in this file. `/?f=draft` selects the Draft view because `pathToSelectedId` reads the `f` query param and `DRAFT_ID === 'draft'`.

- [ ] **Step 4: Verify and commit**

Run: `pnpm typecheck` — expected: PASS.
Run: `pnpm vitest run` — expected: PASS.

```bash
pnpm check:fix
git add packages/core/src/app/routes/publish.tsx
git commit -m "feat: publish page only offers promoted cards

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Changeset + full verification

**Files:**
- Create: `.changeset/draft-to-cards-promotion.md`

- [ ] **Step 1: Write the changeset**

Create `.changeset/draft-to-cards-promotion.md`:

```md
---
"@tooka/core": patch
---

Draft cards stay in Draft until promoted with the new "Add to cards" button; All cards and Publish only list promoted cards.
```

- [ ] **Step 2: Full verification**

Run, from the repo root, and confirm each passes:

```bash
pnpm check
pnpm typecheck
pnpm test
```

Expected: all PASS. If `pnpm check` fails, run `pnpm check:fix` and re-verify.

- [ ] **Step 3: Commit**

```bash
git add .changeset/draft-to-cards-promotion.md
git commit -m "chore: changeset for draft-to-cards promotion flow

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 4: End-to-end verify in the running app**

Use the superpowers:verification-before-completion checklist. Launch `pnpm dev`, then confirm in the studio app:

1. Sidebar "All cards" count is 0 (both studio slides are unassigned) and the All view shows the drafts-waiting empty state with a working "前往草稿區" button.
2. Draft view shows both cards; hovering a thumbnail reveals 「新增到卡片」; picking "新資料夾" + a name creates the folder, assigns the card, and toasts.
3. The promoted card now appears in All and in its folder; the draft count dropped.
4. Opening the remaining draft at `/s/<id>` shows the top-bar promote button; promoting from there works; the button disappears afterward.
5. Publish page: card picker lists only the promoted cards. To see the empty state, temporarily rename `apps/studio/slides/.folders.json` aside, reload `/publish`, confirm the empty state + "前往草稿區" link, then restore the file.
