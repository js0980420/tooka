import {
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  LayoutTemplate,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  AGENT_PROVIDERS,
  type AgentModelOption,
  type AgentProviderId,
} from '../../shared/agent-providers';
import { agentApi, companionCommand, companionEnabled, companionUrl } from '../lib/companion';
import { type AgentStatusResponse, fetchAgentStatus } from './connects/agent-cards';

const PROVIDER_OPTIONS = AGENT_PROVIDERS.map(({ id, label }) => ({ id, label }));
const CHAT_REQUEST_MAX_LENGTH = 3000;
const MODEL_STORAGE_KEY = 'tooka-agent-model';
const CHAT_STORAGE_KEY = 'tooka-agent-chat';
const CHAT_STORAGE_MAX_MESSAGES = 100;

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
  hint?: string;
};

type StreamEvent = {
  type?: string;
  subtype?: string;
  code?: number | null;
  stderr?: string;
  text?: string;
  error?: string | { message?: string };
  is_error?: boolean;
  result?: string;
  message?: { content?: Array<{ type?: string; text?: string }> };
  thread_id?: string;
  item?: { type?: string; text?: string; command?: string };
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

type ModelChoice = {
  provider: AgentProviderId;
  model: string;
};

function modelsFor(status: AgentStatusResponse, provider: AgentProviderId): AgentModelOption[] {
  const fromStatus = status.providers[provider]?.models;
  if (fromStatus?.length) return fromStatus;
  return [...(AGENT_PROVIDERS.find(({ id }) => id === provider)?.models ?? [])];
}

function normalizeChoice(
  status: AgentStatusResponse,
  candidate: ModelChoice | null,
): ModelChoice | null {
  if (candidate && providerIsReady(status, candidate.provider)) {
    const models = modelsFor(status, candidate.provider);
    if (models.some(({ id }) => id === candidate.model)) return candidate;
    if (models[0]) return { provider: candidate.provider, model: models[0].id };
  }
  const provider = PROVIDER_OPTIONS.find(({ id }) => providerIsReady(status, id))?.id;
  if (!provider) return null;
  const fallback = modelsFor(status, provider)[0];
  return fallback ? { provider, model: fallback.id } : null;
}

type AgentSession = { provider: AgentProviderId; id: string };

type StoredChat = {
  messages: ChatMessage[];
  session: AgentSession | null;
};

function loadStoredChat(): StoredChat | null {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredChat>;
    if (!Array.isArray(parsed.messages)) return null;
    const messages = parsed.messages
      .filter(
        (message): message is ChatMessage =>
          Boolean(message) &&
          typeof message.id === 'string' &&
          typeof message.text === 'string' &&
          (message.role === 'user' || message.role === 'assistant'),
      )
      .map((message) =>
        message.state === 'streaming'
          ? { ...message, state: 'error' as const, text: message.text || '上次工作在完成前中斷。' }
          : message,
      );
    if (messages.length === 0) return null;
    for (const message of messages) {
      const n = Number(message.id.replace('agent-message-', ''));
      if (Number.isFinite(n) && n > nextMessageId) nextMessageId = n;
    }
    const session =
      parsed.session &&
      typeof parsed.session.provider === 'string' &&
      typeof parsed.session.id === 'string'
        ? (parsed.session as AgentSession)
        : null;
    return { messages, session };
  } catch {
    return null;
  }
}

