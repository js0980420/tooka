import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileText,
  ImageIcon,
  Plug,
  RefreshCw,
  Rocket,
  Send,
  Sparkles,
} from 'lucide-react';
import { createElement, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Link, useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format, useLocale } from '@/lib/use-locale';
import { FacebookIcon, InstagramIcon, ThreadsIcon } from '../components/brand-icons';
import { PageTabs } from '../components/page-tabs';
import { designToCssVars } from '../lib/design';
import { SlidePageProvider } from '../lib/page-context';
import { PngExportVariantProvider } from '../lib/png-export-variant';
import { isFrameAnimationSettled, waitForDataWaitfor, waitForFonts } from '../lib/print-ready';
import type { SlideModule } from '../lib/sdk';
import { resolveCanvasSize } from '../lib/sdk';
import { loadSlide } from '../lib/slides';
import type { HomeOutletContext } from './home-shell';

type PublishResult = {
  ok: boolean;
  message: string;
  mocked?: boolean;
  postId?: string;
  payloadPreview?: unknown;
  error?: string;
};

type PublishPlatform = 'facebook' | 'instagram' | 'threads';

const platformLabels: Record<PublishPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  threads: 'Threads',
};

const CAPTURE_CLASS = 'os-publish-capture';
const ANIMATION_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 100;
const FROZEN_PROPS = ['opacity', 'transform', 'filter', 'clip-path'] as const;

