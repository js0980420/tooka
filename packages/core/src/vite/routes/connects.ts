import type { ViteDevServer } from 'vite';
import {
  ensureEnvGitignored,
  maskSecret,
  readEnvValues,
  upsertEnvValues,
  validateEnvValue,
} from '../../files/env.ts';
import { validateMutationRequest } from '../../http/request-guard.ts';
import { type ApiContext, json, readBody } from './context.ts';

// GET  /__connects            connection status (secrets masked)
// POST /__connects/instagram  save { token?, userId? } into the project .env

const IG_TOKEN_KEY = 'IG_ACCESS_TOKEN';
const IG_USER_ID_KEY = 'IG_USER_ID';

export function registerConnectRoutes(server: ViteDevServer, ctx: ApiContext): void {
  server.middlewares.use('/__connects', async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://local');
    const method = req.method ?? 'GET';

    try {
      if (url.pathname === '/' && method === 'GET') {
        const values = await readEnvValues(ctx.userCwd, [IG_TOKEN_KEY, IG_USER_ID_KEY]);
        return json(res, 200, {
          instagram: {
            tokenMasked: maskSecret(values[IG_TOKEN_KEY]),
            userId: values[IG_USER_ID_KEY] ?? null,
          },
        });
      }

      if (url.pathname === '/instagram' && method === 'POST') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as { token?: unknown; userId?: unknown };
        const entries: Record<string, string> = {};
        if (body.token !== undefined) {
          const token = validateEnvValue(body.token);
          if (!token) return json(res, 400, { error: 'invalid token' });
          entries[IG_TOKEN_KEY] = token;
        }
        if (body.userId !== undefined) {
          const userId = validateEnvValue(body.userId);
          if (!userId) return json(res, 400, { error: 'invalid userId' });
          entries[IG_USER_ID_KEY] = userId;
        }
        if (Object.keys(entries).length === 0) {
          return json(res, 400, { error: 'nothing to save' });
        }

        // Vite restarts the dev server when .env changes, killing in-flight
        // responses — so respond from the merged values first, then write.
        const existing = await readEnvValues(ctx.userCwd, [IG_TOKEN_KEY, IG_USER_ID_KEY]);
        const merged = { ...existing, ...entries };
        json(res, 200, {
          instagram: {
            tokenMasked: maskSecret(merged[IG_TOKEN_KEY]),
            userId: merged[IG_USER_ID_KEY] ?? null,
          },
        });
        await ensureEnvGitignored(ctx.userCwd);
        await upsertEnvValues(ctx.userCwd, entries);
        return;
      }

      next();
    } catch (e) {
      json(res, 500, { error: e instanceof Error ? e.message : 'internal error' });
    }
  });
}
