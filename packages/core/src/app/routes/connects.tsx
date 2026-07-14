import { Camera, KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { FolderIconChip } from '../components/sidebar/folder-item';

type InstagramStatus = { tokenMasked: string | null; userId: string | null };

export function ConnectsPage() {
  const t = useLocale();
  return (
    <>
      <header className="mb-8 md:mb-12">
        <div className="flex flex-wrap items-center gap-3">
          <FolderIconChip icon={{ type: 'emoji', value: '🔌' }} className="size-7 text-2xl" />
          <h1 className="font-heading text-[32px] font-semibold leading-[1.05] tracking-[-0.025em] md:text-[44px]">
            {t.connects.title}
          </h1>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {t.connects.subtitle}
        </p>
      </header>
      <div className="max-w-xl">
        <InstagramCard />
      </div>
    </>
  );
}

function InstagramCard() {
  const t = useLocale();
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/__connects')
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { instagram?: InstagramStatus } | null) => {
        if (!cancelled && body?.instagram) setStatus(body.instagram);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const connected = Boolean(status?.tokenMasked && status?.userId);

  const save = async () => {
    const payload: { token?: string; userId?: string } = {};
    if (token.trim()) payload.token = token.trim();
    if (userId.trim()) payload.userId = userId.trim();
    if (!payload.token && !payload.userId) return;

    setSaving(true);
    try {
      const res = await fetch('/__connects/instagram', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 400) {
        toast.error(t.connects.toastInvalid);
        return;
      }
      if (!res.ok) throw new Error(`POST /__connects/instagram ${res.status}`);
      const body = (await res.json()) as { instagram?: InstagramStatus };
      if (body.instagram) setStatus(body.instagram);
      setToken('');
      setUserId('');
      toast.success(t.connects.toastSaved);
    } catch {
      toast.error(t.connects.toastSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[10px] border border-hairline bg-card p-5 shadow-edge">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-[8px] bg-brand/10 text-brand">
          <Camera className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-[15px] font-semibold tracking-tight">
            {t.connects.instagramTitle}
          </h2>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
            connected ? 'bg-brand/10 text-brand' : 'bg-muted text-muted-foreground',
          )}
        >
          {connected ? t.connects.connected : t.connects.notConnected}
        </span>
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
        {t.connects.instagramDesc}{' '}
        <Link to="/tutorials" className="text-brand hover:underline">
          {t.connects.tutorialLink}
        </Link>
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="connects-ig-token" className="eyebrow">
            {t.connects.tokenLabel}
          </label>
          <Input
            id="connects-ig-token"
            type="password"
            autoComplete="off"
            value={token}
            placeholder={status?.tokenMasked ?? t.connects.tokenPlaceholder}
            onChange={(e) => setToken(e.target.value)}
          />
          {status?.tokenMasked ? (
            <p className="text-[11px] text-muted-foreground">
              {t.connects.savedTokenLabel}: <span className="font-mono">{status.tokenMasked}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="connects-ig-user-id" className="eyebrow">
            {t.connects.userIdLabel}
          </label>
          <Input
            id="connects-ig-user-id"
            autoComplete="off"
            value={userId}
            placeholder={status?.userId ?? t.connects.userIdPlaceholder}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="brand"
            size="sm"
            disabled={saving || (!token.trim() && !userId.trim())}
            onClick={save}
          >
            <KeyRound className="size-4" />
            {saving ? t.connects.saving : t.connects.save}
          </Button>
        </div>

        <p className="rounded-[6px] bg-muted/60 px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
          {t.connects.envNote}
        </p>
      </div>
    </section>
  );
}
