import { execFile, spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Connect, ViteDevServer } from 'vite';
import {
  ensureEnvGitignored,
  maskSecret,
  readEnvValues,
  upsertEnvValues,
  validateEnvValue,
} from '../../files/env.ts';
import { validateMutationRequest } from '../../http/request-guard.ts';
import {
  AGENT_PROVIDERS,
  type AgentModelOption,
  type AgentProviderId,
  type AgentProviderMeta,
} from '../../shared/agent-providers.ts';
import { API } from '../../shared/api-routes.ts';
import { type ApiContext, json, readBody } from './context.ts';

const PROMPT_MAX_LENGTH = 8000;
// Model ids become CLI arguments — restrict to a slug shape that can never be
// mistaken for a flag.
const MODEL_ID_PATTERN = /^[A-Za-z0-9][\w.-]{0,63}$/;
// Codex session ids are UUIDs (from the `thread.started` stream event).
const RESUME_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RUN_TIMEOUT_MS = 10 * 60 * 1000;
const AUTH_TIMEOUT_MS = 10 * 60 * 1000;
const CLI_PROBE_TIMEOUT_MS = 3000;

type Command = { command: string; args: string[] };
type RuntimeKind = 'builtin' | 'global';

// The server-only half of a provider: how to find and drive its CLI. The
// shared half (id, label, auth mode, envKey) lives in ../../shared and is
// merged in below so both sides stay in lockstep.
type RunOptions = { model?: string; resume?: string };

type RuntimeSpec = {
  cliOverrideEnv: string;
  globalBin: string;
  runArgs: (prompt: string, opts: RunOptions) => { args: string[]; promptViaStdin: boolean };
  // A provider whose CLI emits NDJSON natively is passed through untouched;
  // plain-text CLIs get each chunk wrapped in the tooka NDJSON envelope.
  streamsNdjson: boolean;
  // Live model list; falls back to the registry's static `models` when absent
  // or when it resolves to null.
  listModels?: () => Promise<AgentModelOption[] | null>;
};

type Provider = AgentProviderMeta & RuntimeSpec;

function overrideCommand(value: string): Command {
  return /\.(c|m)?js$/.test(value)
    ? { command: process.execPath, args: [value] }
    : { command: value, args: [] };
}

async function codexModelsFromCache(): Promise<AgentModelOption[] | null> {
  try {
    const codexHome = process.env.CODEX_HOME || join(homedir(), '.codex');
    const raw = await readFile(join(codexHome, 'models_cache.json'), 'utf8');
    const parsed = JSON.parse(raw) as {
      models?: Array<{
        slug?: unknown;
        display_name?: unknown;
        visibility?: unknown;
        priority?: unknown;
      }>;
    };
    const models = (parsed.models ?? [])
      .filter(
        (model): model is { slug: string; display_name?: unknown; priority?: unknown } =>
          model.visibility === 'list' &&
          typeof model.slug === 'string' &&
          MODEL_ID_PATTERN.test(model.slug),
      )
      .sort(
        (a, b) =>
          (typeof a.priority === 'number' ? a.priority : 0) -
          (typeof b.priority === 'number' ? b.priority : 0),
      )
      .map((model) => ({
        id: model.slug,
        label: typeof model.display_name === 'string' ? model.display_name : model.slug,
      }));
    return models.length > 0 ? models : null;
  } catch {
    return null;
  }
}

const RUNTIME_SPECS: Record<AgentProviderId, RuntimeSpec> = {
  codex: {
    cliOverrideEnv: 'TOOKA_CODEX_CLI',
    globalBin: 'codex',
    runArgs: (prompt, { model, resume }) => {
      const common = [
        '--json',
        ...(model ? ['--model', model] : []),
        '-c',
        'forced_login_method="chatgpt"',
        '--skip-git-repo-check',
      ];
      return {
        // `exec resume` has no --sandbox flag, so the resumed turn sets the
        // sandbox through config instead.
        args: resume
          ? ['exec', 'resume', resume, ...common, '-c', 'sandbox_mode="workspace-write"', prompt]
          : ['exec', ...common, '--sandbox', 'workspace-write', prompt],
        promptViaStdin: false,
      };
    },
    streamsNdjson: true,
    listModels: codexModelsFromCache,
  },
  gemma4: {
    cliOverrideEnv: 'TOOKA_GEMINI_CLI',
    globalBin: 'gemini',
    runArgs: (prompt, { model }) => ({
      args: ['--yolo', '--model', model ?? 'gemma-4-26b-a4b-it', '-p', prompt],
      promptViaStdin: false,
    }),
    streamsNdjson: false,
  },
};

