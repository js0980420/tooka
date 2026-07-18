import {
  Eye,
  EyeOff,
  ImageUp,
  KeyRound,
  Plug,
  RefreshCw,
  Rocket,
  ShieldAlert,
  Unplug,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { format, useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { API } from '../../shared/api-routes';
import { FacebookIcon, InstagramIcon, ThreadsIcon } from '../components/brand-icons';
import { PageTabs } from '../components/page-tabs';

type InstagramTokenSource = 'instagram_login' | 'business_system_user';

type InstagramStatus = {
  tokenMasked: string | null;
  userId: string | null;
  username: string | null;
  tokenSource: InstagramTokenSource;
  needsReauth: boolean;
  expiresAt: number | null;
};

type FacebookStatus = {
  tokenMasked: string | null;
  pageId: string | null;
  pageName: string | null;
};

type ThreadsStatus = {
  tokenMasked: string | null;
  userId: string | null;
  username: string | null;
  needsReauth: boolean;
  expiresAt: number | null;
};

type ImgbbStatus = {
  keyMasked: string | null;
};

type ConnectionError = {
  error?: string;
};

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

function InstagramCard({ initialStatus }: { initialStatus: InstagramStatus | null }) {
  const t = useLocale();
  const [status, setStatus] = useState<InstagramStatus | null>(initialStatus);
  const [tokenSource, setTokenSource] = useState<InstagramTokenSource>('business_system_user');
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showUserId, setShowUserId] = useState(false);

  useEffect(() => {
    if (!initialStatus) return;
    setStatus(initialStatus);
    setTokenSource(initialStatus.tokenSource);
    setUserId(initialStatus.userId ?? '');
  }, [initialStatus]);

  const connected = Boolean(status?.tokenMasked && status.userId);
  const needsReauth = Boolean(status?.needsReauth);
  const sourceChanged = Boolean(status && status.tokenSource !== tokenSource);
  const requiresNewToken = !status?.tokenMasked || sourceChanged;
  const saveDisabled =
    saving ||
    (requiresNewToken && !token.trim()) ||
    (tokenSource === 'business_system_user' && !userId.trim());

  const showConnectionError = (error: string | undefined) => {
    if (error === 'missing_user_id') {
      toast.error(t.connects.toastMissingUserId);
      return;
    }
    if (error === 'account_mismatch') {
      toast.error(t.connects.toastAccountMismatch);
      return;
    }
    if (error === 'invalid_token' || error === 'invalid_response') {
      toast.error(t.connects.toastInvalidToken);
      return;
    }
    toast.error(t.connects.toastInvalid);
  };

  const save = async () => {
    const payload: { token?: string; userId?: string; tokenSource: InstagramTokenSource } = {
      tokenSource,
    };
    if (token.trim()) payload.token = token.trim();
    if (tokenSource === 'business_system_user' && userId.trim()) {
      payload.userId = userId.trim();
    }

    setSaving(true);
    try {
      const res = await fetch(`${API.connects}/instagram`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as {
        instagram?: InstagramStatus;
      } & ConnectionError;
      if (!res.ok) {
        if (res.status === 400) showConnectionError(body.error);
        else toast.error(t.connects.toastSaveFailed);
        return;
      }
      if (body.instagram) {
        setStatus(body.instagram);
        setTokenSource(body.instagram.tokenSource);
        setUserId(body.instagram.userId ?? '');
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
      const res = await fetch(`${API.connects}/instagram/test`, { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        username?: string;
      } & ConnectionError;
      if (res.ok && body.ok && body.username) {
        setStatus((previous) =>
          previous ? { ...previous, username: body.username ?? null, needsReauth: false } : null,
        );
        toast.success(format(t.connects.toastConnectionSuccess, { username: body.username }));
        return;
      }
      if (body.error === 'invalid_token') {
        setStatus((previous) => (previous ? { ...previous, needsReauth: true } : null));
      }
      toast.error(t.connects.toastTestFailed);
    } catch {
      toast.error(t.connects.toastTestError);
    } finally {
      setTesting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm(t.connects.confirmDisconnect)) return;
    setDisconnecting(true);
    try {
      const res = await fetch(`${API.connects}/instagram/disconnect`, { method: 'POST' });
      if (!res.ok) {
        toast.error(t.connects.toastDisconnectFailed);
        return;
      }
      setStatus(null);
      setToken('');
      setUserId('');
      setTokenSource('business_system_user');
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
          <InstagramIcon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-[15px] font-semibold tracking-tight">
            {t.connects.instagramTitle}
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
        {t.connects.instagramDesc}{' '}
        <Link to="/tutorials" className="text-brand hover:underline">
          {t.connects.tutorialLink}
        </Link>
      </p>

      <div className="mt-5 flex flex-col gap-4">
        {connected && !isEditing ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-lg border border-hairline bg-muted/30 p-4 text-[13px]">
              <ConnectionDetail label={t.connects.accountUsername}>
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
              <ConnectionDetail label={t.connects.tokenSourceLabel}>
                <span className="font-medium">
                  {status?.tokenSource === 'instagram_login'
                    ? t.connects.instagramLogin
                    : t.connects.businessSystemUser}
                </span>
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
            <div className="flex flex-col gap-2">
              <span className="eyebrow">{t.connects.tokenSourceLabel}</span>
              <ToggleGroup
                variant="outline"
                value={[tokenSource]}
                onValueChange={(values) => {
                  const nextSource = values.find((value) => value !== tokenSource);
                  if (nextSource === 'business_system_user' || nextSource === 'instagram_login') {
                    setTokenSource(nextSource);
                  }
                }}
                className="w-full"
              >
                <ToggleGroupItem value="business_system_user" className="flex-1">
                  {t.connects.businessSystemUser}
                </ToggleGroupItem>
                <ToggleGroupItem value="instagram_login" className="flex-1">
                  {t.connects.instagramLogin}
                </ToggleGroupItem>
              </ToggleGroup>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {tokenSource === 'business_system_user'
                  ? t.connects.businessSystemUserDesc
                  : t.connects.instagramLoginDesc}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="connects-ig-token" className="eyebrow">
                {t.connects.tokenLabel}
              </label>
              <div className="relative flex items-center">
                <Input
                  id="connects-ig-token"
                  type={showToken ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={token}
                  placeholder={
                    tokenSource === 'instagram_login' ? 'IGAA…' : t.connects.tokenPlaceholder
                  }
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

            {tokenSource === 'business_system_user' ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="connects-ig-user-id" className="eyebrow">
                  {t.connects.userIdLabel}
                </label>
                <div className="relative flex items-center">
                  <Input
                    id="connects-ig-user-id"
                    type={showUserId ? 'text' : 'password'}
                    inputMode="numeric"
                    autoComplete="off"
                    value={userId}
                    placeholder={t.connects.userIdPlaceholder}
                    onChange={(event) => setUserId(event.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserId((value) => !value)}
                    className="absolute right-3 text-muted-foreground hover:text-foreground"
                    title={showUserId ? t.connects.hideSecret : t.connects.showSecret}
                  >
                    {showUserId ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <p className="rounded-[6px] border border-hairline bg-muted/40 px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
                {t.connects.userIdDerived}
              </p>
            )}

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

function FacebookPageCard({ initialStatus }: { initialStatus: FacebookStatus | null }) {
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

function ThreadsCard({ initialStatus }: { initialStatus: ThreadsStatus | null }) {
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

function ImgbbCard({ initialStatus }: { initialStatus: ImgbbStatus | null }) {
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

function ConnectionDetail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-semibold text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function SecretValue({
  visible,
  value,
  onToggle,
  showLabel,
  hideLabel,
}: {
  visible: boolean;
  value: string;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <span className="flex items-center gap-1.5 font-mono font-medium">
      {visible ? value : '••••••••••••'}
      <button
        type="button"
        onClick={onToggle}
        className="text-muted-foreground hover:text-foreground"
        title={visible ? hideLabel : showLabel}
      >
        {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </span>
  );
}
