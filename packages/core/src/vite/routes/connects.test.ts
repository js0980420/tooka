import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { ViteDevServer } from 'vite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readEnvValues } from '../../files/env.ts';
import { registerConnectRoutes } from './connects.ts';
import type { ApiContext } from './context.ts';

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'open-cards-connects-'));
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await fs.rm(dir, { recursive: true, force: true });
});

function setupRoute(): (req: any, res: any, next: any) => Promise<void> {
  let handler: ((req: any, res: any, next: any) => Promise<void>) | null = null;
  const server = {
    middlewares: {
      use: (_path: string, routeHandler: any) => {
        handler = routeHandler;
      },
    },
  } as unknown as ViteDevServer;
  const context = {
    userCwd: dir,
    slidesDir: 'slides',
    slidesRoot: path.join(dir, 'slides'),
    globalAssetsRoot: path.join(dir, 'assets'),
    manifestPath: path.join(dir, 'slides', '.folders.json'),
    coreVersion: '0.0.0',
  } satisfies ApiContext;
  registerConnectRoutes(server, context);
  if (!handler) throw new Error('route was not registered');
  return handler;
}

class TestResponse {
  statusCode = 200;
  headers = new Map<string, string>();
  body = '';

  setHeader(name: string, value: string) {
    this.headers.set(name, value);
  }

  end(value: string) {
    this.body = value;
  }
}

function postRequest(body: unknown, url = '/instagram') {
  return Object.assign(Readable.from([Buffer.from(JSON.stringify(body))]), {
    method: 'POST',
    url,
    headers: {
      host: 'localhost:5173',
      'content-type': 'application/json',
      'sec-fetch-site': 'same-origin',
    },
    socket: { encrypted: false },
  });
}

describe('Instagram connect routes', () => {
  it('stores valid Business System User tokens without trying to refresh them', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ id: '17841400000000000', username: 'open_cards' }),
    ) as any;
    vi.stubGlobal('fetch', fetcher);
    const handler = setupRoute();
    const response = new TestResponse();

    await handler(
      postRequest({
        token: 'EAA-permanent-token',
        userId: '17841400000000000',
        tokenSource: 'business_system_user',
      }),
      response,
      () => {},
    );

    expect(response.statusCode).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0]?.[0])).toContain(
      'https://graph.facebook.com/17841400000000000',
    );
    expect(String(fetcher.mock.calls[0]?.[0])).not.toContain('refresh_access_token');
    await expect(
      readEnvValues(dir, [
        'IG_ACCESS_TOKEN',
        'IG_USER_ID',
        'IG_USERNAME',
        'IG_TOKEN_SOURCE',
        'IG_TOKEN_EXPIRES_AT',
      ]),
    ).resolves.toEqual({
      IG_ACCESS_TOKEN: 'EAA-permanent-token',
      IG_USER_ID: '17841400000000000',
      IG_USERNAME: 'open_cards',
      IG_TOKEN_SOURCE: 'business_system_user',
    });
  });

  it('rejects a Business token that resolves to a different account', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ id: 'different-account', username: 'other' })) as any,
    );
    const handler = setupRoute();
    const response = new TestResponse();

    await handler(
      postRequest({
        token: 'EAA-permanent-token',
        userId: '17841400000000000',
        tokenSource: 'business_system_user',
      }),
      response,
      () => {},
    );

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: 'account_mismatch' });
    await expect(readEnvValues(dir, ['IG_ACCESS_TOKEN'])).resolves.toEqual({});
  });
});

describe('Facebook Page connect routes', () => {
  it('derives and stores a matching Page access token and Page ID', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        data: [
          {
            access_token: 'EAA-derived-page-token',
            id: '123456789012345',
            name: 'Open Cards',
            tasks: ['CREATE_CONTENT'],
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetcher);
    const handler = setupRoute();
    const response = new TestResponse();

    await handler(
      postRequest({ token: 'EAA-page-token', pageId: '123456789012345' }, '/facebook'),
      response,
      () => {},
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      facebook: {
        tokenMasked: '••••oken',
        pageId: '123456789012345',
        pageName: 'Open Cards',
      },
    });
    await expect(
      readEnvValues(dir, ['FB_ACCESS_TOKEN', 'FB_PAGE_ID', 'FB_PAGE_NAME']),
    ).resolves.toEqual({
      FB_ACCESS_TOKEN: 'EAA-derived-page-token',
      FB_PAGE_ID: '123456789012345',
      FB_PAGE_NAME: 'Open Cards',
    });
  });

  it('rejects Facebook credentials without a content creation task', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          data: [
            {
              access_token: 'EAA-derived-page-token',
              id: '123456789012345',
              name: 'Open Cards',
              tasks: ['ANALYZE'],
            },
          ],
        }),
      ),
    );
    const handler = setupRoute();
    const response = new TestResponse();

    await handler(
      postRequest({ token: 'EAA-user-token', pageId: '123456789012345' }, '/facebook'),
      response,
      () => {},
    );

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: 'missing_publish_permission' });
    await expect(readEnvValues(dir, ['FB_ACCESS_TOKEN'])).resolves.toEqual({});
  });

  it('rejects a token that resolves to a different Page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ data: [{ id: '999999999999999', name: 'Another Page' }] })),
    );
    const handler = setupRoute();
    const response = new TestResponse();

    await handler(
      postRequest({ token: 'EAA-page-token', pageId: '123456789012345' }, '/facebook'),
      response,
      () => {},
    );

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: 'account_mismatch' });
    await expect(readEnvValues(dir, ['FB_ACCESS_TOKEN'])).resolves.toEqual({});
  });
});

