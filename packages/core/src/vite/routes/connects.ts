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
import { validateFacebookPageConnection } from './facebook.ts';
import {
  type InstagramTokenSource,
  isInstagramTokenSource,
  refreshInstagramLoginToken,
  validateInstagramConnection,
} from './instagram.ts';

const IG_TOKEN_KEY = 'IG_ACCESS_TOKEN';
const IG_USER_ID_KEY = 'IG_USER_ID';
const IG_USERNAME_KEY = 'IG_USERNAME';
const IG_SOURCE_KEY = 'IG_TOKEN_SOURCE';
const IG_EXPIRES_KEY = 'IG_TOKEN_EXPIRES_AT';
const IG_ENV_KEYS = [IG_TOKEN_KEY, IG_USER_ID_KEY, IG_USERNAME_KEY, IG_SOURCE_KEY, IG_EXPIRES_KEY];
const DEFAULT_TOKEN_SOURCE: InstagramTokenSource = 'business_system_user';
const REFRESH_WINDOW_MS = 10 * 24 * 60 * 60 * 1000;

const FB_TOKEN_KEY = 'FB_ACCESS_TOKEN';
const FB_PAGE_ID_KEY = 'FB_PAGE_ID';
const FB_PAGE_NAME_KEY = 'FB_PAGE_NAME';
const FB_ENV_KEYS = [FB_TOKEN_KEY, FB_PAGE_ID_KEY, FB_PAGE_NAME_KEY];

function tokenSource(value: string | undefined): InstagramTokenSource {
  return isInstagramTokenSource(value) ? value : DEFAULT_TOKEN_SOURCE;
}

function expiresAt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function refreshStoredInstagramLoginToken(userCwd: string): Promise<boolean> {
  const values = await readEnvValues(userCwd, IG_ENV_KEYS);
  const token = values[IG_TOKEN_KEY];
  const source = tokenSource(values[IG_SOURCE_KEY]);
  const expiry = expiresAt(values[IG_EXPIRES_KEY]);
  if (!token || source !== 'instagram_login' || !expiry) return false;
  if (expiry - Date.now() >= REFRESH_WINDOW_MS) return false;

  const refreshed = await refreshInstagramLoginToken(token);
  if (refreshed) {
    await upsertEnvValues(userCwd, {
      [IG_TOKEN_KEY]: refreshed.token,
      [IG_EXPIRES_KEY]: String(refreshed.expiresAt),
    });
    return false;
  }

  const validation = await validateInstagramConnection(source, token, values[IG_USER_ID_KEY]);
  return !validation.ok;
}

function statusBody(values: Record<string, string>, needsReauth: boolean) {
  return {
    tokenMasked: maskSecret(values[IG_TOKEN_KEY]),
    userId: values[IG_USER_ID_KEY] ?? null,
    username: values[IG_USERNAME_KEY] ?? null,
    tokenSource: tokenSource(values[IG_SOURCE_KEY]),
    needsReauth,
    expiresAt: expiresAt(values[IG_EXPIRES_KEY]),
  };
}

function facebookStatusBody(values: Record<string, string>) {
  return {
    tokenMasked: maskSecret(values[FB_TOKEN_KEY]),
    pageId: values[FB_PAGE_ID_KEY] ?? null,
    pageName: values[FB_PAGE_NAME_KEY] ?? null,
  };
}

