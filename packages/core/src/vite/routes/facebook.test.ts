import { describe, expect, it, vi } from 'vitest';
import { publishFacebookPagePost, validateFacebookPageConnection } from './facebook.ts';

const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('validateFacebookPageConnection', () => {
  it('derives a Page token from a User token with content access', async () => {
    const fetcher = vi.fn(async (_input: unknown) =>
      Response.json({
        data: [
          {
            access_token: 'derived-page-token',
            id: '123456789012345',
            name: 'Open Cards',
            tasks: ['CREATE_CONTENT', 'MODERATE'],
          },
        ],
      }),
    );

    await expect(
      validateFacebookPageConnection('123456789012345', 'page-token', fetcher as typeof fetch),
    ).resolves.toEqual({
      ok: true,
      page: {
        accessToken: 'derived-page-token',
        pageId: '123456789012345',
        pageName: 'Open Cards',
      },
    });
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('https://graph.facebook.com/me/accounts');
  });

  it('keeps a direct Page token when Meta does not return a replacement', async () => {
    const fetcher = vi.fn(async (input: unknown) => {
      const endpoint = new URL(String(input));
      if (endpoint.pathname === '/me/accounts') return Response.json({ data: [] });
      return Response.json({ id: '123456789012345', name: 'Open Cards' });
    });

    await expect(
      validateFacebookPageConnection('123456789012345', 'page-token', fetcher as typeof fetch),
    ).resolves.toEqual({
      ok: true,
      page: {
        accessToken: 'page-token',
        pageId: '123456789012345',
        pageName: 'Open Cards',
      },
    });
  });

  it('rejects accounts without a content creation task', async () => {
    const fetcher = vi.fn(async (_input: unknown) =>
      Response.json({
        data: [
          {
            access_token: 'derived-page-token',
            id: '123456789012345',
            name: 'Open Cards',
            tasks: ['ANALYZE', 'ADVERTISE'],
          },
        ],
      }),
    );

    await expect(
      validateFacebookPageConnection('123456789012345', 'user-token', fetcher as typeof fetch),
    ).resolves.toEqual({ ok: false, error: 'missing_publish_permission' });
  });

  it('rejects a token that resolves to a different Page', async () => {
    const fetcher = vi.fn(async (_input: unknown) =>
      Response.json({ data: [{ id: '999999999999999', name: 'Another Page' }] }),
    );

    await expect(
      validateFacebookPageConnection('123456789012345', 'page-token', fetcher as typeof fetch),
    ).resolves.toEqual({ ok: false, error: 'account_mismatch' });
  });

  it('rejects an invalid token', async () => {
    const fetcher = vi.fn(async (_input: unknown) => Response.json({ error: {} }, { status: 400 }));

    await expect(
      validateFacebookPageConnection('123456789012345', 'invalid-token', fetcher as typeof fetch),
    ).resolves.toEqual({ ok: false, error: 'invalid_token' });
  });
});

describe('publishFacebookPagePost', () => {
  it('uploads a single image as raw binary (no hosted url) and creates a photo post', async () => {
    const fetcher = vi.fn(async (input: unknown, init?: RequestInit) => {
      const endpoint = new URL(String(input));
      expect(endpoint.pathname).toBe('/v20.0/123456789012345/photos');
      expect(endpoint.searchParams.get('url')).toBeNull();
      expect(endpoint.searchParams.get('message')).toBe('hello');
      expect(init?.body).toBeInstanceOf(FormData);
      expect((init?.body as FormData).get('source')).toBeInstanceOf(Blob);
      return Response.json({ id: 'photo1', post_id: '123456789012345_999' });
    });

    await expect(
      publishFacebookPagePost(
        '123456789012345',
        'page-token',
        [PNG_1PX],
        'hello',
        fetcher as typeof fetch,
      ),
    ).resolves.toEqual({ postId: '123456789012345_999' });
  });

  it('uploads each image unpublished then attaches them all to one feed post', async () => {
    let photoCalls = 0;
    const fetcher = vi.fn(async (input: unknown) => {
      const endpoint = new URL(String(input));
      if (endpoint.pathname === '/v20.0/123456789012345/photos') {
        photoCalls++;
        expect(endpoint.searchParams.get('published')).toBe('false');
        return Response.json({ id: `photo${photoCalls}` });
      }
      if (endpoint.pathname === '/v20.0/123456789012345/feed') {
        expect(endpoint.searchParams.get('attached_media[0]')).toContain('photo1');
        expect(endpoint.searchParams.get('attached_media[1]')).toContain('photo2');
        expect(endpoint.searchParams.get('message')).toBe('caption');
        return Response.json({ id: 'feedpost1' });
      }
      throw new Error(`unexpected endpoint: ${endpoint.pathname}`);
    });

    await expect(
      publishFacebookPagePost(
        '123456789012345',
        'page-token',
        [PNG_1PX, PNG_1PX],
        'caption',
        fetcher as typeof fetch,
      ),
    ).resolves.toEqual({ postId: 'feedpost1' });
  });

  it('throws with the response body when Facebook rejects the upload', async () => {
    const fetcher = vi.fn(async () => new Response('bad request', { status: 400 }));

    await expect(
      publishFacebookPagePost(
        '123456789012345',
        'page-token',
        [PNG_1PX],
        'caption',
        fetcher as typeof fetch,
      ),
    ).rejects.toThrow('400');
  });

  it('throws when no images are provided', async () => {
    await expect(
      publishFacebookPagePost('123456789012345', 'page-token', [], 'caption'),
    ).rejects.toThrow();
  });
});
