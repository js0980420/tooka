import {
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  LogIn,
  RefreshCw,
  Sparkles,
  Unplug,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  type AgentModelOption,
  type AgentProviderId,
  getAgentProviderMeta,
} from '../../../shared/agent-providers';
import { agentApi } from '../../lib/companion';
import { ConnectionDetail, SecretValue } from './shared';

export type { AgentProviderId };

export type AgentProviderStatus = {
  runtime: 'builtin' | 'global' | null;
  version: string | null;
  tokenMasked: string | null;
  authMethod: 'chatgpt' | 'api_key' | null;
  models: AgentModelOption[];
};

export type AgentStatusResponse = {
  providers: Record<AgentProviderId, AgentProviderStatus>;
  busy: boolean;
};

export async function fetchAgentStatus(): Promise<AgentStatusResponse | null> {
  try {
    const res = await fetch(agentApi('/status'));
    if (!res.ok) return null;
    return (await res.json()) as AgentStatusResponse;
  } catch {
    return null;
  }
}

// Saving a token rewrites .env, which makes Vite restart the dev server and
// usually severs the HTTP response mid-flight — so both mutations ignore
// their own response and poll /status to learn the real outcome.
async function pollProviderStatus(
  provider: AgentProviderId,
  until: (status: AgentProviderStatus) => boolean,
): Promise<AgentProviderStatus | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const status = (await fetchAgentStatus())?.providers[provider];
    if (status && until(status)) return status;
  }
  return null;
}

type AgentCardConfig = {
  provider: AgentProviderId;
  title: string;
  quotaBadge: string;
  description: string;
  runtimeLabels: Partial<Record<'builtin' | 'global', string>>;
  tokenLabel: string;
  tokenPlaceholder: string;
  tokenHint: React.ReactNode;
  notReadyHint: React.ReactNode;
  requiresToken?: boolean;
};

function AgentProviderCard({ config }: { config: AgentCardConfig }) {
  const [status, setStatus] = useState<AgentProviderStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const refresh = useCallback(async () => {
    setChecking(true);
    const next = (await fetchAgentStatus())?.providers[config.provider];
    if (next) setStatus(next);
    setChecking(false);
  }, [config.provider]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ready = Boolean(status?.runtime && (!config.requiresToken || status.tokenMasked));

  const saveToken = async () => {
    const value = token.trim();
    if (!value) return;
    setSaving(true);
    try {
      await fetch(agentApi('/token'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: config.provider, token: value }),
      }).catch(() => null);
      const confirmed = await pollProviderStatus(config.provider, (s) => Boolean(s.tokenMasked));
      if (!confirmed) {
        toast.error('儲存失敗，請確認格式');
        return;
      }
      setStatus(confirmed);
      setToken('');
      setShowToken(false);
      toast.success('已儲存');
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('確定要移除已儲存的金鑰？')) return;
    setDisconnecting(true);
    try {
      await fetch(agentApi('/token/disconnect'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: config.provider }),
      }).catch(() => null);
      const confirmed = await pollProviderStatus(config.provider, (s) => !s.tokenMasked);
      if (!confirmed) {
        toast.error('移除失敗');
        return;
      }
      setStatus(confirmed);
      toast.success('已移除');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <section className="rounded-[10px] border border-hairline bg-card p-5 shadow-edge">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-[8px] bg-muted/60">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-[15px] font-semibold tracking-tight">{config.title}</h2>
          <p className="text-[11.5px] text-muted-foreground">{config.quotaBadge}</p>
        </div>
        <Badge variant={ready ? 'default' : 'secondary'}>
          {status === null ? '檢查中…' : ready ? '已就緒' : '未就緒'}
        </Badge>
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
        {config.description}
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-lg border border-hairline bg-muted/30 p-4 text-[13px]">
          <ConnectionDetail label="執行環境">
            <span className="font-medium">
              {status?.runtime
                ? (config.runtimeLabels[status.runtime] ?? status.runtime)
                : '未偵測到'}
            </span>
          </ConnectionDetail>
          {status?.version ? (
            <ConnectionDetail label="版本">
              <span className="font-mono font-medium">{status.version}</span>
            </ConnectionDetail>
          ) : null}
          <ConnectionDetail label={config.tokenLabel}>
            {status?.tokenMasked ? (
              <SecretValue
                visible={showToken}
                value={status.tokenMasked}
                onToggle={() => setShowToken((value) => !value)}
                showLabel="顯示"
                hideLabel="隱藏"
              />
            ) : (
              <span className="font-medium text-muted-foreground">未設定</span>
            )}
          </ConnectionDetail>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`connects-agent-token-${config.provider}`} className="eyebrow">
            {config.tokenLabel}（{config.requiresToken ? '必填' : '選填'}）
          </label>
          <Input
            id={`connects-agent-token-${config.provider}`}
            type="password"
            autoComplete="new-password"
            value={token}
            placeholder={config.tokenPlaceholder}
            onChange={(event) => setToken(event.target.value)}
          />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{config.tokenHint}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <Button variant="brand" size="sm" disabled={saving || !token.trim()} onClick={saveToken}>
            <KeyRound data-icon="inline-start" />
            {saving ? '儲存中…' : '儲存'}
          </Button>
          <Button variant="outline" size="sm" disabled={checking} onClick={refresh}>
            <RefreshCw data-icon="inline-start" className={cn(checking && 'animate-spin')} />
            重新檢查
          </Button>
          {status?.tokenMasked ? (
            <Button variant="ghost" size="sm" disabled={disconnecting} onClick={disconnect}>
              <Unplug data-icon="inline-start" />
              移除
            </Button>
          ) : null}
        </div>

        {!ready && status !== null ? (
          <p className="rounded-[6px] bg-muted/60 px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
            {config.notReadyHint}
          </p>
        ) : null}
      </div>
    </section>
  );
}

