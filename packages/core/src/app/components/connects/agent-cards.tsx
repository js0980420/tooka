import { KeyRound, RefreshCw, Sparkles, Unplug } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { API } from '../../../shared/api-routes';
import { ConnectionDetail, SecretValue } from './shared';

export type AgentProviderId = 'claude' | 'codex' | 'gemini';

export type AgentProviderStatus = {
  runtime: 'builtin' | 'global' | null;
  version: string | null;
  tokenMasked: string | null;
};

export type AgentStatusResponse = {
  providers: Record<AgentProviderId, AgentProviderStatus>;
  busy: boolean;
};

export async function fetchAgentStatus(): Promise<AgentStatusResponse | null> {
  try {
    const res = await fetch(`${API.agent}/status`);
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

  const ready = Boolean(status?.runtime);

  const saveToken = async () => {
    const value = token.trim();
    if (!value) return;
    setSaving(true);
    try {
      await fetch(`${API.agent}/token`, {
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
      await fetch(`${API.agent}/token/disconnect`, {
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
            {config.tokenLabel}（選填）
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

export function ClaudeAgentCard() {
  return (
    <AgentProviderCard
      config={{
        provider: 'claude',
        title: 'Claude Agent',
        quotaBadge: 'Claude Pro / Max 訂閱額度',
        description:
          '用你的 Claude 訂閱額度，直接在網頁上輸入提示詞生成卡片——不用 clone 或 fork 專案，也不需要 API key。Agent 只會在此專案資料夾內建立與修改卡片。',
        runtimeLabels: {
          builtin: '內建（隨 @tooka/core 安裝，免另外裝 CLI）',
          global: '系統已安裝的 Claude Code CLI',
        },
        tokenLabel: '訂閱登入 token',
        tokenPlaceholder: 'sk-ant-oat01-…',
        tokenHint: (
          <>
            本機登入過 Claude Code 可留空。沒登入過？在專案資料夾執行{' '}
            <code className="font-mono">npx claude setup-token</code>
            ，完成瀏覽器授權後把產出的 token 貼到這裡。
          </>
        ),
        notReadyHint: (
          <>
            未偵測到可用的 Claude 執行環境。重新執行一次{' '}
            <code className="font-mono">npm install</code>（會自動帶入內建 runtime），或安裝{' '}
            <code className="font-mono">npm install -g @anthropic-ai/claude-code</code> 後再試。
          </>
        ),
      }}
    />
  );
}

export function CodexAgentCard() {
  return (
    <AgentProviderCard
      config={{
        provider: 'codex',
        title: 'Codex Agent',
        quotaBadge: 'ChatGPT Plus / Pro 訂閱額度',
        description:
          '用 OpenAI Codex CLI 生成卡片，吃 ChatGPT 訂閱額度。安裝後執行 codex login 以 ChatGPT 帳號登入即可，不需要 API key。',
        runtimeLabels: { builtin: '自訂路徑', global: '系統已安裝的 Codex CLI' },
        tokenLabel: 'OpenAI API key',
        tokenPlaceholder: 'sk-…',
        tokenHint: (
          <>
            用訂閱登入（<code className="font-mono">codex login</code>
            ）可留空；只有想改用 API 計費時才需要貼 key。
          </>
        ),
        notReadyHint: (
          <>
            未偵測到 Codex CLI。執行 <code className="font-mono">npm install -g @openai/codex</code>{' '}
            安裝，再執行 <code className="font-mono">codex login</code> 以 ChatGPT 帳號登入。
          </>
        ),
      }}
    />
  );
}

export function GeminiAgentCard() {
  return (
    <AgentProviderCard
      config={{
        provider: 'gemini',
        title: 'Gemini Agent',
        quotaBadge: '免費額度（個人 Google 帳號）',
        description:
          '用 Google Gemini CLI 生成卡片，個人 Google 帳號即有免費額度，適合還沒有任何訂閱的使用者。',
        runtimeLabels: { builtin: '自訂路徑', global: '系統已安裝的 Gemini CLI' },
        tokenLabel: 'Gemini API key',
        tokenPlaceholder: 'AIza…',
        tokenHint: (
          <>
            首次執行 <code className="font-mono">gemini</code> 會引導用 Google
            帳號登入（免費），可留空；也可以貼 API key 改走 API 額度。
          </>
        ),
        notReadyHint: (
          <>
            未偵測到 Gemini CLI。執行{' '}
            <code className="font-mono">npm install -g @google/gemini-cli</code> 安裝，首次執行{' '}
            <code className="font-mono">gemini</code> 完成 Google 帳號登入。
          </>
        ),
      }}
    />
  );
}
