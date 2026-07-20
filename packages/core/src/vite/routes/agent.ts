import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import {
  ensureEnvGitignored,
  maskSecret,
  readEnvValues,
  upsertEnvValues,
  validateEnvValue,
} from '../../files/env.ts';
import { validateMutationRequest } from '../../http/request-guard.ts';
import { API } from '../../shared/api-routes.ts';
import { type ApiContext, json, readBody } from './context.ts';

// GET  /__agent/status            per-provider runtime/auth + busy state
// POST /__agent/token             save an auth value { provider, token }
// POST /__agent/token/disconnect  remove a saved auth value { provider }
// POST /__agent/run               { provider?, prompt } → NDJSON stream

const PROMPT_MAX_LENGTH = 8000;
const RUN_TIMEOUT_MS = 10 * 60 * 1000;

type Command = { command: string; args: string[] };
type RuntimeKind = 'builtin' | 'global';

type Provider = {
  id: 'claude' | 'codex' | 'gemini';
  envKey: string;
  cliOverrideEnv: string;
  globalBin: string;
  resolveBuiltin?: (userCwd: string) => Command | null;
  runArgs: (prompt: string) => { args: string[]; promptViaStdin: boolean };
  // claude emits NDJSON natively; the others emit plain text that gets
  // wrapped into the tooka NDJSON envelope before streaming to the client.
  streamsNdjson: boolean;
};

function overrideCommand(value: string): Command {
  return /\.(c|m)?js$/.test(value)
    ? { command: process.execPath, args: [value] }
    : { command: value, args: [] };
}

// The claude npm package is a wrapper: the native binary lives in a
// per-platform optional dependency, and a postinstall copies it over
// bin/claude.exe. Package managers often skip that postinstall, so resolve
// the platform binary directly and fall back to the wrapper's Node launcher.
function resolveClaudeBuiltin(userCwd: string): Command | null {
  for (const base of [path.join(userCwd, 'package.json'), import.meta.url]) {
    let wrapperRequire: NodeJS.Require;
    let wrapperDir: string;
    try {
      const require = createRequire(base);
      const wrapperPkg = require.resolve('@anthropic-ai/claude-code/package.json');
      wrapperDir = path.dirname(wrapperPkg);
      wrapperRequire = createRequire(wrapperPkg);
    } catch {
      continue;
    }
    const binName = process.platform === 'win32' ? 'claude.exe' : 'claude';
    const key = `${process.platform}-${process.arch}`;
    for (const suffix of [key, `${key}-musl`]) {
      try {
        const pkg = wrapperRequire.resolve(`@anthropic-ai/claude-code-${suffix}/package.json`);
        const bin = path.join(path.dirname(pkg), binName);
        if (existsSync(bin)) return { command: bin, args: [] };
      } catch {}
    }
    const launcher = path.join(wrapperDir, 'cli-wrapper.cjs');
    if (existsSync(launcher)) return { command: process.execPath, args: [launcher] };
  }
  return null;
}

const PROVIDERS: Record<string, Provider> = {
  claude: {
    id: 'claude',
    envKey: 'CLAUDE_CODE_OAUTH_TOKEN',
    cliOverrideEnv: 'TOOKA_AGENT_CLI',
    globalBin: 'claude',
    resolveBuiltin: resolveClaudeBuiltin,
    runArgs: () => ({
      args: [
        '-p',
        '--output-format',
        'stream-json',
        '--verbose',
        '--permission-mode',
        'acceptEdits',
      ],
      promptViaStdin: true,
    }),
    streamsNdjson: true,
  },
  codex: {
    id: 'codex',
    envKey: 'OPENAI_API_KEY',
    cliOverrideEnv: 'TOOKA_CODEX_CLI',
    globalBin: 'codex',
    runArgs: (prompt) => ({
      args: ['exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', prompt],
      promptViaStdin: false,
    }),
    streamsNdjson: false,
  },
  gemini: {
    id: 'gemini',
    envKey: 'GEMINI_API_KEY',
    cliOverrideEnv: 'TOOKA_GEMINI_CLI',
    globalBin: 'gemini',
    runArgs: (prompt) => ({ args: ['--yolo', '-p', prompt], promptViaStdin: false }),
    streamsNdjson: false,
  },
};

async function hasGlobalCli(bin: string): Promise<boolean> {
  return await new Promise((resolve) => {
    const child = execFile(bin, ['--version'], { timeout: 10_000 }, (err) => {
      resolve(!err);
    });
    child.on('error', () => resolve(false));
  });
}

