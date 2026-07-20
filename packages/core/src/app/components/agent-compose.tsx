import { Bot, CheckCircle2, CircleAlert, RotateCcw, Send, Sparkles, Square, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Button } from '@/components/ui/button';
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker';
import { Message, MessageAvatar, MessageContent, MessageHeader } from '@/components/ui/message';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AGENT_PROVIDERS, type AgentProviderId } from '../../shared/agent-providers';
import { API } from '../../shared/api-routes';
import { type AgentStatusResponse, fetchAgentStatus } from './connects/agent-cards';

const PROVIDER_OPTIONS = AGENT_PROVIDERS.map(({ id, label }) => ({ id, label }));
const CHAT_REQUEST_MAX_LENGTH = 3000;

const STARTERS = [
  '幫我做一組 5 張 IG 輪播，先規劃內容再直接建立',
  '把目前卡片改得更精簡、更有視覺層次',
  '檢查所有卡片的排版問題並直接修正',
];

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  state?: 'streaming' | 'error' | 'done';
};

type StreamEvent = {
  type?: string;
  subtype?: string;
  code?: number | null;
  stderr?: string;
  text?: string;
  error?: string;
  is_error?: boolean;
  result?: string;
  message?: { content?: Array<{ type?: string; text?: string }> };
};

let nextMessageId = 0;

function messageId(): string {
  nextMessageId += 1;
  return `agent-message-${nextMessageId}`;
}

function providerIsReady(status: AgentStatusResponse, provider: AgentProviderId): boolean {
  const providerStatus = status.providers[provider];
  if (!providerStatus?.runtime) return false;
  const meta = AGENT_PROVIDERS.find(({ id }) => id === provider);
  // Subscription providers need a completed login; api-key providers need a
  // stored key.
  if (meta?.auth === 'subscription') return providerStatus.authMethod === 'chatgpt';
  if (meta?.auth === 'api-key') return Boolean(providerStatus.tokenMasked);
  return true;
}

function firstReadyProvider(status: AgentStatusResponse): AgentProviderId | null {
  return PROVIDER_OPTIONS.find(({ id }) => providerIsReady(status, id))?.id ?? null;
}

