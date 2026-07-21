import { Eye, EyeOff, KeyRound, RefreshCw, Unplug } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { API } from '../../lib/api';
import { FacebookIcon } from '../brand-icons';
import { ConnectionDetail, type ConnectionError, type FacebookStatus, SecretValue } from './shared';

export function FacebookPageCard({ initialStatus }: { initialStatus: FacebookStatus | null }) {
  const t = useLocale();
  const [status, setStatus] = useState<FacebookStatus | null>(initialStatus);
  const [token, setToken] = useState('');
  const [pageId, setPageId] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showPageId, setShowPageId] = useState(false);

  useEffect(() => {
    if (!initialStatus) return;
    setStatus(initialStatus);
    setPageId(initialStatus.pageId ?? '');
  }, [initialStatus]);

  const connected = Boolean(status?.tokenMasked && status.pageId);
  const saveDisabled = saving || (!status?.tokenMasked && !token.trim()) || !pageId.trim();

  const showConnectionError = (error: string | undefined) => {
    if (error === 'missing_page_id') {
      toast.error(t.connects.toastMissingPageId);
      return;
    }
    if (error === 'account_mismatch') {
      toast.error(t.connects.toastFacebookAccountMismatch);
      return;
    }
    if (error === 'missing_publish_permission') {
      toast.error(t.connects.toastFacebookMissingPublishPermission);
      return;
    }
    if (error === 'invalid_token' || error === 'invalid_response') {
      toast.error(t.connects.toastFacebookInvalidToken);
      return;
    }
    toast.error(t.connects.toastInvalid);
  };

  const save = async () => {
    const payload: { token?: string; pageId: string } = { pageId: pageId.trim() };
    if (token.trim()) payload.token = token.trim();

    setSaving(true);
    try {
      const res = await fetch(`${API.connects}/facebook`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as {
        facebook?: FacebookStatus;
      } & ConnectionError;
      if (!res.ok) {
        if (res.status === 400) showConnectionError(body.error);
        else toast.error(t.connects.toastSaveFailed);
        return;
      }
      if (body.facebook) {
        setStatus(body.facebook);
        setPageId(body.facebook.pageId ?? '');
      }
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
      const res = await fetch(`${API.connects}/facebook/test`, { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        pageId?: string;
        pageName?: string;
      } & ConnectionError;
      if (res.ok && body.ok && body.pageName) {
        setStatus((previous) =>
          previous
            ? {
                ...previous,
                pageId: body.pageId ?? previous.pageId,
                pageName: body.pageName ?? previous.pageName,
              }
            : null,
        );
        toast.success(format(t.connects.toastFacebookConnectionSuccess, { name: body.pageName }));
        return;
      }
      toast.error(t.connects.toastFacebookTestFailed);
    } catch {
      toast.error(t.connects.toastTestError);
    } finally {
      setTesting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm(t.connects.confirmFacebookDisconnect)) return;
    setDisconnecting(true);
    try {
      const res = await fetch(`${API.connects}/facebook/disconnect`, { method: 'POST' });
      if (!res.ok) {
        toast.error(t.connects.toastDisconnectFailed);
        return;
      }
      setStatus(null);
      setToken('');
      setPageId('');
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
          <FacebookIcon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-[15px] font-semibold tracking-tight">
            {t.connects.facebookTitle}
          </h2>
        </div>
        <Badge variant={connected ? 'default' : 'secondary'}>
          {connected ? t.connects.connected : t.connects.notConnected}
        </Badge>
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
        {t.connects.facebookDesc}
      </p>

      <div className="mt-5 flex flex-col gap-4">
        {connected && !isEditing ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-lg border border-hairline bg-muted/30 p-4 text-[13px]">
              <ConnectionDetail label={t.connects.facebookPageName}>
                <span className="font-medium">{status?.pageName ?? '—'}</span>
              </ConnectionDetail>
              <ConnectionDetail label={t.connects.facebookPageIdLabel}>
                <SecretValue
                  visible={showPageId}
                  value={status?.pageId ?? ''}
                  onToggle={() => setShowPageId((value) => !value)}
                  showLabel={t.connects.showSecret}
                  hideLabel={t.connects.hideSecret}
                />
              </ConnectionDetail>
              <ConnectionDetail label={t.connects.tokenStatus}>
                <SecretValue
                  visible={showToken}
                  value={status?.tokenMasked ?? ''}
                  onToggle={() => setShowToken((value) => !value)}
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
              <label htmlFor="connects-fb-token" className="eyebrow">
                {t.connects.facebookTokenLabel}
              </label>
              <div className="relative flex items-center">
                <Input
                  id="connects-fb-token"
                  type={showToken ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={token}
                  placeholder={t.connects.facebookTokenPlaceholder}
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
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t.connects.facebookTokenHelp}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="connects-fb-page-id" className="eyebrow">
                {t.connects.facebookPageIdLabel}
              </label>
              <div className="relative flex items-center">
                <Input
                  id="connects-fb-page-id"
                  type={showPageId ? 'text' : 'password'}
                  inputMode="numeric"
                  autoComplete="off"
                  value={pageId}
                  placeholder={t.connects.facebookPageIdPlaceholder}
                  onChange={(event) => setPageId(event.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPageId((value) => !value)}
                  className="absolute right-3 text-muted-foreground hover:text-foreground"
                  title={showPageId ? t.connects.hideSecret : t.connects.showSecret}
                >
                  {showPageId ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
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