const CODEX_DEVICE_URL = 'https://auth.openai.com/codex/device';
const ANSI_SEQUENCE = /^\[[0-?]*[ -/]*[@-~]/;
// Codex prints the device code on its own line as XXXX-XXXXX; the earlier
// label-anchored pattern missed it because "(expires in 15 minutes)" sits
// between the "one-time code" label and the code itself.
const DEVICE_CODE = /\b([0-9A-Z]{4,6}-[0-9A-Z]{4,6})\b/;

type LoginPhase = 'idle' | 'waiting' | 'success' | 'error';
type AuthStreamEvent = {
  type: 'output' | 'exit';
  text?: string;
  code?: number | null;
  authMethod?: AgentProviderStatus['authMethod'];
  error?: string;
};

function stripAnsi(value: string): string {
  return value
    .split(String.fromCharCode(27))
    .map((part, index) => (index === 0 ? part : part.replace(ANSI_SEQUENCE, '')))
    .join('');
}

function CodexLoginDialog({
  onConnected,
  runtimeAvailable,
}: {
  onConnected: () => Promise<void>;
  runtimeAvailable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<LoginPhase>('idle');
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [details, setDetails] = useState('');

  useEffect(() => () => controllerRef.current?.abort(), []);

  const close = (nextOpen: boolean) => {
    if (!nextOpen) {
      controllerRef.current?.abort();
      setPhase('idle');
    }
    setOpen(nextOpen);
  };

  const startLogin = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setPhase('waiting');
    setDeviceCode(null);
    setDetails('');

    let transcript = '';
    try {
      const response = await fetch(agentApi('/auth/login'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: 'codex' }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        const message =
          response.status === 404
            ? 'OpenAI 登入服務尚未載入。請重新啟動 tooka 開發伺服器後再試。'
            : body.error === 'runtime_not_found'
              ? '尚未偵測到 Codex CLI。請先執行 npm install -g @openai/codex，安裝完成後按「再試一次」。'
              : body.error === 'auth_busy'
                ? '另一個登入流程仍在進行，請稍候再試。'
                : `無法啟動 OpenAI 登入流程（HTTP ${response.status}）。`;
        throw new Error(message);
      }
      if (!response.body) throw new Error('登入服務沒有回傳資料，請重新嘗試。');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';
      while (true) {
        const { done, value } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        const lines = pending.split('\n');
        pending = done ? '' : (lines.pop() ?? '');
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as AuthStreamEvent;
          if (event.type === 'output' && event.text) {
            transcript += stripAnsi(event.text);
            const code = transcript.match(DEVICE_CODE)?.[1];
            if (code) setDeviceCode(code);
            setDetails(transcript.trim().slice(-1200));
          }
          if (event.type === 'exit') {
            if (event.authMethod === 'chatgpt') {
              setPhase('success');
              await onConnected();
              toast.success('OpenAI 帳號已連線');
            } else {
              setPhase('error');
              if (event.error === 'auth_timeout') {
                setDetails('登入逾時，請重新嘗試。');
              } else if (/429|too many requests/i.test(transcript)) {
                setDetails(
                  'OpenAI 暫時限流了（短時間內索取太多次驗證碼）。請等約 15–30 分鐘後再按「再試一次」，期間不要連續重試。',
                );
              }
            }
          }
        }
        if (done) break;
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setPhase('error');
        setDetails((error as Error).message);
      }
    }
  }, [onConnected]);

  // Fetch and show the code first; opening the verify page is a deliberate
  // second step (below) so the user never lands on OpenAI before the code
  // exists.
  const beginLogin = () => {
    setOpen(true);
    void startLogin();
  };

  const copyAndOpen = () => {
    if (deviceCode) {
      void navigator.clipboard.writeText(deviceCode).catch(() => {});
      toast.success('驗證碼已複製，貼到 OpenAI 頁面即可');
    }
    window.open(CODEX_DEVICE_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <Button variant="brand" size="sm" onClick={beginLogin} disabled={!runtimeAvailable}>
        <LogIn data-icon="inline-start" /> 使用 ChatGPT 登入
      </Button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>使用 ChatGPT 帳號登入</DialogTitle>
            <DialogDescription>
              不需要終端機。① 複製下方驗證碼 → ② 開啟 OpenAI 驗證頁貼上 → ③ 用 ChatGPT
              帳號授權，這裡會自動完成。
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-32 flex-col items-center justify-center gap-4 rounded-lg border border-hairline bg-muted/30 px-5 py-6">
            {phase === 'success' ? (
              <>
                <span className="flex size-10 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600">
                  <Check className="size-5" />
                </span>
                <p className="text-sm font-medium">授權完成，已使用 ChatGPT 帳號連線</p>
              </>
            ) : deviceCode ? (
              <>
                <button
                  type="button"
                  className="rounded-md border border-border bg-background px-5 py-3 font-mono text-2xl font-semibold tracking-[0.28em] shadow-edge transition-colors hover:bg-muted"
                  onClick={() => {
                    void navigator.clipboard.writeText(deviceCode);
                    toast.success('驗證碼已複製');
                  }}
                >
                  {deviceCode}
                </button>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Copy className="size-3.5" /> 點代碼可單獨複製；或用下方按鈕一鍵複製並開頁
                </p>
              </>
            ) : phase === 'error' ? (
              <p className="text-center text-sm text-destructive">無法完成登入</p>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" /> 正在取得驗證碼…
              </div>
            )}
          </div>

          {phase === 'error' && details ? (
            <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-md bg-muted px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {details}
            </pre>
          ) : null}

          <DialogFooter className="sm:justify-between">
            {phase === 'error' ? (
              <>
                <Button variant="ghost" onClick={() => close(false)}>
                  關閉
                </Button>
                <Button variant="brand" onClick={startLogin}>
                  <RefreshCw data-icon="inline-start" /> 再試一次
                </Button>
              </>
            ) : deviceCode && phase !== 'success' ? (
              <>
                <Button variant="ghost" onClick={() => close(false)}>
                  取消
                </Button>
                <Button variant="brand" onClick={copyAndOpen}>
                  <ExternalLink data-icon="inline-start" /> 複製代碼並開啟驗證頁
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => close(false)}>
                {phase === 'success' ? '完成' : '取消'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CodexAgentCard() {
  const [status, setStatus] = useState<AgentProviderStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const refresh = useCallback(async () => {
    setChecking(true);
    const next = (await fetchAgentStatus())?.providers.codex;
    if (next) setStatus(next);
    setChecking(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connected = status?.authMethod === 'chatgpt';
  const ready = Boolean(status?.runtime && connected);

  const disconnect = async () => {
    if (!confirm('確定要登出目前的 OpenAI 帳號？')) return;
    setDisconnecting(true);
    try {
      const response = await fetch(agentApi('/auth/logout'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: 'codex' }),
      });
      if (!response.ok) throw new Error();
      await refresh();
      toast.success('OpenAI 帳號已登出');
    } catch {
      toast.error('登出失敗');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <section className="rounded-[10px] border border-hairline bg-card p-5 shadow-edge">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-[8px] bg-muted/60">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-[15px] font-semibold tracking-tight">Codex Agent</h2>
          <p className="text-[11.5px] text-muted-foreground">ChatGPT Plus / Pro 訂閱額度</p>
        </div>
        <Badge variant={ready ? 'default' : 'secondary'}>
          {status === null ? '檢查中…' : ready ? '已連線' : '未連線'}
        </Badge>
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
        使用 OpenAI 帳號授權 Codex，以 ChatGPT 訂閱額度生成卡片。無需建立或保存 API key。
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-lg border border-hairline bg-muted/30 p-4 text-[13px]">
          <ConnectionDetail label="執行環境">
            <span className="font-medium">
              {status?.runtime
                ? status.runtime === 'global'
                  ? '系統已安裝的 Codex CLI'
                  : '自訂路徑'
                : '未偵測到'}
            </span>
          </ConnectionDetail>
          {status?.version ? (
            <ConnectionDetail label="版本">
              <span className="font-mono font-medium">{status.version}</span>
            </ConnectionDetail>
          ) : null}
          <ConnectionDetail label="登入方式">
            <span className={cn('font-medium', !connected && 'text-muted-foreground')}>
              {connected
                ? 'ChatGPT 帳號'
                : status?.authMethod === 'api_key'
                  ? 'API key（請改用帳號登入）'
                  : '未登入'}
            </span>
          </ConnectionDetail>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {!connected ? (
            <CodexLoginDialog runtimeAvailable={Boolean(status?.runtime)} onConnected={refresh} />
          ) : null}
          <Button variant="outline" size="sm" disabled={checking} onClick={refresh}>
            <RefreshCw data-icon="inline-start" className={cn(checking && 'animate-spin')} />
            重新檢查
          </Button>
          {connected ? (
            <Button variant="ghost" size="sm" disabled={disconnecting} onClick={disconnect}>
              <Unplug data-icon="inline-start" /> {disconnecting ? '登出中…' : '登出'}
            </Button>
          ) : null}
        </div>

        {!status?.runtime && status !== null ? (
          <p className="rounded-[6px] bg-muted/60 px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
            未偵測到 Codex CLI。執行 <code className="font-mono">npm install -g @openai/codex</code>{' '}
            安裝後再試。
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function GemmaAgentCard() {
  return (
    <AgentProviderCard
      config={{
        provider: 'gemma4',
        title: 'Gemma 4 Agent',
        quotaBadge: getAgentProviderMeta('gemma4')?.quota ?? '',
        description:
          '透過 Gemini CLI 指定 Gemma 4 26B A4B 模型生成卡片，使用 Google AI Studio 的免費 API 額度。',
        runtimeLabels: { builtin: '自訂路徑', global: '系統已安裝的 Gemini CLI' },
        tokenLabel: 'Google AI Studio API key',
        tokenPlaceholder: 'AIza…',
        tokenHint: (
          <>
            到{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-brand hover:underline"
            >
              Google AI Studio
            </a>{' '}
            建立 API key。金鑰只會儲存在此專案的本機環境檔。
          </>
        ),
        notReadyHint: (
          <>
            Gemma 4 需要 Google AI Studio API key 與 Gemini CLI。尚未安裝時請執行{' '}
            <code className="font-mono">npm install -g @google/gemini-cli</code>。
          </>
        ),
        requiresToken: getAgentProviderMeta('gemma4')?.auth === 'api-key',
      }}
    />
  );
}
