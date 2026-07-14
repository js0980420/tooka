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

function setupRoute() {
  let handler: ((req: Readable, res: TestResponse, next: () => void) => Promise<void>) | null =
    null;
  const server = {
    middlewares: {
      use: (_path: string, routeHandler: typeof handler) => {
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

function postRequest(body: unknown) {
  return Object.assign(Readable.from([Buffer.from(JSON.stringify(body))]), {
    method: 'POST',
    url: '/instagram',
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
    );
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
      vi.fn(async () => Response.json({ id: 'different-account', username: 'other' })),
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