function outputFromEvent(event: StreamEvent): string {
  if (event.type === 'tooka' && event.subtype === 'output') return event.text ?? '';
  if (event.type === 'assistant') {
    return (event.message?.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('\n');
  }
  if (event.type === 'result' && event.result && !event.is_error) return event.result;
  return '';
}

function errorFromResponse(error?: string): string {
  if (error === 'agent_busy') return 'AI 助手正在處理另一個工作，請稍候再試。';
  if (error === 'runtime_not_found') return '尚未偵測到可用的 AI 執行環境。';
  if (error === 'auth_required') return 'Codex 尚未使用 ChatGPT 帳號登入。';
  return '無法啟動 AI 助手，請稍後再試。';
}

function buildAgentPrompt(messages: ChatMessage[], request: string, pathname: string): string {
  const history = messages
    .filter((message) => message.text && message.state !== 'error')
    .slice(-6)
    .map((message) => `${message.role === 'user' ? '使用者' : '助手'}：${message.text}`)
    .join('\n')
    .slice(-3000);

  return [
    '你是 tooka 網頁版內的操作助手。請直接在目前專案中完成使用者要求，不只提供教學。',
    '卡片內容位於目前工作目錄的 slides/；遵守專案內 AGENTS.md 與相關 card-authoring skills。',
    `使用者目前所在頁面：${pathname}`,
    history ? `近期對話：\n${history}` : '',
    `這次要求：${request}`,
    '先自行檢查需要的檔案並執行工作。完成後用繁體中文簡短說明做了什麼；只有真正缺少關鍵資訊時才向使用者提問。',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function AssistantAvatar() {
  return (
    <MessageAvatar className="size-7 border border-hairline bg-card text-brand shadow-edge">
      <Sparkles className="size-3.5" />
    </MessageAvatar>
  );
}

export function AgentChatbot() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: messageId(),
      role: 'assistant',
      text: '嗨，我可以直接幫你建立、修改和檢查卡片。告訴我想完成什麼就好。',
    },
  ]);
  const [status, setStatus] = useState<AgentStatusResponse | null>(null);
  const [statusChecked, setStatusChecked] = useState(false);
  const [provider, setProvider] = useState<AgentProviderId | null>(null);
  const [runState, setRunState] = useState<'idle' | 'running'>('idle');
  const abortRef = useRef<AbortController | null>(null);

  const refreshStatus = useCallback(async () => {
    const next = await fetchAgentStatus();
    if (next) {
      setStatus(next);
      setProvider((current) =>
        current && providerIsReady(next, current) ? current : firstReadyProvider(next),
      );
    }
    setStatusChecked(true);
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const updateMessage = (id: string, update: (message: ChatMessage) => ChatMessage) => {
    setMessages((current) =>
      current.map((message) => (message.id === id ? update(message) : message)),
    );
  };

  const send = async (request = prompt) => {
    const trimmed = request.trim().slice(0, CHAT_REQUEST_MAX_LENGTH);
    if (!trimmed || runState === 'running' || !provider) return;

    const userMessage: ChatMessage = { id: messageId(), role: 'user', text: trimmed };
    const assistantId = messageId();
    const controller = new AbortController();
    abortRef.current = controller;
    setPrompt('');
    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: 'assistant', text: '', state: 'streaming' },
    ]);
    setRunState('running');

    try {
      const response = await fetch(`${API.agent}/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider,
          prompt: buildAgentPrompt(messages, trimmed, location.pathname),
        }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorFromResponse(body.error));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let output = '';
      let failure = '';
      const consume = (line: string) => {
        if (!line.trim()) return;
        let event: StreamEvent;
        try {
          event = JSON.parse(line) as StreamEvent;
        } catch {
          return;
        }
        const text = outputFromEvent(event);
        if (text) {
          output += text;
          updateMessage(assistantId, (message) => ({ ...message, text: output }));
        }
        if (event.type === 'result' && event.is_error) failure = event.result ?? '執行失敗';
        if (event.type === 'tooka' && event.subtype === 'timeout') failure = '工作逾時，已中止。';
        if (event.type === 'tooka' && event.subtype === 'spawn-error') {
          failure = `無法啟動 AI 助手：${event.error ?? ''}`;
        }
        if (event.type === 'tooka' && event.subtype === 'exit' && event.code !== 0) {
          failure = event.stderr?.trim() || 'AI 助手異常結束。';
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split('\n');
        buffer = done ? '' : (lines.pop() ?? '');
        for (const line of lines) consume(line);
        if (done) break;
      }

      if (failure) throw new Error(failure);
      updateMessage(assistantId, (message) => ({
        ...message,
        text: message.text || '完成了。你可以繼續告訴我下一步要調整什麼。',
        state: 'done',
      }));
      toast.success('AI 助手已完成工作');
    } catch (error) {
      const cancelled = (error as Error).name === 'AbortError';
      updateMessage(assistantId, (message) => ({
        ...message,
        text: cancelled ? '已取消這次工作。' : (error as Error).message,
        state: 'error',
      }));
    } finally {
      abortRef.current = null;
      setRunState('idle');
      void refreshStatus();
    }
  };

  const clearConversation = () => {
    if (runState === 'running') return;
    setMessages([
      {
        id: messageId(),
        role: 'assistant',
        text: '新的對話開始了。告訴我這次想建立或修改什麼。',
      },
    ]);
  };

  if (location.pathname.endsWith('/presenter')) return null;

  const providerLabel = PROVIDER_OPTIONS.find(({ id }) => id === provider)?.label;
  const ready = Boolean(status && provider);

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 sm:right-5 sm:bottom-5">
      {open ? (
        <section
          role="dialog"
          aria-labelledby="agent-chat-title"
          className="flex h-[min(650px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[14px] border border-hairline bg-card shadow-overlay sm:w-[410px]"
        >
          <header className="flex items-center gap-3 border-b border-hairline bg-card px-4 py-3.5">
            <span className="relative flex size-9 items-center justify-center rounded-[9px] bg-foreground text-background shadow-edge">
              <Bot className="size-[18px]" />
              {ready ? (
                <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-card bg-brand" />
              ) : null}
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="agent-chat-title" className="font-heading text-sm font-semibold">
                tooka 助手
              </h2>
              <p className="truncate text-[11px] text-muted-foreground">
                {!statusChecked
                  ? '正在檢查可用模型…'
                  : providerLabel
                    ? `使用 ${providerLabel} · 可直接操作專案`
                    : '尚未完成 AI 串接'}
              </p>
            </div>
            {providerLabel ? <Badge variant="secondary">{providerLabel}</Badge> : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="清除對話"
              disabled={runState === 'running'}
              onClick={clearConversation}
            >
              <RotateCcw />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="關閉 AI 助手"
              onClick={() => setOpen(false)}
            >
              <X />
            </Button>
          </header>

          <div className="min-h-0 flex-1 bg-canvas/70">
            <MessageScrollerProvider autoScroll>
              <MessageScroller>
                <MessageScrollerViewport>
                  <MessageScrollerContent className="px-4 py-5">
                    {messages.map((message) => (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                        scrollAnchor={message.role === 'user'}
                      >
                        <Message align={message.role === 'user' ? 'end' : 'start'}>
                          {message.role === 'assistant' ? <AssistantAvatar /> : null}
                          <MessageContent>
                            {message.role === 'assistant' ? (
                              <MessageHeader>tooka 助手</MessageHeader>
                            ) : null}
                            <Bubble
                              align={message.role === 'user' ? 'end' : 'start'}
                              variant={
                                message.role === 'user'
                                  ? 'default'
                                  : message.state === 'error'
                                    ? 'destructive'
                                    : 'muted'
                              }
                              className={cn(message.role === 'assistant' && 'max-w-[92%]')}
                            >
                              <BubbleContent className="whitespace-pre-wrap">
                                {message.state === 'streaming' && !message.text ? (
                                  <span className="shimmer text-muted-foreground">
                                    正在理解並操作專案…
                                  </span>
                                ) : (
                                  message.text
                                )}
                              </BubbleContent>
                            </Bubble>
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    ))}

                    {messages.length === 1 && ready ? (
                      <MessageScrollerItem messageId="starter-actions">
                        <div className="ml-9 flex flex-col items-start gap-2">
                          {STARTERS.map((starter) => (
                            <Button
                              key={starter}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-auto max-w-full justify-start whitespace-normal py-2 text-left"
                              onClick={() => void send(starter)}
                            >
                              {starter}
                            </Button>
                          ))}
                        </div>
                      </MessageScrollerItem>
                    ) : null}

                    {!ready && statusChecked ? (
                      <MessageScrollerItem messageId="setup-required">
                        <Marker className="rounded-md border border-hairline bg-card px-3 py-2.5">
                          <MarkerIcon>
                            <CircleAlert />
                          </MarkerIcon>
                          <MarkerContent className="flex-1">
                            先完成一次 AI 串接，之後就能直接在這裡操作。
                          </MarkerContent>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              navigate('/connects');
                              setOpen(false);
                            }}
                          >
                            前往串接
                          </Button>
                        </Marker>
                      </MessageScrollerItem>
                    ) : null}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            </MessageScrollerProvider>
          </div>

          <form
            className="border-t border-hairline bg-card p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <div className="rounded-[10px] border border-input bg-background p-1.5 shadow-edge focus-within:border-foreground/25 focus-within:ring-2 focus-within:ring-ring/20">
              <label htmlFor="agent-chat-prompt" className="sr-only">
                告訴 AI 助手要完成什麼
              </label>
              <Textarea
                id="agent-chat-prompt"
                value={prompt}
                rows={2}
                maxLength={CHAT_REQUEST_MAX_LENGTH}
                disabled={!ready || runState === 'running'}
                placeholder={ready ? '告訴我想建立或修改什麼…' : '請先完成 AI 串接'}
                className="min-h-14 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0"
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <div className="flex items-center justify-between gap-2 px-1 pb-0.5">
                <span className="text-[10.5px] text-muted-foreground">
                  Enter 傳送 · Shift Enter 換行
                </span>
                {runState === 'running' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="停止目前工作"
                    onClick={() => abortRef.current?.abort()}
                  >
                    <Square />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="brand"
                    size="icon-sm"
                    aria-label="傳送訊息"
                    disabled={!ready || !prompt.trim()}
                  >
                    <Send />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </section>
      ) : (
        <Button
          type="button"
          variant="brand"
          size="lg"
          className="h-12 rounded-full px-4 shadow-overlay"
          aria-label="開啟 tooka AI 助手"
          onClick={() => setOpen(true)}
        >
          <Sparkles data-icon="inline-start" />
          <span>AI 助手</span>
          {ready ? <CheckCircle2 data-icon="inline-end" /> : null}
        </Button>
      )}
    </div>
  );
}
