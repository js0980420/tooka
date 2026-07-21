import { Eye, EyeOff, KeyRound, RefreshCw, ShieldAlert, Unplug } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { API } from '../../lib/api';
import { ThreadsIcon } from '../brand-icons';
import { ConnectionDetail, type ConnectionError, SecretValue, type ThreadsStatus } from './shared';

export function ThreadsCard({ initialStatus }: { initialStatus: ThreadsStatus | null }) {
  const t = useLocale();
  const [status, setStatus] = useState<ThreadsStatus | null>(initialStatus);
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showUserId, setShowUserId] = useState(false);

  useEffect(() => {
    if (!initialStatus) return;
    setStatus(initialStatus);
  }, [initialStatus]);

  const connected = Boolean(status?.tokenMasked && status.userId);
  const needsReauth = Boolean(status?.needsReauth);
  const saveDisabled = saving || (!status?.tokenMasked && !token.trim());

  const showConnectionError = (error: string | undefined) => {
    if (error === 'invalid_token' || error === 'invalid_response') {
      toast.error(t.connects.toastThreadsInvalidToken);
      return;
    }
    toast.error(t.connects.toastInvalid);
  };

  const save = async () => {
    const payload: { token?: string } = {};
    if (token.trim()) payload.token = token.trim();

    setSaving(true);
    try {
      const res = await fetch(`${API.connects}/threads`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as {
        threads?: ThreadsStatus;
      } & ConnectionError;
      if (!res.ok) {
        if (res.status === 400) showConnectionError(body.error);
        else toast.error(t.connects.toastSaveFailed);
        return;
      }
      if (body.threads) setStatus(body.threads);
      setToken('');
      setShowToken(false);
      setIsEditing(false);
      toast.success(t.connects.toastSaved);
    } catch {
      toast.error(t.connects.toastSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch(`${API.connects}/threads/test`, { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        username?: string;
      } & ConnectionError;
      if (res.ok && body.ok && body.username) {
        setStatus((previous) =>
          previous ? { ...previous, username: body.username ?? null, needsReauth: false } : null,
        );
        toast.success(
          format(t.connects.toastThreadsConnectionSuccess, { username: body.username }),
        );
        return;
      }
      if (body.error === 'invalid_token') {
        setStatus((previous) => (previous ? { ...previous, needsReauth: true } : null));
      }
      toast.error(t.connects.toastThreadsTestFailed);
    } catch {
      toast.error(t.connects.toastTestError);
    } finally {
      setTesting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm(t.connects.confirmThreadsDisconnect)) return;
    setDisconnecting(true);
    try {
      const res = await fetch(`${API.connects}/threads/disconnect`, { method: 'POST' });
      if (!res.ok) {
        toast.error(t.connects.toastDisconnectFailed);
        return;
      }
      setStatus(null);
      setToken('');
      setIsEditing(false);
      toast.success(t.connects.toastDisconnected);
    } catch {
      toast.error(t.connects.toastDisconnectFailed);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <section className="rounded-[10px] border border-hairline bg-card p-5 shadow-edge">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-[8px] bg-muted/60 text-foreground">
          <ThreadsIcon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-[15px] font-semibold tracking-tight">
            {t.connects.threadsTitle}
          </h2>
        </div>
        <Badge variant={needsReauth ? 'destructive' : connected ? 'default' : 'secondary'}>
          {needsReauth ? <ShieldAlert data-icon="inline-start" /> : null}
          {needsReauth
            ? t.connects.needsReauth
            : connected
              ? t.connects.connected
              : t.connects.notConnected}
        </Badge>
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
        {t.connects.threadsDesc}{' '}
        <Link to="/tutorials" className="text-brand hover:underline">
          {t.connects.threadsTutorialLink}
        </Link>
      </p>

      <div className="mt-5 flex flex-col gap-4">
        {connected && !isEditing ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-lg border border-hairline bg-muted/30 p-4 text-[13px]">
              <ConnectionDetail label={t.connects.threadsAccountUsername}>
                <span className="font-medium">@{status?.username ?? '—'}</span>
              </ConnectionDetail>
              <ConnectionDetail label={t.connects.accountId}>
                <SecretValue
                  visible={showUserId}
                  value={status?.userId ?? ''}
                  onToggle={() => setShowUserId((value) => !value)}
                  showLabel={t.connects.showSecret}
                  hideLabel={t.connects.hideSecret}
                />
              </ConnectionDetail>
              <ConnectionDetail label={t.connects.tokenStatus}>
                {needsReauth ? (
                  <span className="flex items-center gap-1 font-medium text-destructive">
                    <ShieldAlert className="size-3.5" />
                    {t.connects.needsReauth}
                  </span>
                ) : (
                  <SecretValue
                    visible={showToken}
                    value={status?.tokenMasked ?? ''}
                    onToggle={() => setShowToken((value) => !value)}
                    showLabel={t.connects.showSecret}
                    hideLabel={t.connects.hideSecret}
                  />
                )}
              </ConnectionDetail>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button variant="brand" size="sm" disabled={testing} onClick={testConnection}>
                <RefreshCw data-icon="inline-start" className={cn(testing && 'animate-spin')} />
                {testing ? t.connects.testing : t.connects.test}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(true);
                  setToken('');
                }}
              >
                <KeyRound data-icon="inline-start" />
                {t.connects.reconnect}
              </Button>
              <Button variant="ghost" size="sm" disabled={disconnecting} onClick={disconnect}>
                <Unplug data-icon="inline-start" />
                {t.connects.disconnect}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="connects-threads-token" className="eyebrow">
                {t.connects.tokenLabel}
              </label>
              <div className="relative flex items-center">
                <Input
                  id="connects-threads-token"
                  type={showToken ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={token}
                  placeholder={t.connects.threadsTokenPlaceholder}
                  onChange={(event) => setToken(event.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((value) => !value)}
                  className="absolute right-3 text-muted-foreground hover:text-foreground"
                  title={showToken ? t.connects.hideSecret : t.connects.showSecret}
                >
                  {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {status?.tokenMasked && !needsReauth ? (
                <p className="text-[11px] text-muted-foreground">
                  {t.connects.savedTokenLabel}: <span className="font-mono">••••••••••••</span>
                </p>
              ) : null}
            </div>

            <p className="rounded-[6px] border border-hairline bg-muted/40 px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
              {t.connects.threadsUserIdDerived}
            </p>

            <div className="flex items-center gap-2 pt-1">
              <Button variant="brand" size="sm" disabled={saveDisabled} onClick={save}>
                <KeyRound data-icon="inline-start" />
                {saving ? t.connects.saving : t.connects.save}
              </Button>
              {isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  {t.connects.cancel}
                </Button>
              ) : null}
            </div>
          </>
        )}

        <p className="rounded-[6px] bg-muted/60 px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
          {t.connects.envNote}
        </p>
      </div>
    </section>
  );
}
