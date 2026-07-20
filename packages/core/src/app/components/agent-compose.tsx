import { CircleAlert, CircleCheck, Loader2, Sparkles, Wrench } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { API } from '../../shared/api-routes';
import {
  type AgentProviderId,
  type AgentStatusResponse,
  fetchAgentStatus,
} from './connects/agent-cards';

const PROVIDER_OPTIONS: Array<{ id: AgentProviderId; label: string; quota: string }> = [
  { id: 'claude', label: 'Claude', quota: '訂閱' },
  { id: 'codex', label: 'Codex', quota: 'ChatGPT 訂閱' },
  { id: 'gemini', label: 'Gemini', quota: '免費' },
];

type LogEntry =
  | { kind: 'text'; text: string }
  | { kind: 'tool'; label: string }
  | { kind: 'done'; text: string }
  | { kind: 'error'; text: string };

type StreamEvent = {
  type?: string;
  subtype?: string;
  code?: number | null;
  stderr?: string;
  text?: string;
  error?: string;
  is_error?: boolean;
  result?: string;
  duration_ms?: number;
  message?: {
    content?: Array<{
      type?: string;
      text?: string;
      name?: string;
      input?: { file_path?: string; command?: string };
    }>;
  };
};

function entryFromEvent(event: StreamEvent): LogEntry[] {
  if (event.type === 'assistant') {
    const out: LogEntry[] = [];
    for (const block of event.message?.content ?? []) {
      if (block.type === 'text' && block.text?.trim()) {
        out.push({ kind: 'text', text: block.text.trim() });
      } else if (block.type === 'tool_use' && block.name) {
        const target = block.input?.file_path ?? block.input?.command ?? '';
        out.push({ kind: 'tool', label: target ? `${block.name} · ${target}` : block.name });
      }
    }
    return out;
  }
  if (event.type === 'result') {
    if (event.is_error) {
      return [{ kind: 'error', text: event.result || '執行失敗' }];
    }
    const seconds = event.duration_ms ? `（${Math.round(event.duration_ms / 1000)} 秒）` : '';
    return [{ kind: 'done', text: `完成${seconds}` }];
  }
  if (event.type === 'tooka') {
    if (event.subtype === 'output' && event.text) {
      return [{ kind: 'text', text: event.text }];
    }
    if (event.subtype === 'timeout') return [{ kind: 'error', text: '執行逾時，已中止' }];
    if (event.subtype === 'spawn-error') {
      return [{ kind: 'error', text: `無法啟動 Agent：${event.error ?? ''}` }];
    }
    if (event.subtype === 'exit' && event.code !== 0) {
      return [{ kind: 'error', text: event.stderr?.trim() || 'Agent 異常結束' }];
    }
  }
  return [];
}