export function registerConnectRoutes(server: ViteDevServer, ctx: ApiContext): void {
  server.middlewares.use('/__connects', async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://local');
    const method = req.method ?? 'GET';

    try {
      if (url.pathname === '/' && method === 'GET') {
        const needsReauth = await refreshStoredInstagramLoginToken(ctx.userCwd);
        const [instagramValues, facebookValues] = await Promise.all([
          readEnvValues(ctx.userCwd, IG_ENV_KEYS),
          readEnvValues(ctx.userCwd, FB_ENV_KEYS),
        ]);
        return json(res, 200, {
          instagram: statusBody(instagramValues, needsReauth),
          facebook: facebookStatusBody(facebookValues),
        });
      }

      if (url.pathname === '/facebook' && method === 'POST') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as { token?: unknown; pageId?: unknown };
        const existing = await readEnvValues(ctx.userCwd, FB_ENV_KEYS);
        const submittedToken =
          body.token === undefined ? existing[FB_TOKEN_KEY] : validateEnvValue(body.token);
        const submittedPageId =
          body.pageId === undefined ? existing[FB_PAGE_ID_KEY] : validateEnvValue(body.pageId);

        if (!submittedToken) return json(res, 400, { error: 'invalid_token' });
        if (!submittedPageId) return json(res, 400, { error: 'missing_page_id' });

        const validation = await validateFacebookPageConnection(submittedPageId, submittedToken);
        if (!validation.ok) return json(res, 400, { error: validation.error });

        const entries = {
          [FB_TOKEN_KEY]: validation.page.accessToken,
          [FB_PAGE_ID_KEY]: validation.page.pageId,
          [FB_PAGE_NAME_KEY]: validation.page.pageName,
        };
        json(res, 200, { facebook: facebookStatusBody(entries) });
        await ensureEnvGitignored(ctx.userCwd);
        await upsertEnvValues(ctx.userCwd, entries);
        return;
      }

      if (url.pathname === '/facebook/test' && method === 'POST') {
        const guard = validateMutationRequest(req);
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const values = await readEnvValues(ctx.userCwd, FB_ENV_KEYS);
        const token = values[FB_TOKEN_KEY];
        const pageId = values[FB_PAGE_ID_KEY];
        if (!token || !pageId) return json(res, 400, { error: 'no_credentials' });

        const validation = await validateFacebookPageConnection(pageId, token);
        if (!validation.ok) return json(res, 400, { error: validation.error });
        return json(res, 200, {
          ok: true,
          pageId: validation.page.pageId,
          pageName: validation.page.pageName,
        });
      }

      if (url.pathname === '/facebook/disconnect' && method === 'POST') {
        const guard = validateMutationRequest(req);
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        await upsertEnvValues(ctx.userCwd, {
          [FB_TOKEN_KEY]: '',
          [FB_PAGE_ID_KEY]: '',
          [FB_PAGE_NAME_KEY]: '',
        });
        return json(res, 200, { ok: true });
      }

      if (url.pathname === '/instagram' && method === 'POST') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as {
          token?: unknown;
          userId?: unknown;
          tokenSource?: unknown;
        };
        if (body.tokenSource !== undefined && !isInstagramTokenSource(body.tokenSource)) {
          return json(res, 400, { error: 'invalid_token_source' });
        }

        const existing = await readEnvValues(ctx.userCwd, IG_ENV_KEYS);
        const source =
          body.tokenSource === undefined ? tokenSource(existing[IG_SOURCE_KEY]) : body.tokenSource;
        const submittedToken =
          body.token === undefined ? existing[IG_TOKEN_KEY] : validateEnvValue(body.token);
        const submittedUserId =
          source === 'instagram_login'
            ? undefined
            : body.userId === undefined
              ? existing[IG_USER_ID_KEY]
              : validateEnvValue(body.userId);

        if (!submittedToken) return json(res, 400, { error: 'invalid_token' });
        if (source === 'business_system_user' && !submittedUserId) {
          return json(res, 400, { error: 'missing_user_id' });
        }

        const validation = await validateInstagramConnection(
          source,
          submittedToken,
          submittedUserId ?? undefined,
        );
        if (!validation.ok) return json(res, 400, { error: validation.error });

        let savedToken = submittedToken;
        let savedExpiry: number | null = null;
        if (source === 'instagram_login') {
          const refreshed = await refreshInstagramLoginToken(submittedToken);
          if (refreshed) {
            savedToken = refreshed.token;
            savedExpiry = refreshed.expiresAt;
          }
        }

        const entries = {
          [IG_TOKEN_KEY]: savedToken,
          [IG_USER_ID_KEY]: validation.account.userId,
          [IG_USERNAME_KEY]: validation.account.username,
          [IG_SOURCE_KEY]: source,
          [IG_EXPIRES_KEY]: savedExpiry ? String(savedExpiry) : '',
        };
        const merged = { ...existing, ...entries };
        json(res, 200, { instagram: statusBody(merged, false) });
        await ensureEnvGitignored(ctx.userCwd);
        await upsertEnvValues(ctx.userCwd, entries);
        return;
      }

      if (url.pathname === '/instagram/test' && method === 'POST') {
        const guard = validateMutationRequest(req);
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        await refreshStoredInstagramLoginToken(ctx.userCwd);
        const values = await readEnvValues(ctx.userCwd, IG_ENV_KEYS);
        const token = values[IG_TOKEN_KEY];
        if (!token) return json(res, 400, { error: 'no_token' });

        const validation = await validateInstagramConnection(
          tokenSource(values[IG_SOURCE_KEY]),
          token,
          values[IG_USER_ID_KEY],
        );
        if (!validation.ok) return json(res, 400, { error: validation.error });
        return json(res, 200, {
          ok: true,
          username: validation.account.username,
          userId: validation.account.userId,
        });
      }

      if (url.pathname === '/instagram/disconnect' && method === 'POST') {
        const guard = validateMutationRequest(req);
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        await upsertEnvValues(ctx.userCwd, {
          [IG_TOKEN_KEY]: '',
          [IG_USER_ID_KEY]: '',
          [IG_USERNAME_KEY]: '',
          [IG_SOURCE_KEY]: '',
          [IG_EXPIRES_KEY]: '',
        });
        return json(res, 200, { ok: true });
      }

      next();
    } catch {
      json(res, 500, { error: 'internal_error' });
    }
  });
}