const PROVIDERS: Record<string, Provider> = Object.fromEntries(
  AGENT_PROVIDERS.map((meta) => [meta.id, { ...meta, ...RUNTIME_SPECS[meta.id] }]),
);

async function hasGlobalCli(bin: string): Promise<boolean> {
  return await new Promise((resolve) => {
    const child = execFile(bin, ['--version'], { timeout: CLI_PROBE_TIMEOUT_MS }, (err) => {
      resolve(!err);
    });
    child.on('error', () => resolve(false));
  });
}

async function resolveRuntime(
  provider: Provider,
): Promise<(Command & { kind: RuntimeKind }) | null> {
  const override = process.env[provider.cliOverrideEnv];
  if (override) return { kind: 'builtin', ...overrideCommand(override) };
  if (await hasGlobalCli(provider.globalBin)) {
    return { kind: 'global', command: provider.globalBin, args: [] };
  }
  return null;
}

async function runtimeVersion(runtime: Command): Promise<string | null> {
  return await new Promise((resolve) => {
    const child = execFile(
      runtime.command,
      [...runtime.args, '--version'],
      { timeout: 10_000 },
      (err, stdout) => {
        resolve(err ? null : stdout.trim() || null);
      },
    );
    child.on('error', () => resolve(null));
  });
}

type CodexAuthMethod = 'chatgpt' | 'api_key' | null;

async function codexAuthMethod(runtime: Command | null): Promise<CodexAuthMethod> {
  if (!runtime) return null;
  return await new Promise((resolve) => {
    const child = execFile(
      runtime.command,
      [...runtime.args, 'login', 'status'],
      { timeout: 10_000 },
      (err, stdout, stderr) => {
        if (err) return resolve(null);
        const output = `${stdout}\n${stderr}`.toLowerCase();
        if (output.includes('logged in using chatgpt')) return resolve('chatgpt');
        if (output.includes('logged in using an api key')) return resolve('api_key');
        resolve(null);
      },
    );
    child.on('error', () => resolve(null));
  });
}

function pickProvider(value: unknown): Provider | null {
  const id = typeof value === 'string' ? value : 'codex';
  return PROVIDERS[id] ?? null;
}

let running = false;
let authenticating = false;

export type AgentMiddlewareOptions = {
  allowedOrigins?: readonly string[];
};

