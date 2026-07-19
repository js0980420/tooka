import { Plug, Rocket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale } from '@/lib/use-locale';
import { API } from '../../shared/api-routes';
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
import { PageTabs } from '../components/page-tabs';

export function ConnectsPage() {
  const t = useLocale();
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
    <>
      <header className="mb-8 md:mb-12">
        <div className="flex flex-wrap items-center gap-3">
          <Plug className="size-5 text-brand" />
          <h1 className="font-heading text-xl font-bold tracking-tight md:text-2xl">
            {t.connects.title}
          </h1>
          <PageTabs
            className="ml-auto"
            tabs={[
              { label: t.home.publish, path: '/publish', icon: Rocket },
              { label: t.home.connects, path: '/connects', icon: Plug },
            ]}
          />
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {t.connects.subtitle}
        </p>
      </header>
      <div className="flex max-w-3xl flex-col gap-5">
        <InstagramCard initialStatus={instagramStatus} />
        <FacebookPageCard initialStatus={facebookStatus} />
        <ThreadsCard initialStatus={threadsStatus} />
        <ImgbbCard initialStatus={imgbbStatus} />
      </div>
    </>
  );
}
