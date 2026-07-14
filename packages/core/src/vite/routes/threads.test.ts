import { describe, expect, it, vi } from 'vitest';
import { refreshThreadsToken, validateThreadsConnection } from './threads.ts';

describe('validateThreadsConnection', () => {
  it('validates Threads tokens and derives the account', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) =>
      Response.json({ id: '9876543210', username: 'open_cards' }),
    );

    await expect(validateThreadsConnection('THAA-token', fetcher)).resolves.toEqual({
      ok: true,
      account: { userId: '9876543210', username: 'open_cards' },
    });

    const url = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe('https://graph.threads.net/v1.0/me');
    expect(url.searchParams.get('fields')).toBe('id,username');
    expect(url.searchParams.get('access_token')).toBe('THAA-token');
  });

  it('rejects invalid tokens', async () => {
    const fetcher = vi.fn(async () => Response.json({ error: {} }, { status: 400 }));

    await expect(validateThreadsConnection('bad-token', fetcher)).resolves.toEqual({
      ok: false,
      error: 'invalid_token',
    });
  });

  it('rejects responses without an account', async () => {
    const fetcher = vi.fn(async () => Response.json({ id: '9876543210' }));

    await expect(validateThreadsConnection('THAA-token', fetcher)).resolves.toEqual({
      ok: false,
      error: 'invalid_response',
    });
  });
});

describe('refreshThreadsToken', () => {
  it('refreshes long-lived Threads tokens and records their expiry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-14T00:00:00Z'));
    const fetcher = vi.fn(async (_input: RequestInfo | URL) =>
      Response.json({ access_token: 'THAA-refreshed', expires_in: 5_184_000 }),
    );

    await expect(refreshThreadsToken('THAA-token', fetcher)).resolves.toEqual({
      token: 'THAA-refreshed',
      expiresAt: Date.now() + 5_184_000_000,
    });

    const url = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe('https://graph.threads.net/refresh_access_token');
    expect(url.searchParams.get('grant_type')).toBe('th_refresh_token');

    vi.useRealTimers();
  });

  it('returns null when a token cannot be refreshed', async () => {
    const fetcher = vi.fn(async () => Response.json({ error: {} }, { status: 400 }));
    await expect(refreshThreadsToken('THAA-token', fetcher)).resolves.toBeNull();
  });
});
