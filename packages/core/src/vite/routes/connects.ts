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
import { validateImgbbKey } from './imgbb.ts';
import {
  type InstagramTokenSource,
  isInstagramTokenSource,
  refreshInstagramLoginToken,
  validateInstagramConnection,
} from './instagram.ts';
import { refreshThreadsToken, validateThreadsConnection } from './threads.ts';

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

const THREADS_TOKEN_KEY = 'THREADS_ACCESS_TOKEN';
const THREADS_USER_ID_KEY = 'THREADS_USER_ID';
const THREADS_USERNAME_KEY = 'THREADS_USERNAME';
const THREADS_EXPIRES_KEY = 'THREADS_TOKEN_EXPIRES_AT';
const THREADS_ENV_KEYS = [
  THREADS_TOKEN_KEY,
  THREADS_USER_ID_KEY,
  THREADS_USERNAME_KEY,
  THREADS_EXPIRES_KEY,
];
const THREADS_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;

const IMGBB_KEY_KEY = 'IMGBB_API_KEY';

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

async function refreshStoredThreadsToken(userCwd: string): Promise<boolean> {
  const values = await readEnvValues(userCwd, THREADS_ENV_KEYS);
  const token = values[THREADS_TOKEN_KEY];
  const expiry = expiresAt(values[THREADS_EXPIRES_KEY]);
  if (!token || !expiry) return false;
  if (expiry - Date.now() >= REFRESH_WINDOW_MS) return false;

  const refreshed = await refreshThreadsToken(token);
  if (refreshed) {
    await upsertEnvValues(userCwd, {
      [THREADS_TOKEN_KEY]: refreshed.token,
      [THREADS_EXPIRES_KEY]: String(refreshed.expiresAt),
    });
    return false;
  }

  const validation = await validateThreadsConnection(token);
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

function imgbbStatusBody(values: Record<string, string>) {
  return {
    keyMasked: maskSecret(values[IMGBB_KEY_KEY]),
  };
}

function threadsStatusBody(values: Record<string, string>, needsReauth: boolean) {
  return {
    tokenMasked: maskSecret(values[THREADS_TOKEN_KEY]),
    userId: values[THREADS_USER_ID_KEY] ?? null,
    username: values[THREADS_USERNAME_KEY] ?? null,
    needsReauth,
    expiresAt: expiresAt(values[THREADS_EXPIRES_KEY]),
  };
}

export function registerConnectRoutes(server: ViteDevServer, ctx: ApiContext): void {
  server.middlewares.use('/__connects', async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://local');
    const method = req.method ?? 'GET';

    try {
      if (url.pathname === '/' && method === 'GET') {
        const needsReauth = await refreshStoredInstagramLoginToken(ctx.userCwd);
        const threadsNeedsReauth = await refreshStoredThreadsToken(ctx.userCwd);
        const [instagramValues, facebookValues, threadsValues, imgbbValues] = await Promise.all([
          readEnvValues(ctx.userCwd, IG_ENV_KEYS),
          readEnvValues(ctx.userCwd, FB_ENV_KEYS),
          readEnvValues(ctx.userCwd, THREADS_ENV_KEYS),
          readEnvValues(ctx.userCwd, [IMGBB_KEY_KEY]),
        ]);
        return json(res, 200, {
          instagram: statusBody(instagramValues, needsReauth),
          facebook: facebookStatusBody(facebookValues),
          threads: threadsStatusBody(threadsValues, threadsNeedsReauth),
          imgbb: imgbbStatusBody(imgbbValues),
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

      if (url.pathname === '/threads' && method === 'POST') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as { token?: unknown };
        const existing = await readEnvValues(ctx.userCwd, THREADS_ENV_KEYS);
        const submittedToken =
          body.token === undefined ? existing[THREADS_TOKEN_KEY] : validateEnvValue(body.token);
        if (!submittedToken) return json(res, 400, { error: 'invalid_token' });

        // Meta only refreshes unexpired long-lived tokens older than 24h; when refresh is
        // rejected, assume the standard 60-day TTL so the stored auto-refresh still kicks in.
        let savedToken = submittedToken;
        let savedExpiry = Date.now() + THREADS_TOKEN_TTL_MS;
        const refreshed = await refreshThreadsToken(submittedToken);
        if (refreshed) {
          savedToken = refreshed.token;
          savedExpiry = refreshed.expiresAt;
        }

        const validation = await validateThreadsConnection(savedToken);
        if (!validation.ok) return json(res, 400, { error: validation.error });

        const entries = {
          [THREADS_TOKEN_KEY]: savedToken,
          [THREADS_USER_ID_KEY]: validation.account.userId,
          [THREADS_USERNAME_KEY]: validation.account.username,
          [THREADS_EXPIRES_KEY]: String(savedExpiry),
        };
        json(res, 200, { threads: threadsStatusBody(entries, false) });
        await ensureEnvGitignored(ctx.userCwd);
        await upsertEnvValues(ctx.userCwd, entries);
        return;
      }

      if (url.pathname === '/threads/test' && method === 'POST') {
        const guard = validateMutationRequest(req);
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        await refreshStoredThreadsToken(ctx.userCwd);
        const values = await readEnvValues(ctx.userCwd, THREADS_ENV_KEYS);
        const token = values[THREADS_TOKEN_KEY];
        if (!token) return json(res, 400, { error: 'no_token' });

        const validation = await validateThreadsConnection(token);
        if (!validation.ok) return json(res, 400, { error: validation.error });
        return json(res, 200, {
          ok: true,
          username: validation.account.username,
          userId: validation.account.userId,
        });
      }

      if (url.pathname === '/threads/disconnect' && method === 'POST') {
        const guard = validateMutationRequest(req);
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        await upsertEnvValues(ctx.userCwd, {
          [THREADS_TOKEN_KEY]: '',
          [THREADS_USER_ID_KEY]: '',
          [THREADS_USERNAME_KEY]: '',
          [THREADS_EXPIRES_KEY]: '',
        });
        return json(res, 200, { ok: true });
      }

      if (url.pathname === '/imgbb' && method === 'POST') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as { key?: unknown };
        const existing = await readEnvValues(ctx.userCwd, [IMGBB_KEY_KEY]);
        const submittedKey =
          body.key === undefined ? existing[IMGBB_KEY_KEY] : validateEnvValue(body.key);
        if (!submittedKey) return json(res, 400, { error: 'invalid_key' });

        const valid = await validateImgbbKey(submittedKey);
        if (!valid) return json(res, 400, { error: 'invalid_key' });

        const entries = { [IMGBB_KEY_KEY]: submittedKey };
        json(res, 200, { imgbb: imgbbStatusBody(entries) });
        await ensureEnvGitignored(ctx.userCwd);
        await upsertEnvValues(ctx.userCwd, entries);
        return;
      }

      if (url.pathname === '/imgbb/test' && method === 'POST') {
        const guard = validateMutationRequest(req);
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const values = await readEnvValues(ctx.userCwd, [IMGBB_KEY_KEY]);
        const key = values[IMGBB_KEY_KEY];
        if (!key) return json(res, 400, { error: 'no_key' });

        const valid = await validateImgbbKey(key);
        if (!valid) return json(res, 400, { error: 'invalid_key' });
        return json(res, 200, { ok: true });
      }

      if (url.pathname === '/imgbb/disconnect' && method === 'POST') {
        const guard = validateMutationRequest(req);
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        await upsertEnvValues(ctx.userCwd, { [IMGBB_KEY_KEY]: '' });
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