export function createAgentMiddleware(
  ctx: ApiContext,
  options: AgentMiddlewareOptions = {},
): (req: Connect.IncomingMessage, res: ServerResponse, next: () => void) => Promise<void> {
  const guard = { allowedOrigins: options.allowedOrigins, requireJsonBody: true };
  return async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://local');
    const method = req.method ?? 'GET';

    try {
      if (url.pathname === '/status' && method === 'GET') {
        const envKeys = Object.values(PROVIDERS).flatMap((provider) =>
          provider.envKey ? [provider.envKey] : [],
        );
        const env = await readEnvValues(ctx.userCwd, envKeys);
        const providers: Record<string, unknown> = {};
        await Promise.all(
          Object.values(PROVIDERS).map(async (provider) => {
            const runtime = await resolveRuntime(provider);
            providers[provider.id] = {
              runtime: runtime?.kind ?? null,
              version: runtime ? await runtimeVersion(runtime) : null,
              tokenMasked: provider.envKey ? maskSecret(env[provider.envKey]) : null,
              authMethod: provider.auth === 'subscription' ? await codexAuthMethod(runtime) : null,
              models: (await provider.listModels?.()) ?? provider.models,
            };
          }),
        );
        return json(res, 200, { providers, busy: running });
      }

      if (url.pathname === '/token' && method === 'POST') {
        const requestCheck = validateMutationRequest(req, guard);
        if (!requestCheck.ok) {
          return json(res, requestCheck.status, { error: requestCheck.error });
        }
        const body = (await readBody(req)) as { provider?: unknown; token?: unknown };
        const provider = pickProvider(body.provider);
        if (!provider) return json(res, 400, { error: 'invalid_provider' });
        if (!provider.envKey) return json(res, 400, { error: 'token_auth_not_supported' });
        const token = validateEnvValue(body.token);
        if (!token) return json(res, 400, { error: 'invalid_token' });
        await ensureEnvGitignored(ctx.userCwd);
        await upsertEnvValues(ctx.userCwd, { [provider.envKey]: token });
        return json(res, 200, { ok: true, tokenMasked: maskSecret(token) });
      }

      if (url.pathname === '/token/disconnect' && method === 'POST') {
        const requestCheck = validateMutationRequest(req, guard);
        if (!requestCheck.ok) {
          return json(res, requestCheck.status, { error: requestCheck.error });
        }
        const body = (await readBody(req)) as { provider?: unknown };
        const provider = pickProvider(body.provider);
        if (!provider) return json(res, 400, { error: 'invalid_provider' });
        if (!provider.envKey) return json(res, 400, { error: 'token_auth_not_supported' });
        await upsertEnvValues(ctx.userCwd, { [provider.envKey]: '' });
        return json(res, 200, { ok: true });
      }

      if (url.pathname === '/auth/login' && method === 'POST') {
        const requestCheck = validateMutationRequest(req, guard);
        if (!requestCheck.ok) {
          return json(res, requestCheck.status, { error: requestCheck.error });
        }
        const body = (await readBody(req)) as { provider?: unknown };
        const provider = pickProvider(body.provider);
        if (provider?.auth !== 'subscription') return json(res, 400, { error: 'invalid_provider' });
        if (authenticating) return json(res, 409, { error: 'auth_busy' });

        const runtime = await resolveRuntime(provider);
        if (!runtime) return json(res, 503, { error: 'runtime_not_found' });

        authenticating = true;
        res.writeHead(200, {
          'content-type': 'application/x-ndjson; charset=utf-8',
          'cache-control': 'no-cache',
          'x-accel-buffering': 'no',
        });

        const child = spawn(runtime.command, [...runtime.args, 'login', '--device-auth'], {
          cwd: ctx.userCwd,
          env: process.env,
        });
        let settled = false;
        const finish = async (code: number | null, error?: string) => {
          if (settled) return;
          settled = true;
          authenticating = false;
          clearTimeout(timer);
          const authMethod = await codexAuthMethod(runtime);
          try {
            res.write(
              `${JSON.stringify({ type: 'exit', code, authMethod, ...(error ? { error } : {}) })}\n`,
            );
          } catch {}
          res.end();
        };
        const writeOutput = (chunk: Buffer) => {
          if (settled) return;
          const text = chunk.toString('utf8');
          if (text) res.write(`${JSON.stringify({ type: 'output', text })}\n`);
        };
        const timer = setTimeout(() => {
          child.kill('SIGTERM');
          void finish(null, 'auth_timeout');
        }, AUTH_TIMEOUT_MS);

        child.stdout.on('data', writeOutput);
        child.stderr.on('data', writeOutput);
        child.on('error', (err) => void finish(null, String(err.message ?? err)));
        child.on('close', (code) => void finish(code));
        res.on('close', () => {
          if (!settled) {
            settled = true;
            authenticating = false;
            clearTimeout(timer);
            child.kill('SIGTERM');
          }
        });
        return;
      }

      if (url.pathname === '/auth/logout' && method === 'POST') {
        const requestCheck = validateMutationRequest(req, guard);
        if (!requestCheck.ok) {
          return json(res, requestCheck.status, { error: requestCheck.error });
        }
        const body = (await readBody(req)) as { provider?: unknown };
        const provider = pickProvider(body.provider);
        if (provider?.auth !== 'subscription') return json(res, 400, { error: 'invalid_provider' });
        const runtime = await resolveRuntime(provider);
        if (!runtime) return json(res, 503, { error: 'runtime_not_found' });

        const loggedOut = await new Promise<boolean>((resolve) => {
          const child = execFile(
            runtime.command,
            [...runtime.args, 'logout'],
            { cwd: ctx.userCwd, timeout: 30_000 },
            (err) => resolve(!err),
          );
          child.on('error', () => resolve(false));
        });
        return json(res, loggedOut ? 200 : 500, {
          ...(loggedOut ? { ok: true } : { error: 'logout_failed' }),
        });
      }

      if (url.pathname === '/run' && method === 'POST') {
        const requestCheck = validateMutationRequest(req, guard);
        if (!requestCheck.ok) {
          return json(res, requestCheck.status, { error: requestCheck.error });
        }
        const body = (await readBody(req)) as {
          provider?: unknown;
          prompt?: unknown;
          model?: unknown;
          resume?: unknown;
        };
        const provider = pickProvider(body.provider);
        if (!provider) return json(res, 400, { error: 'invalid_provider' });
        const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
        if (!prompt || prompt.length > PROMPT_MAX_LENGTH) {
          return json(res, 400, { error: 'invalid_prompt' });
        }
        let model: string | undefined;
        if (body.model !== undefined) {
          if (typeof body.model !== 'string' || !MODEL_ID_PATTERN.test(body.model)) {
            return json(res, 400, { error: 'invalid_model' });
          }
          model = body.model;
        }
        let resume: string | undefined;
        if (body.resume !== undefined) {
          if (typeof body.resume !== 'string' || !RESUME_ID_PATTERN.test(body.resume)) {
            return json(res, 400, { error: 'invalid_resume' });
          }
          resume = body.resume;
        }
        if (running) return json(res, 409, { error: 'agent_busy' });

        const runtime = await resolveRuntime(provider);
        if (!runtime) return json(res, 503, { error: 'runtime_not_found' });
        if (provider.id === 'codex' && (await codexAuthMethod(runtime)) !== 'chatgpt') {
          return json(res, 401, { error: 'auth_required' });
        }

        const env = { ...process.env };
        if (provider.envKey) {
          const saved = await readEnvValues(ctx.userCwd, [provider.envKey]);
          if (saved[provider.envKey]) env[provider.envKey] = saved[provider.envKey];
        }

        running = true;
        res.writeHead(200, {
          'content-type': 'application/x-ndjson; charset=utf-8',
          'cache-control': 'no-cache',
          'x-accel-buffering': 'no',
        });

        const { args, promptViaStdin } = provider.runArgs(prompt, { model, resume });
        const child = spawn(runtime.command, [...runtime.args, ...args], {
          cwd: ctx.userCwd,
          env,
        });

        const stderrTail: string[] = [];
        let settled = false;
        const finish = (line: Record<string, unknown>) => {
          if (settled) return;
          settled = true;
          running = false;
          clearTimeout(timer);
          try {
            res.write(`${JSON.stringify(line)}\n`);
          } catch {}
          res.end();
        };

        const timer = setTimeout(() => {
          child.kill('SIGTERM');
          finish({ type: 'tooka', subtype: 'timeout' });
        }, RUN_TIMEOUT_MS);

        child.stdout.on('data', (chunk: Buffer) => {
          if (settled) return;
          if (provider.streamsNdjson) {
            res.write(chunk);
          } else {
            const text = chunk.toString('utf8');
            if (text) {
              res.write(`${JSON.stringify({ type: 'tooka', subtype: 'output', text })}\n`);
            }
          }
        });
        child.stderr.on('data', (chunk: Buffer) => {
          stderrTail.push(chunk.toString('utf8'));
          while (stderrTail.length > 20) stderrTail.shift();
        });
        child.on('error', (err) => {
          finish({ type: 'tooka', subtype: 'spawn-error', error: String(err.message ?? err) });
        });
        child.on('close', (code) => {
          finish({
            type: 'tooka',
            subtype: 'exit',
            code,
            ...(code !== 0 ? { stderr: stderrTail.join('').slice(-4000) } : {}),
          });
        });
        res.on('close', () => {
          if (!settled) {
            settled = true;
            running = false;
            clearTimeout(timer);
            child.kill('SIGTERM');
          }
        });

        if (promptViaStdin) child.stdin.write(prompt);
        child.stdin.end();
        return;
      }

      return next();
    } catch (err) {
      running = false;
      authenticating = false;
      if (!res.headersSent) {
        json(res, 500, { error: String((err as Error).message ?? err) });
      } else {
        res.end();
      }
    }
  };
}

export function registerAgentRoutes(server: ViteDevServer, ctx: ApiContext): void {
  server.middlewares.use(API.agent, createAgentMiddleware(ctx));
}
