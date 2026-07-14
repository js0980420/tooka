import { describe, expect, it, vi } from 'vitest';
import { refreshInstagramLoginToken, validateInstagramConnection } from './instagram.ts';

describe('validateInstagramConnection', () => {
  it('validates Instagram Login tokens and derives the user ID', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ user_id: '17841400000000000', username: 'open_cards' }),
    ) as any;

    await expect(
      validateInstagramConnection('instagram_login', 'IGAA-token', undefined, fetcher),
    ).resolves.toEqual({
      ok: true,
      account: { userId: '17841400000000000', username: 'open_cards' },
    });

    const url = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe('https://graph.instagram.com/me');
    expect(url.searchParams.get('fields')).toBe('user_id,username');
    expect(url.searchParams.get('access_token')).toBe('IGAA-token');
  });

  it('validates Business System User tokens against the supplied IG user ID', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ id: '17841400000000000', username: 'open_cards' }),
    ) as any;

    await expect(
      validateInstagramConnection(
        'business_system_user',
        'EAA-token',
        '17841400000000000',
        fetcher,
      ),
    ).resolves.toEqual({
      ok: true,
      account: { userId: '17841400000000000', username: 'open_cards' },
    });

    const url = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe('https://graph.facebook.com/17841400000000000');
  });

  it('rejects account mismatches', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ id: 'different-account', username: 'open_cards' }),
    ) as any;

    await expect(
      validateInstagramConnection(
        'business_system_user',
        'EAA-token',
        '17841400000000000',
        fetcher,
      ),
    ).resolves.toEqual({ ok: false, error: 'account_mismatch' });
  });

  it('does not call Meta when a Business System User ID is missing', async () => {
    const fetcher = vi.fn() as any;

    await expect(
      validateInstagramConnection('business_system_user', 'EAA-token', undefined, fetcher),
    ).resolves.toEqual({ ok: false, error: 'missing_user_id' });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('refreshInstagramLoginToken', () => {
  it('refreshes Instagram Login tokens and records their expiry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-14T00:00:00Z'));
    const fetcher = vi.fn(async () =>
      Response.json({ access_token: 'IGAA-refreshed', expires_in: 5_184_000 }),
    ) as any;

    await expect(refreshInstagramLoginToken('IGAA-token', fetcher)).resolves.toEqual({
      token: 'IGAA-refreshed',
      expiresAt: Date.now() + 5_184_000_000,
    });

    vi.useRealTimers();
  });

  it('returns null when a token type cannot be refreshed', async () => {
    const fetcher = vi.fn(async () => Response.json({ error: {} }, { status: 400 })) as any;
    await expect(refreshInstagramLoginToken('EAA-token', fetcher)).resolves.toBeNull();
  });
});
