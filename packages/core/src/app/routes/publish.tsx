import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronDown,
  FileText,
  Globe,
  ImageIcon,
  RefreshCw,
  Send,
  Share2,
  Sparkles,
} from 'lucide-react';
import { createElement, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Link, useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { designToCssVars } from '../lib/design';
import { SlidePageProvider } from '../lib/page-context';
import { PngExportVariantProvider } from '../lib/png-export-variant';
import { isFrameAnimationSettled, waitForDataWaitfor, waitForFonts } from '../lib/print-ready';
import type { SlideModule } from '../lib/sdk';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../lib/sdk';
import { loadSlide, slideIds } from '../lib/slides';
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

async function captureSlideImages(slideId: string): Promise<string[]> {
  const slide: SlideModule = await loadSlide(slideId);
  const pages = slide.default ?? [];
  if (pages.length === 0) throw new Error('此圖卡沒有頁面可供擷取。');

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
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
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
  const { titleMap } = useOutletContext<HomeOutletContext>();
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
    toast.success('已將文案套用至所有選取的平台！');
  };

  useEffect(() => {
    if (slideIds.length > 0 && !selectedSlideId) {
      setSelectedSlideId(slideIds[0]);
    }
  }, [selectedSlideId]);

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
          message: data.message || '發布成功！',
          mocked: data.mocked,
          postId: data.postId,
          payloadPreview: data.payloadPreview,
        };
      }

      return {
        ok: false,
        message: data.error || 'API 呼叫失敗。',
        payloadPreview: data.payloadPreview,
        error: data.error,
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : '連線錯誤',
      };
    }
  };

  const handlePublish = async (platforms: PublishPlatform[]) => {
    if (!selectedSlideId) {
      toast.error('請先選擇要發布的圖卡組！');
      return;
    }
    if (platforms.length === 0) {
      toast.error('請至少選擇一個要發布的平台！');
      return;
    }
    const missingCaptions = platforms.filter((platform) => !captions[platform].trim());
    if (missingCaptions.length > 0) {
      toast.error(
        `請先填寫 ${missingCaptions.map((platform) => platformLabels[platform]).join('、')} 文案！`,
      );
      return;
    }
    if (platforms.includes('threads') && /[.&]/.test(threadsTopicTag)) {
      toast.error('Threads 主題標籤不能包含句點（.）或 & 符號！');
      return;
    }

    setCaptureStatus('capturing');
    toast.info('正在擷取圖卡為 PNG 圖片…');

    let images: string[];
    try {
      images = await captureSlideImages(selectedSlideId);
      capturedImagesRef.current = images;
      setCaptureStatus('done');
      toast.success(`圖卡擷取完成！共 ${images.length} 頁，正在上傳並發布…`);
    } catch (err) {
      setCaptureStatus('idle');
      toast.error(`圖卡擷取失敗: ${err instanceof Error ? err.message : '未知錯誤'}`);
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
        ? `正在同時發布至 ${platforms.length} 個平台...`
        : `正在發布至 ${platformLabels[platforms[0]]}...`,
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
      toast.success(platforms.length > 1 ? '所選平台皆已發布完成！' : '貼文發布完成！');
    } else {
      toast.warning(
        platforms.length > 1 ? '部分平台發布失敗，請查看發布結果。' : '發布失敗，請查看錯誤詳情。',
      );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 text-foreground">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 items-center justify-center rounded-full bg-brand/10 px-2.5 text-[11px] font-semibold text-brand">
              🚀 社群助手
            </span>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight mt-1">
            Publish (一鍵發文)
          </h1>
          <p className="text-[13px] text-muted-foreground">
            撰寫貼文文案並連同正在設計的投影片圖卡組，一鍵發布至多個社群平台。 圖卡會先被擷取為 PNG
            並上傳至公開圖床，再由 Meta API 讀取發布。
          </p>
        </div>

        {/* Card and Sync Tools */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Card Selection */}
          <div className="rounded-[10px] border border-hairline bg-card p-5 shadow-edge md:col-span-1">
            <span className="eyebrow block mb-2">1. 選擇發布圖卡 (Card)</span>
            <div className="relative">
              <select
                value={selectedSlideId}
                onChange={(e) => setSelectedSlideId(e.target.value)}
                className="w-full h-9 rounded-md border border-hairline bg-background px-3 py-1.5 text-[13px] font-medium shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-brand appearance-none pr-8 cursor-pointer"
              >
                {slideIds.map((id) => (
                  <option key={id} value={id}>
                    {titleMap[id] || id}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              系統會將該圖卡每頁渲染為 PNG，自動上傳至公開圖床後再透過 Meta API 發布。
            </p>
            {captureStatus === 'capturing' && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-brand">
                <RefreshCw className="size-3 animate-spin" />
                正在擷取圖卡…
              </div>
            )}
            {captureStatus === 'done' && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-green-500">
                <ImageIcon className="size-3" />
                擷取完成，共 {capturedImagesRef.current.length} 頁
              </div>
            )}
          </div>

          {/* Sync caption tool */}
          <div className="rounded-[10px] border border-hairline bg-card p-5 shadow-edge md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="eyebrow flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-brand" />
                2. 快速文案同步 (Sync Text)
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11.5px] border hover:bg-muted"
                disabled={!commonText.trim() || (!fbEnabled && !igEnabled && !threadsEnabled)}
                onClick={syncCaptions}
              >
                套用至所有選取平台
              </Button>
            </div>
            <Textarea
              placeholder="在此輸入通用文案，並一鍵點擊套用到所有已勾選的社群平台中..."
              value={commonText}
              onChange={(e) => setCommonText(e.target.value)}
              rows={2}
              className="text-[13px] resize-none"
            />
          </div>
        </div>

        {/* Platform Panels */}
        <div className="space-y-4">
          <span className="eyebrow block">3. 編輯各平台內容</span>

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
                    <div className="flex size-7 items-center justify-center rounded-full bg-blue-500 text-white">
                      <Share2 className="size-4" />
                    </div>
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
                  勾選代表納入一鍵發布，也可只發布此平台。
                </p>
                <Textarea
                  placeholder="輸入 Facebook 貼文文案..."
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
                {publishingPlatforms.includes('facebook') ? '發布中...' : '只發布 Facebook'}
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
                      <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white">
                        <Camera className="size-4" />
                      </div>
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
                    勾選代表納入一鍵發布，也可只發布此平台。
                  </p>
                  <Textarea
                    placeholder="輸入 Instagram 貼文文案..."
                    value={igCaption}
                    onChange={(e) => setIgCaption(e.target.value)}
                    rows={4}
                    className="bg-background text-[12.5px] mt-3"
                  />
                </div>

                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-medium text-muted-foreground block">
                    Hashtags（選填，將自動附加於文案下方）
                  </span>
                  <div className="grid grid-cols-5 gap-1">
                    <div className="relative flex items-center">
                      <span className="absolute left-2 text-[11px] text-muted-foreground select-none font-bold">
                        #
                      </span>
                      <Input
                        placeholder="標籤 1"
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
                        placeholder="標籤 2"
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
                        placeholder="標籤 3"
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
                        placeholder="標籤 4"
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
                        placeholder="標籤 5"
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
                {publishingPlatforms.includes('instagram') ? '發布中...' : '只發布 Instagram'}
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
                      <Globe className="size-4" />
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
                  勾選代表納入一鍵發布，也可只發布此平台。
                </p>
                <Input
                  placeholder="主題標籤（選填，不含 #，每篇限一個）"
                  value={threadsTopicTag}
                  maxLength={50}
                  onChange={(e) => setThreadsTopicTag(e.target.value)}
                  className="bg-background text-[12.5px]"
                />
                <Textarea
                  placeholder="輸入 Threads 串文文案..."
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
                {publishingPlatforms.includes('threads') ? '發布中...' : '只發布 Threads'}
              </Button>
            </div>
          </div>
        </div>

        {/* Publish Action Button */}
        <div className="flex items-center justify-end border-t border-hairline pt-5 gap-3">
          <Link to="/connects">
            <Button variant="ghost" className="border hover:bg-muted text-[13px] h-9">
              管理 API 憑證 (Connects)
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
                {captureStatus === 'capturing' ? '擷取圖卡中...' : '正在同時發布...'}
              </>
            ) : (
              <>
                <Send className="size-4" />
                一鍵發布已選平台 ({selectedPlatforms.length})
              </>
            )}
          </Button>
        </div>

        {/* Result Area */}
        {Object.keys(results).length > 0 && (
          <div className="rounded-[10px] border border-hairline bg-card p-5 shadow-edge space-y-4">
            <h3 className="text-[14px] font-semibold text-foreground flex items-center gap-1.5">
              <FileText className="size-4 text-brand" />
              發布結果與封包檢視 (Payload Preview)
            </h3>

            <div className="divide-y divide-hairline">
              {Object.entries(results).map(([platform, res]) => (
                <div key={platform} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold capitalize flex items-center gap-1.5 text-[13px]">
                      {platform === 'facebook' && <Share2 className="size-4 text-blue-500" />}
                      {platform === 'instagram' && <Camera className="size-4 text-pink-500" />}
                      {platform === 'threads' && <Globe className="size-4 text-foreground" />}
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
                          成功
                        </>
                      ) : (
                        <>
                          <AlertCircle className="size-3.5" />
                          失敗
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
                      <p className="text-[11px] text-brand/85 italic">
                        ℹ️ 偵測到本機開發模式或未配置 Token，已提供預覽 API 發送封包。
                      </p>
                    )}
                  </div>

                  {Boolean(res.payloadPreview) && (
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground block font-semibold">
                        預計發送之 Meta API JSON 封包 (Payload)：
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