async function captureSlideImages(slideId: string, emptyMessage: string): Promise<string[]> {
  const slide: SlideModule = await loadSlide(slideId);
  const pages = slide.default ?? [];
  if (pages.length === 0) throw new Error(emptyMessage);
  const canvas = resolveCanvasSize(slide.meta);

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

  const captureStyle = document.createElement('style');
  captureStyle.textContent = `.${CAPTURE_CLASS} *, .${CAPTURE_CLASS} *::before, .${CAPTURE_CLASS} *::after {
    animation-delay: -1s !important;
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    animation-fill-mode: forwards !important;
    transition: none !important;
  }`;
  document.head.appendChild(captureStyle);

  const designVars = slide.design ? designToCssVars(slide.design) : null;
  const reactRoots: ReturnType<typeof createRoot>[] = [];
  const frames: HTMLElement[] = [];

  for (let i = 0; i < pages.length; i++) {
    const Page = pages[i];
    if (!Page) continue;
    const host = document.createElement('div');
    host.setAttribute('data-osd-canvas', '');
    host.style.width = `${canvas.width}px`;
    host.style.height = `${canvas.height}px`;
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
        { value: null },
        createElement(SlidePageProvider, { index: i, total: pages.length }, createElement(Page)),
      ),
    );
    reactRoots.push(r);
  }

  await new Promise<void>((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    requestAnimationFrame(settle);
    setTimeout(settle, 50);
  });

  try {
    await waitForFonts();

    const deadline = performance.now() + ANIMATION_TIMEOUT_MS;
    while (performance.now() < deadline) {
      if (frames.every((f) => isFrameAnimationSettled(f))) break;
      await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    await waitForDataWaitfor(container);

    const { toBlob } = await import('html-to-image');
    const base64Images: string[] = [];

    for (const frame of frames) {
      for (const el of frame.querySelectorAll<HTMLElement>('*')) {
        const cs = getComputedStyle(el);
        for (const prop of FROZEN_PROPS) {
          el.style.setProperty(prop, cs.getPropertyValue(prop), 'important');
        }
        el.style.setProperty('animation', 'none', 'important');
        el.style.setProperty('transition', 'none', 'important');
      }

      const blob = await toBlob(frame, {
        width: canvas.width,
        height: canvas.height,
        pixelRatio: 1,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      if (!blob) throw new Error('Failed to capture slide page');

      const reader = new FileReader();
      const b64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      base64Images.push(b64);
    }

    return base64Images;
  } finally {
    for (const r of reactRoots) r.unmount();
    container.remove();
    captureStyle.remove();
  }
}

export function PublishPage() {
  const t = useLocale();
  const { titleMap, promotedSlides } = useOutletContext<HomeOutletContext>();
  const [selectedSlideId, setSelectedSlideId] = useState('');

  const [fbEnabled, setFbEnabled] = useState(false);
  const [fbCaption, setFbCaption] = useState('');
  const [igEnabled, setIgEnabled] = useState(false);
  const [igCaption, setIgCaption] = useState('');
  const [igHashtags, setIgHashtags] = useState<string[]>(['', '', '', '', '']);
  const [threadsEnabled, setThreadsEnabled] = useState(false);
  const [threadsText, setThreadsText] = useState('');
  const [threadsTopicTag, setThreadsTopicTag] = useState('');

  const [commonText, setCommonText] = useState('');

  const [publishingPlatforms, setPublishingPlatforms] = useState<PublishPlatform[]>([]);
  const [batchPublishing, setBatchPublishing] = useState(false);
  const [results, setResults] = useState<Partial<Record<PublishPlatform, PublishResult>>>({});
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'capturing' | 'done'>('idle');

  const capturedImagesRef = useRef<string[]>([]);

  const syncCaptions = () => {
    if (fbEnabled) setFbCaption(commonText);
    if (igEnabled) setIgCaption(commonText);
    if (threadsEnabled) setThreadsText(commonText);
    toast.success(t.publish.toastSynced);
  };

  useEffect(() => {
    if (promotedSlides.length === 0) return;
    if (!selectedSlideId || !promotedSlides.includes(selectedSlideId)) {
      setSelectedSlideId(promotedSlides[0]);
    }
  }, [selectedSlideId, promotedSlides]);

  // titleMap only fills in after the home grid has rendered each card, so a
  // direct visit to /publish would show raw slide ids — load titles here too.
  const [loadedTitles, setLoadedTitles] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    for (const id of promotedSlides) {
      if (titleMap[id]) continue;
      loadSlide(id)
        .then((mod: SlideModule) => {
          const title = mod.meta?.title;
          if (cancelled || !title) return;
          setLoadedTitles((prev) => (prev[id] === title ? prev : { ...prev, [id]: title }));
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [promotedSlides, titleMap]);

  const handleHashtagChange = (index: number, value: string) => {
    const cleanValue = value.replace(/^#/, '');
    setIgHashtags((current) => {
      const next = [...current];
      next[index] = cleanValue;
      return next;
    });
  };

  const getIgCaptionWithHashtags = () => {
    const activeHashtags = igHashtags
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .map((tag) => `#${tag}`)
      .join(' ');

    if (!activeHashtags) return igCaption;
    return `${igCaption.trim()}\n\n${activeHashtags}`;
  };

  const captions: Record<PublishPlatform, string> = {
    facebook: fbCaption,
    instagram: getIgCaptionWithHashtags(),
    threads: threadsText,
  };
  const selectedPlatforms: PublishPlatform[] = [
    ...(fbEnabled ? (['facebook'] as const) : []),
    ...(igEnabled ? (['instagram'] as const) : []),
    ...(threadsEnabled ? (['threads'] as const) : []),
  ];
  const isPublishing = publishingPlatforms.length > 0;

  const publishPlatform = async (
    platform: PublishPlatform,
    images: string[],
  ): Promise<PublishResult> => {
    try {
      const res = await fetch(`/__publish/${platform}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slideId: selectedSlideId,
          caption: captions[platform].trim(),
          images,
          ...(platform === 'threads' && threadsTopicTag.trim()
            ? { topicTag: threadsTopicTag.trim().replace(/^#/, '') }
            : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        return {
          ok: true,
          message: data.message || t.publish.resultSuccess,
          mocked: data.mocked,
          postId: data.postId,
          payloadPreview: data.payloadPreview,
        };
      }

      return {
        ok: false,
        message: data.error || t.publish.resultApiFailed,
        payloadPreview: data.payloadPreview,
        error: data.error,
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : t.publish.resultConnectionError,
      };
    }
  };

  const handlePublish = async (platforms: PublishPlatform[]) => {
    if (!selectedSlideId) {
      toast.error(t.publish.toastSelectSlide);
      return;
    }
    if (platforms.length === 0) {
      toast.error(t.publish.toastSelectPlatform);
      return;
    }
    const missingCaptions = platforms.filter((platform) => !captions[platform].trim());
    if (missingCaptions.length > 0) {
      toast.error(
        format(t.publish.toastMissingCaptions, {
          platforms: missingCaptions.map((platform) => platformLabels[platform]).join(', '),
        }),
      );
      return;
    }
    if (platforms.includes('threads') && /[.&]/.test(threadsTopicTag)) {
      toast.error(t.publish.toastInvalidTopicTag);
      return;
    }

    setCaptureStatus('capturing');
    toast.info(t.publish.toastCapturing);

    let images: string[];
    try {
      images = await captureSlideImages(selectedSlideId, t.publish.captureNoPages);
      capturedImagesRef.current = images;
      setCaptureStatus('done');
      toast.success(format(t.publish.toastCaptureDone, { count: images.length }));
    } catch (err) {
      setCaptureStatus('idle');
      toast.error(
        format(t.publish.toastCaptureFailed, {
          error: err instanceof Error ? err.message : t.publish.unknownError,
        }),
      );
      return;
    }

    setPublishingPlatforms((current) => [...new Set([...current, ...platforms])]);
    setResults((current) => {
      const next = { ...current };
      for (const platform of platforms) delete next[platform];
      return next;
    });
    toast.info(
      platforms.length > 1
        ? format(t.publish.toastPublishingMulti, { count: platforms.length })
        : format(t.publish.toastPublishingSingle, { platform: platformLabels[platforms[0]] }),
    );

    const entries = await Promise.all(
      platforms.map(
        async (platform) => [platform, await publishPlatform(platform, images)] as const,
      ),
    );
    const newResults = Object.fromEntries(entries) as Partial<
      Record<PublishPlatform, PublishResult>
    >;

    setResults((current) => ({ ...current, ...newResults }));
    setPublishingPlatforms((current) =>
      current.filter((platform) => !platforms.includes(platform)),
    );
    setCaptureStatus('idle');

    const allSuccess = entries.every(([, result]) => result.ok);
    if (allSuccess) {
      toast.success(
        platforms.length > 1 ? t.publish.toastAllPublished : t.publish.toastOnePublished,
      );
    } else {
      toast.warning(
        platforms.length > 1 ? t.publish.toastSomeFailed : t.publish.toastPublishFailed,
      );
    }
  };

  return (
    <div className="max-w-4xl text-foreground">
      <header className="mb-8 md:mb-12">
        <div className="flex flex-wrap items-center gap-2.5">
          <Rocket className="size-5 text-brand" />
          <h1 className="font-heading text-xl font-bold tracking-tight md:text-2xl">
            {t.publish.title}
          </h1>
          <PageTabs
            className="ml-auto"
            tabs={[
              { label: t.home.publish, path: '/publish', icon: Rocket },
              { label: t.home.connects, path: '/connects', icon: Plug },
            ]}
          />
        </div>
        <p className="mt-2 text-[13px] text-muted-foreground">{t.publish.subtitle}</p>
      </header>

      <div className="flex flex-col gap-6">
        {/* Card and Sync Tools */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Card Selection */}
          <div className="rounded-[10px] border border-hairline bg-card p-5 shadow-edge md:col-span-1">
            <span className="eyebrow block mb-2">{t.publish.stepPickCard}</span>
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
                        {titleMap[id] || loadedTitles[id] || id}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">{t.publish.pickCardHint}</p>
              </>
            )}
            {captureStatus === 'capturing' && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-brand">
                <RefreshCw className="size-3 animate-spin" />
                {t.publish.capturingCard}
              </div>
            )}
            {captureStatus === 'done' && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-green-500">
                <ImageIcon className="size-3" />
                {format(t.publish.captureDoneLabel, { count: capturedImagesRef.current.length })}
              </div>
            )}
          </div>

          {/* Sync caption tool */}
          <div className="rounded-[10px] border border-hairline bg-card p-5 shadow-edge md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="eyebrow flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-brand" />
                {t.publish.stepSyncText}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11.5px] border hover:bg-muted"
                disabled={!commonText.trim() || (!fbEnabled && !igEnabled && !threadsEnabled)}
                onClick={syncCaptions}
              >
                {t.publish.applyToAll}
              </Button>
            </div>
            <Textarea
              placeholder={t.publish.commonTextPlaceholder}
              value={commonText}
              onChange={(e) => setCommonText(e.target.value)}
              rows={2}
              className="text-[13px] resize-none"
            />
          </div>
        </div>

        {/* Platform Panels */}
        <div className="space-y-4">
          <span className="eyebrow block">{t.publish.stepEditPlatforms}</span>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {/* Facebook Page */}
            <div
              className={`rounded-[10px] border p-5 shadow-edge transition-all flex flex-col justify-between ${
                fbEnabled
                  ? 'border-blue-500/30 bg-blue-500/[0.02]'
                  : 'border-hairline bg-card opacity-80 hover:opacity-100'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FacebookIcon className="size-7" />
                    <span className="text-[13.5px] font-bold text-foreground">Facebook Page</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={fbEnabled}
                    onChange={(e) => setFbEnabled(e.target.checked)}
                    className="size-4.5 rounded border-hairline text-blue-500 focus:ring-blue-500 accent-blue-500 cursor-pointer"
                  />
                </div>
                <p className="text-[11.5px] text-muted-foreground">
                  {t.publish.platformToggleHint}
                </p>
                <Textarea
                  placeholder={t.publish.fbCaptionPlaceholder}
                  value={fbCaption}
                  onChange={(e) => setFbCaption(e.target.value)}
                  rows={4}
                  className="bg-background text-[12.5px]"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full text-[12px]"
                disabled={isPublishing || captureStatus === 'capturing'}
                onClick={() => handlePublish(['facebook'])}
              >
                {publishingPlatforms.includes('facebook') ? (
                  <RefreshCw data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Send data-icon="inline-start" />
                )}
                {publishingPlatforms.includes('facebook')
                  ? t.publish.publishing
                  : format(t.publish.publishOnly, { platform: platformLabels.facebook })}
              </Button>
            </div>

            {/* Instagram */}
            <div
              className={`rounded-[10px] border p-5 shadow-edge transition-all flex flex-col justify-between ${
                igEnabled
                  ? 'border-pink-500/30 bg-pink-500/[0.02]'
                  : 'border-hairline bg-card opacity-80 hover:opacity-100'
              }`}
            >
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <InstagramIcon className="size-7" />
                      <span className="text-[13.5px] font-bold text-foreground">Instagram</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={igEnabled}
                      onChange={(e) => setIgEnabled(e.target.checked)}
                      className="size-4.5 rounded border-hairline text-pink-500 focus:ring-pink-500 accent-pink-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11.5px] text-muted-foreground mt-3">
                    {t.publish.platformToggleHint}
                  </p>
                  <Textarea
                    placeholder={t.publish.igCaptionPlaceholder}
                    value={igCaption}
                    onChange={(e) => setIgCaption(e.target.value)}
                    rows={4}
                    className="bg-background text-[12.5px] mt-3"
                  />
                </div>

                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-medium text-muted-foreground block">
                    {t.publish.igHashtagsLabel}
                  </span>
                  <div className="grid grid-cols-5 gap-1">
                    <div className="relative flex items-center">
                      <span className="absolute left-2 text-[11px] text-muted-foreground select-none font-bold">
                        #
                      </span>
                      <Input
                        placeholder={format(t.publish.igHashtagPlaceholder, { n: 1 })}
                        value={igHashtags[0]}
                        onChange={(e) => handleHashtagChange(0, e.target.value)}
                        className="h-7 text-[11px] pl-4.5 pr-1 bg-background"
                      />
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-2 text-[11px] text-muted-foreground select-none font-bold">
                        #
                      </span>
                      <Input
                        placeholder={format(t.publish.igHashtagPlaceholder, { n: 2 })}
                        value={igHashtags[1]}
                        onChange={(e) => handleHashtagChange(1, e.target.value)}
                        className="h-7 text-[11px] pl-4.5 pr-1 bg-background"
                      />
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-2 text-[11px] text-muted-foreground select-none font-bold">
                        #
                      </span>
                      <Input
                        placeholder={format(t.publish.igHashtagPlaceholder, { n: 3 })}
                        value={igHashtags[2]}
                        onChange={(e) => handleHashtagChange(2, e.target.value)}
                        className="h-7 text-[11px] pl-4.5 pr-1 bg-background"
                      />
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-2 text-[11px] text-muted-foreground select-none font-bold">
                        #
                      </span>
                      <Input
                        placeholder={format(t.publish.igHashtagPlaceholder, { n: 4 })}
                        value={igHashtags[3]}
                        onChange={(e) => handleHashtagChange(3, e.target.value)}
                        className="h-7 text-[11px] pl-4.5 pr-1 bg-background"
                      />
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-2 text-[11px] text-muted-foreground select-none font-bold">
                        #
                      </span>
                      <Input
                        placeholder={format(t.publish.igHashtagPlaceholder, { n: 5 })}
                        value={igHashtags[4]}
                        onChange={(e) => handleHashtagChange(4, e.target.value)}
                        className="h-7 text-[11px] pl-4.5 pr-1 bg-background"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full text-[12px]"
                disabled={isPublishing || captureStatus === 'capturing'}
                onClick={() => handlePublish(['instagram'])}
              >
                {publishingPlatforms.includes('instagram') ? (
                  <RefreshCw data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Send data-icon="inline-start" />
                )}
                {publishingPlatforms.includes('instagram')
                  ? t.publish.publishing
                  : format(t.publish.publishOnly, { platform: platformLabels.instagram })}
              </Button>
            </div>

            {/* Threads */}
            <div
              className={`rounded-[10px] border p-5 shadow-edge transition-all flex flex-col justify-between ${
                threadsEnabled
                  ? 'border-foreground/30 bg-foreground/[0.02]'
                  : 'border-hairline bg-card opacity-80 hover:opacity-100'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-foreground text-background">
                      <ThreadsIcon className="size-4" />
                    </div>
                    <span className="text-[13.5px] font-bold text-foreground">Threads</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={threadsEnabled}
                    onChange={(e) => setThreadsEnabled(e.target.checked)}
                    className="size-4.5 rounded border-hairline text-foreground focus:ring-foreground accent-foreground cursor-pointer"
                  />
                </div>
                <p className="text-[11.5px] text-muted-foreground">
                  {t.publish.platformToggleHint}
                </p>
                <Input
                  placeholder={t.publish.threadsTopicTagPlaceholder}
                  value={threadsTopicTag}
                  maxLength={50}
                  onChange={(e) => setThreadsTopicTag(e.target.value)}
                  className="bg-background text-[12.5px]"
                />
                <Textarea
                  placeholder={t.publish.threadsCaptionPlaceholder}
                  value={threadsText}
                  onChange={(e) => setThreadsText(e.target.value)}
                  rows={4}
                  className="bg-background text-[12.5px]"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full text-[12px]"
                disabled={isPublishing || captureStatus === 'capturing'}
                onClick={() => handlePublish(['threads'])}
              >
                {publishingPlatforms.includes('threads') ? (
                  <RefreshCw data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Send data-icon="inline-start" />
                )}
                {publishingPlatforms.includes('threads')
                  ? t.publish.publishing
                  : format(t.publish.publishOnly, { platform: platformLabels.threads })}
              </Button>
            </div>
          </div>
        </div>

        {/* Publish Action Button */}
        <div className="flex items-center justify-end border-t border-hairline pt-5 gap-3">
          <Link to="/connects">
            <Button variant="ghost" className="border hover:bg-muted text-[13px] h-9">
              {t.publish.manageConnects}
            </Button>
          </Link>
          <Button
            variant="brand"
            className="w-full md:w-auto h-9 gap-1.5 text-[13px] px-5"
            disabled={
              isPublishing || captureStatus === 'capturing' || selectedPlatforms.length === 0
            }
            onClick={async () => {
              setBatchPublishing(true);
              try {
                await handlePublish(selectedPlatforms);
              } finally {
                setBatchPublishing(false);
              }
            }}
          >
            {batchPublishing ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                {captureStatus === 'capturing' ? t.publish.capturingCards : t.publish.publishingAll}
              </>
            ) : (
              <>
                <Send className="size-4" />
                {format(t.publish.publishAllButton, { count: selectedPlatforms.length })}
              </>
            )}
          </Button>
        </div>

        {/* Result Area */}
        {Object.keys(results).length > 0 && (
          <div className="rounded-[10px] border border-hairline bg-card p-5 shadow-edge space-y-4">
            <h3 className="text-[14px] font-semibold text-foreground flex items-center gap-1.5">
              <FileText className="size-4 text-brand" />
              {t.publish.resultsTitle}
            </h3>

            <div className="divide-y divide-hairline">
              {Object.entries(results).map(([platform, res]) => (
                <div key={platform} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold capitalize flex items-center gap-1.5 text-[13px]">
                      {platform === 'facebook' && <FacebookIcon className="size-4" />}
                      {platform === 'instagram' && <InstagramIcon className="size-4" />}
                      {platform === 'threads' && <ThreadsIcon className="size-4 text-foreground" />}
                      {platform}
                    </span>
                    <span
                      className={`text-[11.5px] font-semibold flex items-center gap-1 ${
                        res.ok ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {res.ok ? (
                        <>
                          <CheckCircle2 className="size-3.5" />
                          {t.publish.resultSuccessBadge}
                        </>
                      ) : (
                        <>
                          <AlertCircle className="size-3.5" />
                          {t.publish.resultFailedBadge}
                        </>
                      )}
                    </span>
                  </div>

                  <div className="bg-muted/40 p-3 rounded-lg text-[12.5px] space-y-1 border border-hairline">
                    <p className="text-muted-foreground">{res.message}</p>
                    {res.postId && (
                      <p className="text-[11.5px] font-mono text-foreground font-semibold">
                        Post ID: {res.postId}
                      </p>
                    )}
                    {res.mocked && (
                      <p className="text-[11px] text-brand/85 italic">{t.publish.mockedNote}</p>
                    )}
                  </div>

                  {Boolean(res.payloadPreview) && (
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground block font-semibold">
                        {t.publish.payloadLabel}
                      </span>
                      <pre className="bg-zinc-950 text-zinc-200 p-3 rounded-md text-[11px] font-mono overflow-x-auto border border-zinc-800">
                        {JSON.stringify(res.payloadPreview, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
