import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Camera,
  Share2,
  FileText,
  Globe,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { slideIds } from '../lib/slides';
import type { HomeOutletContext } from './home-shell';

type PublishResult = {
  ok: boolean;
  message: string;
  mocked?: boolean;
  postId?: string;
  payloadPreview?: unknown;
  error?: string;
};

export function PublishPage() {
  const { titleMap } = useOutletContext<HomeOutletContext>();
  const [selectedSlideId, setSelectedSlideId] = useState('');

  // Platforms state
  const [fbEnabled, setFbEnabled] = useState(false);
  const [fbCaption, setFbCaption] = useState('');

  const [igEnabled, setIgEnabled] = useState(false);
  const [igCaption, setIgCaption] = useState('');

  const [threadsEnabled, setThreadsEnabled] = useState(false);
  const [threadsText, setThreadsText] = useState('');

  // Common content sync
  const [commonText, setCommonText] = useState('');

  // Status
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<Record<string, PublishResult>>({});

  // Sync common text to active platforms
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

  const handlePublish = async () => {
    if (!selectedSlideId) {
      toast.error('請先選擇要發布的圖卡組！');
      return;
    }

    const activePlatforms = [];
    if (fbEnabled) activePlatforms.push('facebook');
    if (igEnabled) activePlatforms.push('instagram');
    if (threadsEnabled) activePlatforms.push('threads');

    if (activePlatforms.length === 0) {
      toast.error('請至少選擇一個要發布的平台！');
      return;
    }

    setPublishing(true);
    setResults({});
    toast.info('開始進行社群平台發布流程...');

    const newResults: Record<string, PublishResult> = {};

    for (const platform of activePlatforms) {
      let caption = '';
      if (platform === 'facebook') caption = fbCaption;
      if (platform === 'instagram') caption = igCaption;
      if (platform === 'threads') caption = threadsText;

      try {
        const res = await fetch(`/__publish/${platform}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            slideId: selectedSlideId,
            caption: caption,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          newResults[platform] = {
            ok: true,
            message: data.message || '發布成功！',
            mocked: data.mocked,
            postId: data.postId,
            payloadPreview: data.payloadPreview,
          };
        } else {
          newResults[platform] = {
            ok: false,
            message: data.error || 'API 呼叫失敗。',
            payloadPreview: data.payloadPreview,
            error: data.error,
          };
        }
      } catch (err) {
        newResults[platform] = {
          ok: false,
          message: err instanceof Error ? err.message : '連線錯誤',
        };
      }
    }

    setResults(newResults);
    setPublishing(false);

    const allSuccess = Object.values(newResults).every((r) => r.ok);
    if (allSuccess) {
      toast.success('所選平台發布完成！');
    } else {
      toast.warning('部分平台發布失敗，請至下方查閱詳情。');
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
            撰寫貼文文案並連同正在設計的投影片圖卡組，一鍵發布至多個社群平台。
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
              系統將會渲染該卡片，並連同下方文案一起發布至所選的社群平台。
            </p>
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
                  勾選後發布至您的 Facebook 粉絲專頁，支援單圖/多圖貼文。
                </p>
                {fbEnabled && (
                  <Textarea
                    placeholder="輸入 Facebook 貼文文案..."
                    value={fbCaption}
                    onChange={(e) => setFbCaption(e.target.value)}
                    rows={4}
                    className="text-[12.5px] bg-background"
                  />
                )}
              </div>
            </div>

            {/* Instagram */}
            <div
              className={`rounded-[10px] border p-5 shadow-edge transition-all flex flex-col justify-between ${
                igEnabled
                  ? 'border-pink-500/30 bg-pink-500/[0.02]'
                  : 'border-hairline bg-card opacity-80 hover:opacity-100'
              }`}
            >
              <div className="space-y-3">
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
                <p className="text-[11.5px] text-muted-foreground">
                  以 Carousel (輪播圖) 形式發布您的圖卡組，支援滑動多圖。
                </p>
                {igEnabled && (
                  <Textarea
                    placeholder="輸入 Instagram 貼文文案..."
                    value={igCaption}
                    onChange={(e) => setIgCaption(e.target.value)}
                    rows={4}
                    className="text-[12.5px] bg-background"
                  />
                )}
              </div>
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
                  勾選後發布至您的 Threads 帳號，支援多媒體串文貼文。
                </p>
                {threadsEnabled && (
                  <Textarea
                    placeholder="輸入 Threads 串文文案..."
                    value={threadsText}
                    onChange={(e) => setThreadsText(e.target.value)}
                    rows={4}
                    className="text-[12.5px] bg-background"
                  />
                )}
              </div>
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
            disabled={publishing || (!fbEnabled && !igEnabled && !threadsEnabled)}
            onClick={handlePublish}
          >
            {publishing ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                正在發布貼文...
              </>
            ) : (
              <>
                <Send className="size-4" />
                一鍵發布 (Publish Now)
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
                      {platform === 'facebook' && (
                        <Share2 className="size-4 text-blue-500" />
                      )}
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