describe('Threads connect routes', () => {
  it('derives the account, refreshes the token, and stores the credentials', async () => {
    const fetcher = vi.fn(async (input: URL | string) => {
      const url = String(input);
      if (url.includes('refresh_access_token')) {
        return Response.json({ access_token: 'THAA-refreshed', expires_in: 5_184_000 });
      }
      return Response.json({ id: '9876543210', username: 'open_cards' });
    });
    vi.stubGlobal('fetch', fetcher);
    const handler = setupRoute();
    const response = new TestResponse();

    await handler(postRequest({ token: 'THAA-token' }, '/threads'), response, () => {});

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.threads).toMatchObject({
      userId: '9876543210',
      username: 'open_cards',
      needsReauth: false,
    });
    expect(body.threads.expiresAt).toBeGreaterThan(Date.now());
    await expect(
      readEnvValues(dir, ['THREADS_ACCESS_TOKEN', 'THREADS_USER_ID', 'THREADS_USERNAME']),
    ).resolves.toEqual({
      THREADS_ACCESS_TOKEN: 'THAA-refreshed',
      THREADS_USER_ID: '9876543210',
      THREADS_USERNAME: 'open_cards',
    });
  });

  it('stores the submitted token with an estimated expiry when refresh is unavailable', async () => {
    const fetcher = vi.fn(async (input: URL | string) => {
      const url = String(input);
      if (url.includes('refresh_access_token')) {
        return Response.json({ error: {} }, { status: 400 });
      }
      return Response.json({ id: '9876543210', username: 'open_cards' });
    });
    vi.stubGlobal('fetch', fetcher);
    const handler = setupRoute();
    const response = new TestResponse();

    await handler(postRequest({ token: 'THAA-token' }, '/threads'), response, () => {});

    expect(response.statusCode).toBe(200);
    const fiftyNineDays = 59 * 24 * 60 * 60 * 1000;
    expect(JSON.parse(response.body).threads.expiresAt).toBeGreaterThan(Date.now() + fiftyNineDays);
    const values = await readEnvValues(dir, ['THREADS_ACCESS_TOKEN', 'THREADS_TOKEN_EXPIRES_AT']);
    expect(values.THREADS_ACCESS_TOKEN).toBe('THAA-token');
    expect(Number(values.THREADS_TOKEN_EXPIRES_AT)).toBeGreaterThan(Date.now() + fiftyNineDays);
  });

  it('extends a stale token via refresh and validates the refreshed one', async () => {
    const fetcher = vi.fn(async (input: URL | string) => {
      const url = new URL(String(input));
      if (url.pathname.includes('refresh_access_token')) {
        return Response.json({ access_token: 'THAA-refreshed', expires_in: 5_184_000 });
      }
      if (url.searchParams.get('access_token') === 'THAA-refreshed') {
        return Response.json({ id: '9876543210', username: 'open_cards' });
      }
      return Response.json({ error: {} }, { status: 400 });
    });
    vi.stubGlobal('fetch', fetcher);
    const handler = setupRoute();
    const response = new TestResponse();

    await handler(postRequest({ token: 'THAA-stale' }, '/threads'), response, () => {});

    expect(response.statusCode).toBe(200);
    await expect(readEnvValues(dir, ['THREADS_ACCESS_TOKEN'])).resolves.toEqual({
      THREADS_ACCESS_TOKEN: 'THAA-refreshed',
    });
  });

  it('rejects invalid Threads tokens without storing them', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: {} }, { status: 400 })),
    );
    const handler = setupRoute();
    const response = new TestResponse();

    await handler(postRequest({ token: 'bad-token' }, '/threads'), response, () => {});

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: 'invalid_token' });
    await expect(readEnvValues(dir, ['THREADS_ACCESS_TOKEN'])).resolves.toEqual({});
  });
});
