import { Plug, Rocket, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { API } from '../../shared/api-routes';
import { CodexAgentCard, GemmaAgentCard } from '../components/connects/agent-cards';
import { FacebookPageCard } from '../components/connects/facebook';
import { ImgbbCard } from '../components/connects/imgbb';
import { InstagramCard } from '../components/connects/instagram';
import type {
  FacebookStatus,
  ImgbbStatus,
  InstagramStatus,
  ThreadsStatus,
} from '../components/connects/shared';
import { ThreadsCard } from '../components/connects/threads';

type SubPage = 'ai' | 'publish';

const SUBPAGES: Array<{ id: SubPage; label: string; icon: typeof Sparkles; description: string }> =
  [
    {
      id: 'ai',
      label: 'AI 模型串接',
      icon: Sparkles,
      description:
        '接上任一個 agent，就能在首頁用提示詞直接生成卡片——GPT 訂閱、Google 免費額度或地端模型都可以。',
    },
    {
      id: 'publish',
      label: '發佈平台串接',
      icon: Rocket,
      description: '發佈到社群平台所需的帳號與 API 設定。',
    },
  ];

function PublishConnects() {
  const [instagramStatus, setInstagramStatus] = useState<InstagramStatus | null>(null);
  const [facebookStatus, setFacebookStatus] = useState<FacebookStatus | null>(null);
  const [threadsStatus, setThreadsStatus] = useState<ThreadsStatus | null>(null);
  const [imgbbStatus, setImgbbStatus] = useState<ImgbbStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(API.connects)
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          body: {
            instagram?: InstagramStatus;
            facebook?: FacebookStatus;
            threads?: ThreadsStatus;
            imgbb?: ImgbbStatus;
          } | null,
        ) => {
          if (cancelled || !body) return;
          if (body.instagram) setInstagramStatus(body.instagram);
          if (body.facebook) setFacebookStatus(body.facebook);
          if (body.threads) setThreadsStatus(body.threads);
          if (body.imgbb) setImgbbStatus(body.imgbb);
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <InstagramCard initialStatus={instagramStatus} />
      <FacebookPageCard initialStatus={facebookStatus} />
      <ThreadsCard initialStatus={threadsStatus} />
      <ImgbbCard initialStatus={imgbbStatus} />
    </div>
  );
}

function AiConnects() {
  return (
    <div className="flex flex-col gap-5">
      <CodexAgentCard />
      <GemmaAgentCard />
    </div>
  );
}

export function ConnectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const active: SubPage = searchParams.get('tab') === 'publish' ? 'publish' : 'ai';
  const activePage = SUBPAGES.find((page) => page.id === active) ?? SUBPAGES[0];

  const selectSubPage = (id: SubPage) => {
    setSearchParams(id === 'ai' ? {} : { tab: id }, { replace: true });
  };

  return (
    <>
      <header className="mb-6 md:mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <Plug className="size-5 text-brand" />
          <h1 className="font-heading text-xl font-bold tracking-tight md:text-2xl">串接</h1>
          <div className="ml-auto flex shrink-0 items-center gap-0.5 rounded-[7px] border border-hairline bg-card p-0.5 shadow-edge">
            {SUBPAGES.map((page) => {
              const isActive = page.id === active;
              const Icon = page.icon;
              return (
                <button
                  key={page.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => selectSubPage(page.id)}
                  className={cn(
                    'flex h-6 items-center gap-1.5 rounded-[5px] px-2.5 text-[12px] font-medium transition-colors',
                    isActive
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" />
                  {page.label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {activePage.description}
        </p>
      </header>
      <div className="max-w-3xl">{active === 'ai' ? <AiConnects /> : <PublishConnects />}</div>
    </>
  );
}
