import { describe, expect, it, vi } from 'vitest';
import { uploadImageToImgbb } from './imgbb.ts';

const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const PNG_1PX_RAW_BASE64 = PNG_1PX.replace(/^data:image\/\w+;base64,/, '');

describe('uploadImageToImgbb', () => {
  it('uploads the decoded image and returns the hosted url', async () => {
    const fetcher = vi.fn(async (input: unknown, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.imgbb.com/1/upload');
      expect(init?.method).toBe('POST');
      const form = init?.body as FormData;
      expect(form.get('key')).toBe('imgbb-key');
      expect(form.get('image')).toBe(PNG_1PX_RAW_BASE64);

      return Response.json({
        success: true,
        status: 200,
        data: { url: 'https://i.ibb.co/abc123/card.png' },
      });
    });

    await expect(uploadImageToImgbb('imgbb-key', PNG_1PX, fetcher as typeof fetch)).resolves.toBe(
      'https://i.ibb.co/abc123/card.png',
    );
  });

  it('throws when imgbb rejects the request', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { message: 'Invalid API v1 key.' } }), {
          status: 400,
        }),
    );

    await expect(uploadImageToImgbb('bad-key', PNG_1PX, fetcher as typeof fetch)).rejects.toThrow(
      '400',
    );
  });

  it('throws when imgbb reports success:false without an error status', async () => {
    const fetcher = vi.fn(async () => Response.json({ success: false }));

    await expect(
      uploadImageToImgbb('imgbb-key', PNG_1PX, fetcher as typeof fetch),
    ).rejects.toThrow();
  });
});
