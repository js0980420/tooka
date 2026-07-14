import type { ViteDevServer } from 'vite';
import { readEnvValues } from '../../files/env.ts';
import { validateMutationRequest } from '../../http/request-guard.ts';
import { type ApiContext, json, readBody } from './context.ts';

const IG_TOKEN_KEY = 'IG_ACCESS_TOKEN';
const IG_USER_ID_KEY = 'IG_USER_ID';

const FB_TOKEN_KEY = 'FB_ACCESS_TOKEN';
const FB_PAGE_ID_KEY = 'FB_PAGE_ID';

const THREADS_TOKEN_KEY = 'THREADS_ACCESS_TOKEN';
const THREADS_USER_ID_KEY = 'THREADS_USER_ID';

// Beautiful placeholder image URLs that are publicly accessible on the web.
// Since localhost images cannot be accessed by Meta servers, we use these to make
// actual publishing requests succeed for dev testing.
const MOCK_PUBLIC_IMAGES = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&q=80',
  'https://images.unsplash.com/photo-1618005198143-e528346d9a59?w=1080&q=80',
  'https://images.unsplash.com/photo-1618005135150-a15152502ef0?w=1080&q=80',
];

export function registerPublishRoutes(server: ViteDevServer, ctx: ApiContext): void {
  server.middlewares.use('/__publish', async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://local');
    const method = req.method ?? 'GET';

    try {
      if (url.pathname === '/instagram' && method === 'POST') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as { slideId: string; caption: string };
        const env = await readEnvValues(ctx.userCwd, [IG_TOKEN_KEY, IG_USER_ID_KEY]);
        const token = env[IG_TOKEN_KEY];
        const userId = env[IG_USER_ID_KEY];

        const payloadPreview = {
          caption: body.caption,
          images: MOCK_PUBLIC_IMAGES,
          targetEndpoint: `https://graph.facebook.com/v20.0/${userId}/media`,
        };

        if (!token || !userId) {
          // If no token, return mock response with payload preview
          return json(res, 200, {
            ok: true,
            mocked: true,
            platform: 'Instagram',
            payloadPreview,
            message: '憑證未設定，已模擬發布封包預覽。',
          });
        }

        try {
          // 1. Create container for each image
          const containerIds: string[] = [];
          for (const imgUrl of MOCK_PUBLIC_IMAGES) {
            const containerRes = await fetch(
              `https://graph.facebook.com/v20.0/${userId}/media?image_url=${encodeURIComponent(imgUrl)}&is_carousel_item=true&access_token=${encodeURIComponent(token)}`,
              { method: 'POST' },
            );
            if (!containerRes.ok) {
              const errText = await containerRes.text();
              throw new Error(`建立圖片節點失敗: ${containerRes.status} - ${errText}`);
            }
            const containerData = (await containerRes.json()) as { id: string };
            containerIds.push(containerData.id);
          }

          // 2. Create Carousel container
          const carouselRes = await fetch(
            `https://graph.facebook.com/v20.0/${userId}/media?media_type=CAROUSEL&caption=${encodeURIComponent(body.caption)}&children=${encodeURIComponent(containerIds.join(','))}&access_token=${encodeURIComponent(token)}`,
            { method: 'POST' },
          );
          if (!carouselRes.ok) {
            const errText = await carouselRes.text();
            throw new Error(`建立輪播圖失敗: ${carouselRes.status} - ${errText}`);
          }
          const carouselData = (await carouselRes.json()) as { id: string };
          const carouselId = carouselData.id;

          // 3. Publish Carousel
          const publishRes = await fetch(
            `https://graph.facebook.com/v20.0/${userId}/media_publish?creation_id=${carouselId}&access_token=${encodeURIComponent(token)}`,
            { method: 'POST' },
          );
          if (!publishRes.ok) {
            const errText = await publishRes.text();
            throw new Error(`發布輪播圖失敗: ${publishRes.status} - ${errText}`);
          }
          const publishData = (await publishRes.json()) as { id: string };

          return json(res, 200, {
            ok: true,
            mocked: false,
            platform: 'Instagram',
            postId: publishData.id,
            payloadPreview,
            message: '發布成功！已成功上傳至您的 Instagram 帳號。',
          });
        } catch (err) {
          console.error('[Publish Instagram] Error:', err);
          return json(res, 400, {
            error: err instanceof Error ? err.message : 'Instagram API error',
            payloadPreview,
          });
        }
      }

      if (url.pathname === '/facebook' && method === 'POST') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as { slideId: string; caption: string };
        const env = await readEnvValues(ctx.userCwd, [FB_TOKEN_KEY, FB_PAGE_ID_KEY]);
        const token = env[FB_TOKEN_KEY];
        const pageId = env[FB_PAGE_ID_KEY];

        const payloadPreview = {
          message: body.caption,
          url: MOCK_PUBLIC_IMAGES[0],
          targetEndpoint: `https://graph.facebook.com/v20.0/${pageId}/photos`,
        };

        if (!token || !pageId) {
          return json(res, 200, {
            ok: true,
            mocked: true,
            platform: 'Facebook',
            payloadPreview,
            message: '憑證未設定，已模擬發布封包預覽。',
          });
        }

        try {
          const response = await fetch(
            `https://graph.facebook.com/v20.0/${pageId}/photos?url=${encodeURIComponent(MOCK_PUBLIC_IMAGES[0])}&message=${encodeURIComponent(body.caption)}&access_token=${encodeURIComponent(token)}`,
            { method: 'POST' },
          );
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Facebook API 失敗: ${response.status} - ${errText}`);
          }
          const data = (await response.json()) as { id: string };
          return json(res, 200, {
            ok: true,
            mocked: false,
            platform: 'Facebook',
            postId: data.id,
            payloadPreview,
            message: '發布成功！已成功發佈至您的 Facebook 粉絲專頁。',
          });
        } catch (err) {
          console.error('[Publish Facebook] Error:', err);
          return json(res, 400, {
            error: err instanceof Error ? err.message : 'Facebook API error',
            payloadPreview,
          });
        }
      }

      if (url.pathname === '/threads' && method === 'POST') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as { slideId: string; caption: string };
        const env = await readEnvValues(ctx.userCwd, [THREADS_TOKEN_KEY, THREADS_USER_ID_KEY]);
        const token = env[THREADS_TOKEN_KEY];
        const userId = env[THREADS_USER_ID_KEY];

        const payloadPreview = {
          media_type: 'IMAGE',
          image_url: MOCK_PUBLIC_IMAGES[0],
          text: body.caption,
          targetEndpoint: `https://graph.threads.net/v1.0/${userId}/threads`,
        };

        if (!token || !userId) {
          return json(res, 200, {
            ok: true,
            mocked: true,
            platform: 'Threads',
            payloadPreview,
            message: '憑證未設定，已模擬發布封包預覽。',
          });
        }

        try {
          // 1. Create Threads container
          const createRes = await fetch(
            `https://graph.threads.net/v1.0/${userId}/threads?media_type=IMAGE&image_url=${encodeURIComponent(MOCK_PUBLIC_IMAGES[0])}&text=${encodeURIComponent(body.caption)}&access_token=${encodeURIComponent(token)}`,
            { method: 'POST' },
          );
          if (!createRes.ok) {
            const errText = await createRes.text();
            throw new Error(`建立 Threads 貼文失敗: ${createRes.status} - ${errText}`);
          }
          const createData = (await createRes.json()) as { id: string };

          // 2. Publish Threads post
          const publishRes = await fetch(
            `https://graph.threads.net/v1.0/${userId}/threads_publish?creation_id=${createData.id}&access_token=${encodeURIComponent(token)}`,
            { method: 'POST' },
          );
          if (!publishRes.ok) {
            const errText = await publishRes.text();
            throw new Error(`發布 Threads 貼文失敗: ${publishRes.status} - ${errText}`);
          }
          const publishData = (await publishRes.json()) as { id: string };

          return json(res, 200, {
            ok: true,
            mocked: false,
            platform: 'Threads',
            postId: publishData.id,
            payloadPreview,
            message: '發布成功！已成功上傳至您的 Threads 帳號。',
          });
        } catch (err) {
          console.error('[Publish Threads] Error:', err);
          return json(res, 400, {
            error: err instanceof Error ? err.message : 'Threads API error',
            payloadPreview,
          });
        }
      }

      next();
    } catch (e) {
      json(res, 500, { error: e instanceof Error ? e.message : 'internal error' });
    }
  });
}
