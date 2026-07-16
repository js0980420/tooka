import type { ViteDevServer } from 'vite';
import { readEnvValues } from '../../files/env.ts';
import { validateMutationRequest } from '../../http/request-guard.ts';
import {
  hasExternalLink,
  validateInstagramHashtags,
  validateThreadsTopicTag,
} from '../../publishing/copy.ts';
import { type ApiContext, json, readBody } from './context.ts';
import { publishFacebookPagePost } from './facebook.ts';
import { uploadImageToImgbb } from './imgbb.ts';

const IG_TOKEN_KEY = 'IG_ACCESS_TOKEN';
const IG_USER_ID_KEY = 'IG_USER_ID';

const FB_TOKEN_KEY = 'FB_ACCESS_TOKEN';
const FB_PAGE_ID_KEY = 'FB_PAGE_ID';

const THREADS_TOKEN_KEY = 'THREADS_ACCESS_TOKEN';
const THREADS_USER_ID_KEY = 'THREADS_USER_ID';

const IMGBB_API_KEY_KEY = 'IMGBB_API_KEY';

export function registerPublishRoutes(server: ViteDevServer, ctx: ApiContext): void {
  server.middlewares.use('/__publish', async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://local');
    const method = req.method ?? 'GET';

    try {
      if (url.pathname === '/instagram' && method === 'POST') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as {
          slideId: string;
          caption: string;
          images: string[];
        };
        if (typeof body.caption !== 'string' || !body.caption.trim()) {
          return json(res, 400, { error: 'caption_required' });
        }
        if (hasExternalLink(body.caption)) {
          return json(res, 400, { error: 'external_links_not_allowed' });
        }
        const hashtags = body.caption.match(/#[\p{L}\p{N}_]+/gu) ?? [];
        if (!validateInstagramHashtags(hashtags)) {
          return json(res, 400, { error: 'instagram_requires_five_hashtags' });
        }
        if (!Array.isArray(body.images) || body.images.length === 0 || body.images.length > 10) {
          return json(res, 400, { error: 'instagram_requires_one_to_ten_images' });
        }
        const env = await readEnvValues(ctx.userCwd, [IG_TOKEN_KEY, IG_USER_ID_KEY]);
        const token = env[IG_TOKEN_KEY];
        const userId = env[IG_USER_ID_KEY];

        if (!token || !userId) {
          return json(res, 200, {
            ok: true,
            mocked: true,
            platform: 'Instagram',
            payloadPreview: {
              caption: body.caption,
              imageCount: body.images?.length ?? 0,
              targetEndpoint: `https://graph.facebook.com/v20.0/{user-id}/media`,
            },
            message: 'IG 憑證未設定，已模擬發布封包預覽。',
          });
        }

        try {
          const imageUrls = await resolveImageUrls(body.images, ctx.userCwd);

          const containerIds: string[] = [];
          for (const imgUrl of imageUrls) {
            const containerRes = await fetch(
              `https://graph.facebook.com/v20.0/${userId}/media?image_url=${encodeURIComponent(imgUrl)}&is_carousel_item=true&access_token=${encodeURIComponent(token)}`,
              { method: 'POST' },
            );
            if (!containerRes.ok) {
              const errText = await containerRes.text();
              throw new Error(`IG container creation failed: ${containerRes.status} - ${errText}`);
            }
            const containerData = (await containerRes.json()) as { id: string };
            containerIds.push(containerData.id);
          }

          const carouselRes = await fetch(
            `https://graph.facebook.com/v20.0/${userId}/media?media_type=CAROUSEL&caption=${encodeURIComponent(body.caption)}&children=${encodeURIComponent(containerIds.join(','))}&access_token=${encodeURIComponent(token)}`,
            { method: 'POST' },
          );
          if (!carouselRes.ok) {
            const errText = await carouselRes.text();
            throw new Error(`IG carousel creation failed: ${carouselRes.status} - ${errText}`);
          }
          const carouselData = (await carouselRes.json()) as { id: string };

          const publishRes = await fetch(
            `https://graph.facebook.com/v20.0/${userId}/media_publish?creation_id=${carouselData.id}&access_token=${encodeURIComponent(token)}`,
            { method: 'POST' },
          );
          if (!publishRes.ok) {
            const errText = await publishRes.text();
            throw new Error(`IG publish failed: ${publishRes.status} - ${errText}`);
          }
          const publishData = (await publishRes.json()) as { id: string };

          return json(res, 200, {
            ok: true,
            mocked: false,
            platform: 'Instagram',
            postId: publishData.id,
            message: `Instagram Carousel 發布成功！共 ${imageUrls.length} 張圖卡。`,
          });
        } catch (err) {
          console.error('[Publish Instagram] Error:', err);
          return json(res, 400, {
            error: err instanceof Error ? err.message : 'Instagram API error',
          });
        }
      }

      if (url.pathname === '/facebook' && method === 'POST') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as {
          slideId: string;
          caption: string;
          images: string[];
        };
        if (typeof body.caption !== 'string' || !body.caption.trim()) {
          return json(res, 400, { error: 'caption_required' });
        }
        if (hasExternalLink(body.caption)) {
          return json(res, 400, { error: 'external_links_not_allowed' });
        }
        const env = await readEnvValues(ctx.userCwd, [FB_TOKEN_KEY, FB_PAGE_ID_KEY]);
        const token = env[FB_TOKEN_KEY];
        const pageId = env[FB_PAGE_ID_KEY];

        if (!token || !pageId) {
          return json(res, 200, {
            ok: true,
            mocked: true,
            platform: 'Facebook',
            payloadPreview: {
              message: body.caption,
              imageCount: body.images?.length ?? 0,
              targetEndpoint: `https://graph.facebook.com/v20.0/{page-id}/photos`,
            },
            message: 'FB 憑證未設定，已模擬發布封包預覽。',
          });
        }

        try {
          const { postId } = await publishFacebookPagePost(
            pageId,
            token,
            body.images,
            body.caption,
          );
          return json(res, 200, {
            ok: true,
            mocked: false,
            platform: 'Facebook',
            postId,
            message:
              body.images.length > 1
                ? `Facebook 粉專多圖發布成功！共 ${body.images.length} 張圖卡。`
                : 'Facebook 粉專單張圖片發布成功！',
          });
        } catch (err) {
          console.error('[Publish Facebook] Error:', err);
          return json(res, 400, {
            error: err instanceof Error ? err.message : 'Facebook API error',
          });
        }
      }

      if (url.pathname === '/threads' && method === 'POST') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as {
          slideId: string;
          caption: string;
          images: string[];
          topicTag?: string;
        };
        const topicTag = typeof body.topicTag === 'string' ? body.topicTag.trim() : '';
        if (typeof body.caption !== 'string' || !body.caption.trim()) {
          return json(res, 400, { error: 'caption_required' });
        }
        if (hasExternalLink(body.caption)) {
          return json(res, 400, { error: 'external_links_not_allowed' });
        }
        if (!validateThreadsTopicTag(topicTag)) {
          return json(res, 400, { error: 'invalid_topic_tag' });
        }
        const topicTagParam = `&topic_tag=${encodeURIComponent(topicTag)}`;
        const env = await readEnvValues(ctx.userCwd, [THREADS_TOKEN_KEY, THREADS_USER_ID_KEY]);
        const token = env[THREADS_TOKEN_KEY];
        const userId = env[THREADS_USER_ID_KEY];

        if (!token || !userId) {
          return json(res, 200, {
            ok: true,
            mocked: true,
            platform: 'Threads',
            payloadPreview: {
              media_type: 'IMAGE',
              text: body.caption,
              topic_tag: topicTag || undefined,
              imageCount: body.images?.length ?? 0,
              targetEndpoint: `https://graph.threads.net/v1.0/{user-id}/threads`,
            },
            message: 'Threads 憑證未設定，已模擬發布封包預覽。',
          });
        }

        try {
          const imageUrls = await resolveImageUrls(body.images, ctx.userCwd);

          if (imageUrls.length === 1) {
            const createRes = await fetch(
              `https://graph.threads.net/v1.0/${userId}/threads?media_type=IMAGE&image_url=${encodeURIComponent(imageUrls[0])}&text=${encodeURIComponent(body.caption)}${topicTagParam}&access_token=${encodeURIComponent(token)}`,
              { method: 'POST' },
            );
            if (!createRes.ok) {
              const errText = await createRes.text();
              throw new Error(`Threads container failed: ${createRes.status} - ${errText}`);
            }
            const createData = (await createRes.json()) as { id: string };

            const publishRes = await fetch(
              `https://graph.threads.net/v1.0/${userId}/threads_publish?creation_id=${createData.id}&access_token=${encodeURIComponent(token)}`,
              { method: 'POST' },
            );
            if (!publishRes.ok) {
              const errText = await publishRes.text();
              throw new Error(`Threads publish failed: ${publishRes.status} - ${errText}`);
            }
            const publishData = (await publishRes.json()) as { id: string };
            return json(res, 200, {
              ok: true,
              mocked: false,
              platform: 'Threads',
              postId: publishData.id,
              message: 'Threads 單圖貼文發布成功！',
            });
          }

          const childIds: string[] = [];
          for (const imgUrl of imageUrls) {
            const childRes = await fetch(
              `https://graph.threads.net/v1.0/${userId}/threads?media_type=IMAGE&image_url=${encodeURIComponent(imgUrl)}&is_carousel_item=true&access_token=${encodeURIComponent(token)}`,
              { method: 'POST' },
            );
            if (!childRes.ok) {
              const errText = await childRes.text();
              throw new Error(`Threads carousel item failed: ${childRes.status} - ${errText}`);
            }
            const childData = (await childRes.json()) as { id: string };
            childIds.push(childData.id);
          }

          const carouselRes = await fetch(
            `https://graph.threads.net/v1.0/${userId}/threads?media_type=CAROUSEL&children=${encodeURIComponent(childIds.join(','))}&text=${encodeURIComponent(body.caption)}${topicTagParam}&access_token=${encodeURIComponent(token)}`,
            { method: 'POST' },
          );
          if (!carouselRes.ok) {
            const errText = await carouselRes.text();
            throw new Error(`Threads carousel creation failed: ${carouselRes.status} - ${errText}`);
          }
          const carouselData = (await carouselRes.json()) as { id: string };

          const publishRes = await fetch(
            `https://graph.threads.net/v1.0/${userId}/threads_publish?creation_id=${carouselData.id}&access_token=${encodeURIComponent(token)}`,
            { method: 'POST' },
          );
          if (!publishRes.ok) {
            const errText = await publishRes.text();
            throw new Error(`Threads carousel publish failed: ${publishRes.status} - ${errText}`);
          }
          const publishData = (await publishRes.json()) as { id: string };

          return json(res, 200, {
            ok: true,
            mocked: false,
            platform: 'Threads',
            postId: publishData.id,
            message: `Threads Carousel 發布成功！共 ${imageUrls.length} 張圖卡。`,
          });
        } catch (err) {
          console.error('[Publish Threads] Error:', err);
          return json(res, 400, {
            error: err instanceof Error ? err.message : 'Threads API error',
          });
        }
      }

      next();
    } catch (e) {
      json(res, 500, { error: e instanceof Error ? e.message : 'internal error' });
    }
  });
}

async function resolveImageUrls(
  base64Images: string[] | undefined,
  userCwd: string,
): Promise<string[]> {
  if (!base64Images || base64Images.length === 0) {
    throw new Error('未收到圖卡圖片。請確認前端有正確渲染並擷取圖卡 PNG。');
  }

  const env = await readEnvValues(userCwd, [IMGBB_API_KEY_KEY]);
  const apiKey = env[IMGBB_API_KEY_KEY];
  if (!apiKey) {
    throw new Error('尚未連接 Imgbb 圖床，請到 Connects 頁面設定 API Key。');
  }

  const urls: string[] = [];
  for (const img of base64Images) {
    urls.push(await uploadImageToImgbb(apiKey, img));
  }
  return urls;
}