function storedChoice(): ModelChoice | null {
  try {
    const raw = localStorage.getItem(MODEL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ModelChoice>;
    if (typeof parsed.provider !== 'string' || typeof parsed.model !== 'string') return null;
    return parsed as ModelChoice;
  } catch {
    return null;
  }
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

function hintFromItem(item: StreamEvent['item']): string | null {
  if (item?.type === 'command_execution') {
    const command = (item.command ?? '').replace(/^\/bin\/(ba)?sh -lc /, '').slice(0, 80);
    return command ? `正在執行:${command}` : '正在執行指令…';
  }
  if (item?.type === 'reasoning') return '正在思考…';
  if (item?.type === 'file_change') return '正在修改檔案…';
  if (item?.type === 'web_search') return '正在搜尋網頁…';
  return null;
}

function errorText(error: StreamEvent['error']): string | null {
  if (typeof error === 'string') return error;
  if (error && typeof error.message === 'string') return error.message;
  return null;
}

// A resumed Codex session already holds the system preamble and the full
// conversation, so follow-up turns only carry the new request.
function buildResumePrompt(request: string, pathname: string): string {
  return [`使用者目前所在頁面：${pathname}`, `這次要求：${request}`].join('\n\n');
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
    '若這次工作建立或修改了卡片，結尾提醒使用者：到草稿區確認內容，滿意就按「新增到卡片」，再到發布頁準備發布。',
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
  const [storedChat] = useState(loadStoredChat);
  const [messages, setMessages] = useState<ChatMessage[]>(
    () =>
      storedChat?.messages ?? [
        {
          id: messageId(),
          role: 'assistant',
          text: '嗨，我可以直接幫你建立、修改和檢查卡片。還沒有靈感的話，先到模板頁挑一個喜歡的視覺風格「加入草稿」，再告訴我要放什麼內容。',
        },
      ],
  );
  const [status, setStatus] = useState<AgentStatusResponse | null>(null);
  const [statusChecked, setStatusChecked] = useState(false);
  const [choice, setChoice] = useState<ModelChoice | null>(null);
  const [runState, setRunState] = useState<'idle' | 'running'>('idle');
  const abortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<AgentSession | null>(storedChat?.session ?? null);

  // Hosted shell: studio pages live on the companion, so open them in a new
  // tab to keep this chat alive. Local dev keeps in-app routing.
  const goTo = useCallback(
    (path: string, { close = false }: { close?: boolean } = {}) => {
      if (companionEnabled) {
        window.open(companionUrl(path), '_blank', 'noopener');
        return;
      }
      navigate(path);
      if (close) setOpen(false);
    },
    [navigate],
  );

  const refreshStatus = useCallback(async () => {
    const next = await fetchAgentStatus();
    if (next) {
      setStatus(next);
      setChoice((current) => normalizeChoice(next, current ?? storedChoice()));
    }
    setStatusChecked(true);
  }, []);

  const pickModel = (provider: AgentProviderId, model: string) => {
    const next: ModelChoice = { provider, model };
    setChoice(next);
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    try {
      const snapshot: StoredChat = {
        messages: messages
          .slice(-CHAT_STORAGE_MAX_MESSAGES)
          .map(({ hint: _hint, ...rest }) => rest),
        session: sessionRef.current,
      };
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {}
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const updateMessage = (id: string, update: (message: ChatMessage) => ChatMessage) => {
    setMessages((current) =>
      current.map((message) => (message.id === id ? update(message) : message)),
    );
  };

  const send = async (request = prompt) => {
    const trimmed = request.trim().slice(0, CHAT_REQUEST_MAX_LENGTH);
    const active = choice;
    if (!trimmed || runState === 'running' || !active) return;

    const userMessage: ChatMessage = { id: messageId(), role: 'user', text: trimmed };
    const assistantId = messageId();
    const controller = new AbortController();
    const session =
      sessionRef.current && sessionRef.current.provider === active.provider
        ? sessionRef.current.id
        : null;
    abortRef.current = controller;
    setPrompt('');
    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: 'assistant', text: '', state: 'streaming' },
    ]);
    setRunState('running');

    try {
      const response = await fetch(agentApi('/run'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: active.provider,
          model: active.model,
          prompt: session
            ? buildResumePrompt(trimmed, location.pathname)
            : buildAgentPrompt(messages, trimmed, location.pathname),
          ...(session ? { resume: session } : {}),
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
        if (event.type === 'thread.started' && typeof event.thread_id === 'string') {
          sessionRef.current = { provider: active.provider, id: event.thread_id };
          return;
        }
        if (event.type === 'item.started') {
          const hint = hintFromItem(event.item);
          if (hint) updateMessage(assistantId, (message) => ({ ...message, hint }));
          return;
        }
        if (event.type === 'item.completed') {
          if (event.item?.type === 'agent_message' && event.item.text) {
            output = output ? `${output}\n\n${event.item.text}` : event.item.text;
            updateMessage(assistantId, (message) => ({
              ...message,
              text: output,
              hint: undefined,
            }));
          } else if (event.item?.type === 'command_execution') {
            // The command itself finishes fast; the wait after it is the model
            // reading the output, so stop implying the command is still running.
            updateMessage(assistantId, (message) => ({ ...message, hint: '正在思考…' }));
          }
          return;
        }
        if (event.type === 'turn.failed') {
          failure = errorText(event.error) ?? '執行失敗';
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
          failure = `無法啟動 AI 助手：${errorText(event.error) ?? ''}`;
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
        hint: undefined,
      }));
      toast.success('AI 助手已完成工作');
    } catch (error) {
      const cancelled = (error as Error).name === 'AbortError';
      // A failed resume may mean the session is gone — fall back to a fresh
      // session (with full context) on the next message.
      if (!cancelled && session) sessionRef.current = null;
      updateMessage(assistantId, (message) => ({
        ...message,
        text: cancelled ? '已取消這次工作。' : (error as Error).message,
        state: 'error',
        hint: undefined,
      }));
    } finally {
      abortRef.current = null;
      setRunState('idle');
      void refreshStatus();
    }
  };

  const clearConversation = () => {
    if (runState === 'running') return;
    sessionRef.current = null;
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {}
    setMessages([
      {
        id: messageId(),
        role: 'assistant',
        text: '新的對話開始了。告訴我這次想建立或修改什麼。',
      },
    ]);
  };

  if (location.pathname.endsWith('/presenter')) return null;

  const lastMessage = messages[messages.length - 1];
  const showNextSteps =
    runState === 'idle' &&
    messages.length > 1 &&
    lastMessage?.role === 'assistant' &&
    lastMessage.state === 'done';
  const onDraftView = location.pathname === '/' && location.search.includes('f=draft');
  const providerLabel = PROVIDER_OPTIONS.find(({ id }) => id === choice?.provider)?.label;
  const readyProviders = status
    ? PROVIDER_OPTIONS.filter(({ id }) => providerIsReady(status, id))
    : [];
  const modelLabel =
    status && choice
      ? (modelsFor(status, choice.provider).find(({ id }) => id === choice.model)?.label ??
        choice.model)
      : null;
  const ready = Boolean(status && choice);

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
            {status && choice ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  type="button"
                  aria-label="切換模型"
                  disabled={runState === 'running'}
                  className={cn(buttonVariants({ variant: 'outline', size: 'xs' }), 'max-w-36')}
                >
                  <span className="truncate">{modelLabel}</span>
                  <ChevronDown data-icon="inline-end" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {readyProviders.map(({ id, label }, index) => (
                    <Fragment key={id}>
                      {index > 0 ? <DropdownMenuSeparator /> : null}
                      <DropdownMenuRadioGroup
                        value={choice.provider === id ? choice.model : ''}
                        onValueChange={(model) => pickModel(id, model)}
                      >
                        <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                          {label}
                        </DropdownMenuLabel>
                        {modelsFor(status, id).map((model) => (
                          <DropdownMenuRadioItem key={model.id} value={model.id}>
                            {model.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
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
                                    {message.hint ?? '正在理解並操作專案…'}
                                  </span>
                                ) : (
                                  <>
                                    {message.text}
                                    {message.state === 'streaming' && message.hint ? (
                                      <span className="shimmer mt-1.5 block text-[11px] text-muted-foreground">
                                        {message.hint}
                                      </span>
                                    ) : null}
                                  </>
                                )}
                              </BubbleContent>
                            </Bubble>
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    ))}

                    {messages.length === 1 ? (
                      <MessageScrollerItem messageId="template-guide">
                        <div className="ml-9">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => goTo('/templates', { close: true })}
                          >
                            <LayoutTemplate data-icon="inline-start" />
                            先逛模板找視覺風格
                          </Button>
                        </div>
                      </MessageScrollerItem>
                    ) : null}

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

                    {showNextSteps ? (
                      <MessageScrollerItem messageId={`next-steps-${lastMessage.id}`}>
                        <div className="ml-9 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">下一步：</span>
                          {!onDraftView ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => goTo('/?f=draft')}
                            >
                              到草稿區確認卡片
                            </Button>
                          ) : null}
                          {location.pathname !== '/publish' ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => goTo('/publish')}
                            >
                              「新增到卡片」後前往發布
                            </Button>
                          ) : null}
                        </div>
                      </MessageScrollerItem>
                    ) : null}

                    {!ready && statusChecked ? (
                      <MessageScrollerItem messageId="setup-required">
                        <Marker className="rounded-md border border-hairline bg-card px-3 py-2.5">
                          <MarkerIcon>
                            <CircleAlert />
                          </MarkerIcon>
                          {companionEnabled && !status ? (
                            <>
                              <MarkerContent className="flex-1">
                                尚未連上本機服務。請先在專案目錄執行{' '}
                                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                                  {companionCommand()}
                                </code>
                              </MarkerContent>
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() => void refreshStatus()}
                              >
                                重新檢查
                              </Button>
                            </>
                          ) : (
                            <>
                              <MarkerContent className="flex-1">
                                先完成一次 AI 串接，之後就能直接在這裡操作。
                              </MarkerContent>
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() => goTo('/connects', { close: true })}
                              >
                                前往串接
                              </Button>
                            </>
                          )}
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