export function AgentComposeLauncher() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState<AgentProviderId>('claude');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [runState, setRunState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [status, setStatus] = useState<AgentStatusResponse | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchAgentStatus().then((body) => {
      if (cancelled || !body) return;
      setStatus(body);
      setProvider((current) => {
        if (body.providers[current]?.runtime) return current;
        const firstReady = PROVIDER_OPTIONS.find((option) => body.providers[option.id]?.runtime);
        return firstReady?.id ?? current;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (log.length > 0) logEndRef.current?.scrollIntoView({ block: 'end' });
  }, [log]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const run = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || runState === 'running') return;
    const controller = new AbortController();
    abortRef.current = controller;
    setLog([]);
    setRunState('running');
    try {
      const res = await fetch(`${API.agent}/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider, prompt: trimmed }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        const message =
          body.error === 'agent_busy'
            ? 'Agent 正在執行其他任務，請稍候'
            : body.error === 'runtime_not_found'
              ? '未偵測到 Claude 執行環境，請到「連結」頁完成設定'
              : '啟動失敗';
        setLog([{ kind: 'error', text: message }]);
        setRunState('error');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let failed = false;
      let finished = false;
      const consume = (line: string) => {
        if (!line.trim()) return;
        let event: StreamEvent;
        try {
          event = JSON.parse(line) as StreamEvent;
        } catch {
          return;
        }
        if (event.type === 'tooka' && event.subtype === 'exit' && event.code === 0) {
          finished = true;
        }
        const entries = entryFromEvent(event);
        if (entries.length === 0) return;
        if (entries.some((entry) => entry.kind === 'error')) failed = true;
        if (entries.some((entry) => entry.kind === 'done')) finished = true;
        setLog((prev) => {
          // Plain-text providers stream raw chunks — merge them into the
          // previous text entry so the log reads as one flowing block.
          if (
            entries.length === 1 &&
            entries[0].kind === 'text' &&
            event.subtype === 'output' &&
            prev.length > 0 &&
            prev[prev.length - 1].kind === 'text'
          ) {
            const last = prev[prev.length - 1] as { kind: 'text'; text: string };
            return [...prev.slice(0, -1), { kind: 'text', text: last.text + entries[0].text }];
          }
          return [...prev, ...entries];
        });
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) consume(line);
      }
      consume(buffer);

      if (failed) {
        setRunState('error');
      } else if (finished) {
        setRunState('done');
        toast.success('卡片已生成，請到草稿區查看');
      } else {
        setLog((prev) => [...prev, { kind: 'error', text: '連線中斷' }]);
        setRunState('error');
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setLog((prev) => [...prev, { kind: 'error', text: '已取消' }]);
      } else {
        setLog((prev) => [...prev, { kind: 'error', text: '連線失敗' }]);
      }
      setRunState('error');
    } finally {
      abortRef.current = null;
    }
  };

  const close = (next: boolean) => {
    if (!next) abortRef.current?.abort();
    setOpen(next);
    if (!next && runState !== 'running') {
      setRunState('idle');
      setLog([]);
    }
  };

  const noneReady =
    status !== null && !PROVIDER_OPTIONS.some((option) => status.providers[option.id]?.runtime);
  const providerReady = Boolean(status?.providers[provider]?.runtime);

  return (
    <>
      <Button variant="brand" size="sm" onClick={() => setOpen(true)}>
        <Sparkles data-icon="inline-start" />
        AI 生成
      </Button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <span className="eyebrow">Claude Agent</span>
            <DialogTitle>AI 生成卡片</DialogTitle>
            <DialogDescription>
              描述想要的輪播主題，Agent 會用你的訂閱額度直接在草稿區生成卡片。
            </DialogDescription>
          </DialogHeader>

          {noneReady ? (
            <p className="rounded-[6px] bg-muted/60 px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
              未偵測到任何 AI 執行環境，請先到{' '}
              <Link
                to="/connects"
                className="text-brand hover:underline"
                onClick={() => close(false)}
              >
                串接頁
              </Link>{' '}
              完成 AI 模型串接。
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5">
            {PROVIDER_OPTIONS.map((option) => {
              const optionReady = Boolean(status?.providers[option.id]?.runtime);
              const selected = provider === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={!optionReady || runState === 'running'}
                  onClick={() => setProvider(option.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-colors',
                    selected
                      ? 'border-foreground/40 bg-muted text-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground',
                    !optionReady && 'cursor-not-allowed opacity-40',
                  )}
                >
                  <span className="font-medium">{option.label}</span>
                  <span className="opacity-70">{option.quota}</span>
                </button>
              );
            })}
          </div>

          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            disabled={runState === 'running'}
            rows={4}
            placeholder="例：做一組 5 張的 IG 輪播，主題是「新手學會用 AI 寫程式的 3 個步驟」，語氣輕鬆、繁體中文。"
          />

          {log.length > 0 ? (
            <div className="max-h-56 overflow-y-auto rounded-[6px] border border-hairline bg-muted/30 p-3 text-[12px] leading-relaxed">
              {log.map((entry, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: append-only log
                  key={i}
                  className="flex items-start gap-2 py-0.5"
                >
                  {entry.kind === 'tool' ? (
                    <>
                      <Wrench className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-mono text-muted-foreground">{entry.label}</span>
                    </>
                  ) : entry.kind === 'done' ? (
                    <>
                      <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-brand" />
                      <span className="font-medium">{entry.text}</span>
                    </>
                  ) : entry.kind === 'error' ? (
                    <>
                      <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                      <span className="whitespace-pre-wrap text-destructive">{entry.text}</span>
                    </>
                  ) : (
                    <span className="whitespace-pre-wrap">{entry.text}</span>
                  )}
                </div>
              ))}
              {runState === 'running' ? (
                <div className="flex items-center gap-2 py-0.5 text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  執行中…
                </div>
              ) : null}
              <div ref={logEndRef} />
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => close(false)}>
              {runState === 'running' ? '取消並關閉' : '關閉'}
            </Button>
            <Button
              size="sm"
              disabled={runState === 'running' || !prompt.trim() || !providerReady}
              onClick={run}
            >
              {runState === 'running' ? (
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                  生成中…
                </>
              ) : (
                <>
                  <Sparkles data-icon="inline-start" />
                  開始生成
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
