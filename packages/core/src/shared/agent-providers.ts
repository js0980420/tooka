// Single source of truth for the AI agent providers, shared by the dev-server
// route (src/vite/routes/agent.ts) and the app UI (connects cards + the
// compose dialog). The server layers runtime spawn specs on top and the app
// layers card copy on top — both keyed by `id` — so provider identity, auth
// mode, and env keys can never drift between the two sides.

export type AgentAuthMode =
  // Authenticates through the CLI's own subscription login (no key stored).
  | 'subscription'
  // Reads an API key from a stored env var.
  | 'api-key';

export type AgentModelOption = {
  id: string;
  label: string;
};

export type AgentProviderMeta = {
  id: string;
  label: string;
  quota: string;
  auth: AgentAuthMode;
  envKey?: string;
  // Static fallback; the server may replace it with a live list (e.g. Codex
  // reads the CLI's models cache) before it reaches the app via /status.
  models: readonly AgentModelOption[];
};

export const AGENT_PROVIDERS = [
  {
    id: 'codex',
    label: 'Codex',
    quota: 'ChatGPT 訂閱',
    auth: 'subscription',
    models: [
      { id: 'gpt-5.6-sol', label: 'GPT-5.6-Sol' },
      { id: 'gpt-5.6-terra', label: 'GPT-5.6-Terra' },
      { id: 'gpt-5.6-luna', label: 'GPT-5.6-Luna' },
      { id: 'gpt-5.5', label: 'GPT-5.5' },
    ],
  },
  {
    id: 'gemma4',
    label: 'Gemma 4',
    quota: 'Gemini API 免費額度',
    auth: 'api-key',
    envKey: 'GEMINI_API_KEY',
    models: [{ id: 'gemma-4-26b-a4b-it', label: 'Gemma 4 26B' }],
  },
] as const satisfies readonly AgentProviderMeta[];

export type AgentProviderId = (typeof AGENT_PROVIDERS)[number]['id'];

export function getAgentProviderMeta(id: string): AgentProviderMeta | undefined {
  return AGENT_PROVIDERS.find((provider) => provider.id === id);
}