async function resolveRuntime(
  provider: Provider,
  userCwd: string,
): Promise<(Command & { kind: RuntimeKind }) | null> {
  const override = process.env[provider.cliOverrideEnv];
  if (override) return { kind: 'builtin', ...overrideCommand(override) };
  const builtin = provider.resolveBuiltin?.(userCwd);
  if (builtin) return { kind: 'builtin', ...builtin };
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

function pickProvider(value: unknown): Provider | null {
  const id = typeof value === 'string' ? value : 'claude';
  return PROVIDERS[id] ?? null;
}

let running = false;

export function registerAgentRoutes(server: ViteDevServer, ctx: ApiContext): void {
  server.middlewares.use(API.agent, async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://local');
    const method = req.method ?? 'GET';

    try {
      if (url.pathname === '/status' && method === 'GET') {
        const envKeys = Object.values(PROVIDERS).map((p) => p.envKey);
        const env = await readEnvValues(ctx.userCwd, envKeys);
        const providers: Record<string, unknown> = {};
        await Promise.all(
          Object.values(PROVIDERS).map(async (provider) => {
            const runtime = await resolveRuntime(provider, ctx.userCwd);
            providers[provider.id] = {
              runtime: runtime?.kind ?? null,
              version: runtime ? await runtimeVersion(runtime) : null,
              tokenMasked: maskSecret(env[provider.envKey]),
            };
          }),
        );
        return json(res, 200, { providers, busy: running });
      }

      if (url.pathname === '/token' && method === 'POST') {
        const requestCheck = validateMutationRequest(req, { requireJsonBody: true });
        if (!requestCheck.ok) {
          return json(res, requestCheck.status, { error: requestCheck.error });
        }
        const body = (await readBody(req)) as { provider?: unknown; token?: unknown };
        const provider = pickProvider(body.provider);
        if (!provider) return json(res, 400, { error: 'invalid_provider' });
        const token = validateEnvValue(body.token);
        if (!token) return json(res, 400, { error: 'invalid_token' });
        await ensureEnvGitignored(ctx.userCwd);
        await upsertEnvValues(ctx.userCwd, { [provider.envKey]: token });
        return json(res, 200, { ok: true, tokenMasked: maskSecret(token) });
      }

      if (url.pathname === '/token/disconnect' && method === 'POST') {
        const requestCheck = validateMutationRequest(req, { requireJsonBody: true });
        if (!requestCheck.ok) {
          return json(res, requestCheck.status, { error: requestCheck.error });
        }
        const body = (await readBody(req)) as { provider?: unknown };
        const provider = pickProvider(body.provider);
        if (!provider) return json(res, 400, { error: 'invalid_provider' });
        await upsertEnvValues(ctx.userCwd, { [provider.envKey]: '' });
        return json(res, 200, { ok: true });
      }

      if (url.pathname === '/run' && method === 'POST') {
        const requestCheck = validateMutationRequest(req, { requireJsonBody: true });
        if (!requestCheck.ok) {
          return json(res, requestCheck.status, { error: requestCheck.error });
        }
        const body = (await readBody(req)) as { provider?: unknown; prompt?: unknown };
        const provider = pickProvider(body.provider);
        if (!provider) return json(res, 400, { error: 'invalid_provider' });
        const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
        if (!prompt || prompt.length > PROMPT_MAX_LENGTH) {
          return json(res, 400, { error: 'invalid_prompt' });
        }
        if (running) return json(res, 409, { error: 'agent_busy' });

        const runtime = await resolveRuntime(provider, ctx.userCwd);
        if (!runtime) return json(res, 503, { error: 'runtime_not_found' });

        const env = { ...process.env };
        const saved = await readEnvValues(ctx.userCwd, [provider.envKey]);
        if (saved[provider.envKey]) env[provider.envKey] = saved[provider.envKey];

        running = true;
        res.writeHead(200, {
          'content-type': 'application/x-ndjson; charset=utf-8',
          'cache-control': 'no-cache',
          'x-accel-buffering': 'no',
        });

        const { args, promptViaStdin } = provider.runArgs(prompt);
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

        // claude's stdout is already NDJSON — pass chunks through untouched
        // and only append our own lines after the child has exited, so a
        // mid-line chunk boundary can never interleave with an injected line.
        // Plain-text providers get each chunk wrapped as a JSON line instead.
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
      if (!res.headersSent) {
        json(res, 500, { error: String((err as Error).message ?? err) });
      } else {
        res.end();
      }
    }
  });
}
