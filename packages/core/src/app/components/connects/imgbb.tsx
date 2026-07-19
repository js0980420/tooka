import { Eye, EyeOff, ImageUp, KeyRound, RefreshCw, Unplug } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { API } from '../../../shared/api-routes';
import { ConnectionDetail, type ConnectionError, type ImgbbStatus, SecretValue } from './shared';

export function ImgbbCard({ initialStatus }: { initialStatus: ImgbbStatus | null }) {
  const t = useLocale();
  const [status, setStatus] = useState<ImgbbStatus | null>(initialStatus);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (!initialStatus) return;
    setStatus(initialStatus);
  }, [initialStatus]);

  const connected = Boolean(status?.keyMasked);
  const saveDisabled = saving || (!status?.keyMasked && !apiKey.trim());

  const showConnectionError = (error: string | undefined) => {
    if (error === 'invalid_key') {
      toast.error(t.connects.toastImgbbInvalidKey);
      return;
    }
    toast.error(t.connects.toastInvalid);
  };

  const save = async () => {
    const payload: { key?: string } = {};
    if (apiKey.trim()) payload.key = apiKey.trim();

    setSaving(true);
    try {
      const res = await fetch(`${API.connects}/imgbb`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as {
        imgbb?: ImgbbStatus;
      } & ConnectionError;
      if (!res.ok) {
        if (res.status === 400) showConnectionError(body.error);
        else toast.error(t.connects.toastSaveFailed);
        return;
      }
      if (body.imgbb) setStatus(body.imgbb);
      setApiKey('');
      setShowKey(false);
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
      const res = await fetch(`${API.connects}/imgbb/test`, { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean } & ConnectionError;
      if (res.ok && body.ok) {
        toast.success(t.connects.toastImgbbConnectionSuccess);
        return;
      }
      toast.error(t.connects.toastImgbbTestFailed);
    } catch {
      toast.error(t.connects.toastTestError);
    } finally {
      setTesting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm(t.connects.confirmImgbbDisconnect)) return;
    setDisconnecting(true);
    try {
      const res = await fetch(`${API.connects}/imgbb/disconnect`, { method: 'POST' });
      if (!res.ok) {
        toast.error(t.connects.toastDisconnectFailed);
        return;
      }
      setStatus(null);
      setApiKey('');
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
        <div className="flex size-9 items-center justify-center rounded-[8px] bg-muted/60">
          <ImageUp className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-[15px] font-semibold tracking-tight">
            {t.connects.imgbbTitle}
          </h2>
        </div>
        <Badge variant={connected ? 'default' : 'secondary'}>
          {connected ? t.connects.connected : t.connects.notConnected}
        </Badge>
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
        {t.connects.imgbbDesc}{' '}
        <a
          href="https://api.imgbb.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand hover:underline"
        >
          {t.connects.imgbbRegisterLink}
        </a>
        {' · '}
        <Link to="/tutorials" className="text-brand hover:underline">
          {t.connects.imgbbTutorialLink}
        </Link>
      </p>

      <div className="mt-5 flex flex-col gap-4">
        {connected && !isEditing ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-lg border border-hairline bg-muted/30 p-4 text-[13px]">
              <ConnectionDetail label={t.connects.imgbbKeyStatus}>
                <SecretValue
                  visible={showKey}
                  value={status?.keyMasked ?? ''}
                  onToggle={() => setShowKey((value) => !value)}
                  showLabel={t.connects.showSecret}
                  hideLabel={t.connects.hideSecret}
                />
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
                  setApiKey('');
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
              <label htmlFor="connects-imgbb-key" className="eyebrow">
                {t.connects.imgbbKeyLabel}
              </label>
              <div className="relative flex items-center">
                <Input
                  id="connects-imgbb-key"
                  type={showKey ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={apiKey}
                  placeholder={t.connects.imgbbKeyPlaceholder}
                  onChange={(event) => setApiKey(event.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((value) => !value)}
                  className="absolute right-3 text-muted-foreground hover:text-foreground"
                  title={showKey ? t.connects.hideSecret : t.connects.showSecret}
                >
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {status?.keyMasked ? (
                <p className="text-[11px] text-muted-foreground">
                  {t.connects.imgbbSavedKeyLabel}: <span className="font-mono">••••••••••••</span>
                </p>
              ) : null}
            </div>

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
