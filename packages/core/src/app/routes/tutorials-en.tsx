import { AtSign, Move, Share2, Sliders, Smartphone } from 'lucide-react';
import type { TutorialArticle } from './tutorials-article';

export const tutorialArticlesEn: TutorialArticle[] = [
  {
    id: 'inspect',
    title: 'Edit together with AI using Inspect',
    icon: Sliders,
    category: 'Core features',
    content: (
      <div className="space-y-6">
        <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
          <h3 className="text-brand font-semibold text-base flex items-center gap-2">
            💡 What is this?
          </h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            <code>tooka</code> is the first card framework built for AI-assisted development. The{' '}
            <strong>Inspect</strong> tool in the top right lets you click any element on the canvas
            to point your AI at the code to change — no hunting for line numbers or edit locations.
          </p>
        </div>

        <section className="space-y-4">
          <h4 className="text-base font-semibold">The three-step loop</h4>
          <div className="grid gap-4 sm:grid-cols-3 text-[12.5px]">
            <div className="rounded-lg border bg-card p-4">
              <span className="font-mono text-brand font-bold">STEP 1</span>
              <h5 className="font-medium mt-1">Turn on Inspect</h5>
              <p className="text-muted-foreground mt-1 leading-normal text-[11.5px]">
                Click the <strong>Inspect</strong> button in the top right of the editor. A green
                frame follows your cursor and selects the card element under it.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <span className="font-mono text-brand font-bold">STEP 2</span>
              <h5 className="font-medium mt-1">Click and comment</h5>
              <p className="text-muted-foreground mt-1 leading-normal text-[11.5px]">
                Click the element you want to change and leave a short note (for example:{' '}
                <em>"Make the type bigger and switch it to mint green"</em>), then save.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <span className="font-mono text-brand font-bold">STEP 3</span>
              <h5 className="font-medium mt-1">Let AI apply it</h5>
              <p className="text-muted-foreground mt-1 leading-normal text-[11.5px]">
                Tell your AI assistant <strong>"apply my comments"</strong> — it reads the markers
                in the source and edits the React code for you!
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-semibold">How it works in the source</h4>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            When you save a comment, a hidden annotation tag is inserted into the card file. Your AI
            agent reads these tags to target the exact element when refactoring:
          </p>
          <pre className="rounded-lg bg-muted p-4 font-mono text-[12px] text-foreground overflow-x-auto border">
            {`{/* @slide-comment id="c-xxxx" ts="2026-07-14T00:00:00Z" text="..." */}`}
          </pre>
        </section>
      </div>
    ),
  },
  {
    id: 'margins',
    title: 'IG portrait cards & safe margins',
    icon: Smartphone,
    category: 'Layout specs',
    content: (
      <div className="space-y-6">
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          Instagram carousels today are dominated by the <strong>4:5 (1080 × 1350)</strong> portrait
          canvas. However, the profile grid crops images to a **1:1 square**. That is why we ship
          two safe-margin variants:
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4 bg-card">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              📐 1. Portrait (full margins)
            </h4>
            <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
              The default. Uses the full 4:5 portrait canvas with <strong>72px</strong> side margins
              and <strong>60px</strong> top/bottom margins. Generous whitespace that looks great as
              people scroll past the post.
            </p>
          </div>
          <div className="rounded-lg border p-4 bg-card">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              ⬜ 2. Square-safe (safe-area margins)
            </h4>
            <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
              The crop-proof option. Content shrinks toward the center (a <strong>0.84</strong>{' '}
              scale is applied automatically) with <strong>144px</strong> side margins and{' '}
              <strong>220px</strong> top/bottom margins, so key information never gets cut in the
              1:1 profile-grid preview.
            </p>
          </div>
        </div>

        <section className="space-y-3">
          <h4 className="text-base font-semibold">Switching and previewing</h4>
          <p className="text-[13px] text-muted-foreground">
            In the download menu on the right side of the card editor you can switch between{' '}
            <strong>Portrait</strong> and <strong>Square-safe</strong> at any time. The canvas
            previews the scaling live, and exports render at the same size.
          </p>
        </section>
      </div>
    ),
  },
  {
    id: 'dnd',
    title: 'Image drag & positioning tips',
    icon: Move,
    category: 'Advanced usage',
    content: (
      <div className="space-y-6">
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          <code>tooka</code> offers smooth drag-to-upload and positioning, so designing cards feels
          more like Canva — while everything generated underneath stays plain React code.
        </p>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-bold font-mono">
              1
            </div>
            <div>
              <h4 className="font-semibold text-sm">Drag files to upload</h4>
              <p className="text-[12px] text-muted-foreground mt-1">
                Drag local image files (PNG/JPG) straight into the asset panel on the left side of
                the editor; they are added to the project asset directory automatically.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-bold font-mono">
              2
            </div>
            <div>
              <h4 className="font-semibold text-sm">Drag images onto the canvas</h4>
              <p className="text-[12px] text-muted-foreground mt-1">
                Drag an image from the asset panel to any spot on the canvas, and a matching{' '}
                <code>Image</code> component is created in the code immediately.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-bold font-mono">
              3
            </div>
            <div>
              <h4 className="font-semibold text-sm">Selection dragging without jitter</h4>
              <p className="text-[12px] text-muted-foreground mt-1">
                After selecting an element on the canvas, hold and drag to move it. While moving,
                CSS transitions are disabled dynamically and the latest coordinates are measured
                automatically, keeping the drag tear-free and lag-free.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'ig-api',
    title: 'Auto-publish to IG (API setup)',
    icon: Share2,
    category: 'Integrations',
    content: (
      <div className="space-y-6">
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          One-click publishing to Instagram requires Meta's <strong>Instagram Graph API</strong>.
          You will need to convert your IG account to a professional (business/creator) account and
          link it to a Facebook Page.
        </p>

        <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
          <h3 className="text-brand font-semibold text-base flex items-center gap-2">
            🎥 Recommended video walkthrough
          </h3>
          <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
            To get through the Meta developer app setup and key application quickly, we highly
            recommend this thorough YouTube walkthrough:
          </p>
          <div className="mt-4">
            <a
              href="https://www.youtube.com/watch?v=O1qfeDIZRkQ&t=2s"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block overflow-hidden rounded-xl border border-border bg-card shadow-md transition-all hover:-translate-y-1 hover:shadow-lg"
              style={{ maxWidth: '440px' }}
            >
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                <img
                  src="https://img.youtube.com/vi/O1qfeDIZRkQ/maxresdefault.jpg"
                  alt="YouTube video thumbnail"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = 'https://img.youtube.com/vi/O1qfeDIZRkQ/hqdefault.jpg';
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/35">
                  <div className="flex size-14 items-center justify-center rounded-full bg-brand text-background shadow-lg transition-transform duration-300 group-hover:scale-110">
                    <svg aria-hidden="true" className="size-6 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-[13px] leading-snug group-hover:text-brand transition-colors">
                  IG API application & auto-publish walkthrough 🎬
                </h4>
                <p className="mt-1 text-[11px] text-muted-foreground">Opens YouTube in a new tab</p>
              </div>
            </a>
          </div>
        </div>

        <section className="space-y-3">
          <h4 className="text-base font-semibold">The four core steps</h4>
          <div className="space-y-3 text-[12.5px]">
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                1
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>Switch to a professional account</strong>: convert your Instagram account to
                a business or creator account, then create a Facebook Page and link the two.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                2
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>Create a Meta app</strong>: register a Meta for Developers account, click
                "Create App" in the dashboard, and pick the "Business" type.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                3
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>Set up the Graph API and permissions</strong>: add the "Instagram Graph API"
                product to the app, then use the Graph API explorer to request{' '}
                <code>instagram_basic</code>, <code>instagram_content_publish</code>, and related
                permissions.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                4
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>Generate a long-lived access token</strong>: exchange the short-lived token
                for a 60-day long-lived token so your integration can keep calling the API and
                publishing on schedule in the background.
              </p>
            </div>
          </div>
        </section>
      </div>
    ),
  },
  {
    id: 'threads-api',
    title: 'Auto-publish to Threads (API setup)',
    icon: AtSign,
    category: 'Integrations',
    content: (
      <div className="space-y-6">
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          One-click publishing to Threads goes through Meta's <strong>Threads API</strong> access
          token. Threads API is its own use case — no Facebook Page linking required — and the setup
          is much simpler than Instagram's.
        </p>

        <div className="rounded-xl border border-brand/20 bg-brand/5 p-5">
          <h3 className="text-brand font-semibold text-base flex items-center gap-2">
            💡 What you need
          </h3>
          <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
            A Threads account and a Meta for Developers account (free to register with your Facebook
            account). No review is needed to publish to your own account.
          </p>
        </div>

        <section className="space-y-3">
          <h4 className="text-base font-semibold">The four core steps</h4>
          <div className="space-y-3 text-[12.5px]">
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                1
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>Create a Meta app</strong>: go to{' '}
                <a
                  href="https://developers.facebook.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline"
                >
                  Meta for Developers
                </a>{' '}
                and click "Create App", choosing the "<strong>Access the Threads API</strong>" use
                case.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                2
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>Enable permissions</strong>: in the app's Threads use-case settings, turn on{' '}
                <code>threads_basic</code> and <code>threads_content_publish</code> (the former
                reads account info, the latter publishes posts).
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                3
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>Add yourself as a Threads tester</strong>: under "App roles", add your
                Threads account as a tester, then accept the invite in the Threads app under
                "Settings → Account → Website permissions → Invites".
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted border font-bold text-[10px]">
                4
              </div>
              <p className="text-muted-foreground leading-normal">
                <strong>Generate a long-lived access token</strong>: in the Threads use case's
                access token tool, generate a <strong>60-day long-lived token</strong> directly
                (avoid short-lived tokens that expire in about an hour). Paste it into "Connects →
                Threads API"; the account ID is fetched automatically and the token is renewed
                before it expires.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-semibold">Good to know</h4>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Threads long-lived tokens last 60 days. As long as you open tooka regularly, the token
            renews itself within 10 days of expiry. If it fully expires, generate a new long-lived
            token in the Meta dashboard and paste it on the Connects page. Short-lived tokens (about
            1 hour) cannot be auto-renewed — always pick the long-lived option.
          </p>
        </section>
      </div>
    ),
  },
];
