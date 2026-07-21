import config from 'virtual:tooka/config';
import { ExternalLink, Loader2, Mail, RefreshCw, RotateCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, useLocale } from '@/lib/use-locale';
import { API } from '../../lib/api';

type UpdateCheck = { current: string; latest: string | null; outdated: boolean };
type ServerStatus = { executionId: string; canRestart: boolean };
type UpdateStatus = 'idle' | 'running' | 'done' | 'error';

const buttonClassName =
  'h-6 w-fit rounded-[5px] border border-background/15 bg-background/8 px-2 text-[11px] text-background shadow-none hover:bg-background/14';
const contactLinkClassName =
  'group flex min-h-10 w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2.5 text-[14.5px] font-medium text-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40';

const LINE_URL = 'https://lin.ee/6CBv54X';
const SUPPORT_EMAIL = 'js0980420@gmail.com';

function LineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

async function fetchServerStatus(): Promise<ServerStatus | null> {
  const res = await fetch(API.serverStatus);
  if (!res.ok) return null;
  return (await res.json()) as ServerStatus;
}

export function SidebarFooter() {
  const t = useLocale();
  const [update, setUpdate] = useState<UpdateCheck | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [canRestart, setCanRestart] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let cancelled = false;
    fetch(API.updateCheck)
      .then((res) => (res.ok ? (res.json() as Promise<UpdateCheck>) : null))
      .then((data) => {
        if (!cancelled && data?.outdated) setUpdate(data);
      })
      .catch(() => {});
    fetchServerStatus()
      .then((status) => {
        if (!cancelled && status) setCanRestart(status.canRestart);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const label = `v ${config.version}`;
  const isUpdating = updateStatus === 'running';
  const keepOpen = updateStatus === 'running' || restarting;

  async function updatePackage() {
    if (isUpdating) return;
    setUpdateStatus('running');
    setOpen(true);
    try {
      const res = await fetch(API.updatePackage, { method: 'POST' });
      if (!res.ok) throw new Error('update failed');
      setUpdateStatus('done');
      toast.success(t.home.updatePackageDone);
    } catch {
      setUpdateStatus('error');
      toast.error(t.home.updatePackageFailed);
    }
  }

  async function restartServer() {
    if (restarting) return;
    setRestarting(true);
    try {
      const before = await fetchServerStatus();
      if (!before) throw new Error('server status unavailable');
      const res = await fetch(API.restartServer, { method: 'POST' });
      if (!res.ok) throw new Error('restart failed');
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const status = await fetchServerStatus().catch(() => null);
        if (status && status.executionId !== before.executionId) {
          window.location.reload();
          return;
        }
      }
      throw new Error('restart timed out');
    } catch {
      setRestarting(false);
      toast.error(t.home.restartServerFailed);
    }
  }

  const versionRow = (
    <span className="inline-flex cursor-default items-center gap-1.5">
      {update?.latest && <span className="size-1.5 rounded-full bg-brand" aria-hidden />}
      {label}
    </span>
  );

  return (
    <div className="flex flex-col gap-1 px-2 py-2 text-[13px] text-muted-foreground/70 tabular-nums">
      <div className="flex items-center gap-2 px-2 pb-2">
        <h2 className="eyebrow text-[13.5px]">{t.home.contactSupport}</h2>
        <span className="h-px flex-1 bg-hairline" aria-hidden />
      </div>
      <a href={LINE_URL} target="_blank" rel="noreferrer" className={contactLinkClassName}>
        <LineIcon className="size-7 shrink-0 text-[#06C755]" />
        <span className="min-w-0 flex-1 truncate">{t.home.lineOfficialAccount}</span>
        <ExternalLink
          className="size-[18px] shrink-0 text-muted-foreground/55 transition-colors group-hover:text-foreground/65"
          aria-hidden
        />
        <span className="sr-only">{t.home.opensInNewWindow}</span>
      </a>
      <a href={`mailto:${SUPPORT_EMAIL}`} className={contactLinkClassName}>
        <Mail className="size-7 shrink-0 text-muted-foreground" aria-hidden />
        <span className="sr-only">Email: </span>
        <span className="min-w-0 flex-1 truncate">{SUPPORT_EMAIL}</span>
      </a>
      <div className="px-2 pt-0.5">
        {update?.latest ? (
          <TooltipProvider delay={200}>
            <Tooltip
              open={open}
              onOpenChange={(next) => {
                if (!next && keepOpen) return;
                setOpen(next);
              }}
            >
              <TooltipTrigger render={versionRow} />
              <TooltipContent
                side="top"
                align="start"
                alignOffset={-8}
                sideOffset={9}
                collisionPadding={12}
                className="flex w-[232px] max-w-[calc(100vw-24px)] flex-col gap-2.5 rounded-[8px] border border-background/10 bg-foreground/95 p-2.5 text-[11.5px] leading-4 shadow-[0_12px_32px_oklch(0_0_0/0.28)] backdrop-blur"
              >
                {updateStatus === 'done' ? (
                  <>
                    <span className="pr-1 text-background/92">{t.home.updatePackageDone}</span>
                    {canRestart && (
                      <Button
                        type="button"
                        size="xs"
                        variant="secondary"
                        className={buttonClassName}
                        disabled={restarting}
                        onClick={restartServer}
                      >
                        {restarting ? (
                          <Loader2 className="animate-spin" aria-hidden />
                        ) : (
                          <RotateCw aria-hidden />
                        )}
                        {restarting ? t.home.restartingServer : t.home.restartServer}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <span className="pr-1 text-background/92">
                      {format(t.home.updateAvailable, { version: update.latest })}
                    </span>
                    <Button
                      type="button"
                      size="xs"
                      variant="secondary"
                      className={buttonClassName}
                      disabled={isUpdating}
                      onClick={updatePackage}
                    >
                      {isUpdating ? (
                        <Loader2 className="animate-spin" aria-hidden />
                      ) : (
                        <RefreshCw aria-hidden />
                      )}
                      {isUpdating ? t.home.updatingPackage : t.home.updatePackage}
                    </Button>
                    {updateStatus === 'error' && (
                      <span className="text-[11px] leading-4 text-background/65">
                        {t.home.updatePackageFailed}
                      </span>
                    )}
                  </>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          versionRow
        )}
      </div>
    </div>
  );
}
