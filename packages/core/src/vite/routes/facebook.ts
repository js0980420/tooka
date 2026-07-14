export type FacebookPage = {
  accessToken: string;
  pageId: string;
  pageName: string;
};

export type FacebookValidationResult =
  | { ok: true; page: FacebookPage }
  | {
      ok: false;
      error:
        | 'account_mismatch'
        | 'invalid_response'
        | 'invalid_token'
        | 'missing_publish_permission';
    };

type FacebookPageResponse = {
  access_token?: unknown;
  id?: unknown;
  name?: unknown;
  tasks?: unknown;
};

type FacebookAccountsResponse = {
  data?: unknown;
};

const CONTENT_TASKS = new Set([
  'CREATE_CONTENT',
  'MANAGE',
  'PROFILE_PLUS_CREATE_CONTENT',
  'PROFILE_PLUS_FULL_CONTROL',
  'PROFILE_PLUS_MANAGE',
]);

async function requestJson(
  endpoint: URL,
  fetcher: typeof fetch,
): Promise<{ ok: true; body: unknown } | { ok: false }> {
  let response: Response;
  try {
    response = await fetcher(endpoint);
  } catch {
    return { ok: false };
  }
  if (!response.ok) return { ok: false };

  try {
    return { ok: true, body: await response.json() };
  } catch {
    return { ok: false };
  }
}

function pageFromResponse(
  value: unknown,
  expectedPageId: string,
  fallbackToken: string,
  checkTasks: boolean,
): FacebookValidationResult {
  if (!value || typeof value !== 'object') return { ok: false, error: 'invalid_response' };
  const body = value as FacebookPageResponse;
  if (typeof body.id !== 'string' || typeof body.name !== 'string') {
    return { ok: false, error: 'invalid_response' };
  }
  if (body.id !== expectedPageId) return { ok: false, error: 'account_mismatch' };

  if (checkTasks && Array.isArray(body.tasks)) {
    const hasContentTask = body.tasks.some(
      (task) => typeof task === 'string' && CONTENT_TASKS.has(task),
    );
    if (!hasContentTask) return { ok: false, error: 'missing_publish_permission' };
  }

  const accessToken = typeof body.access_token === 'string' ? body.access_token : fallbackToken;
  return {
    ok: true,
    page: { accessToken, pageId: body.id, pageName: body.name },
  };
}

function base64ImageToBlob(base64Image: string): Blob {
  const stripped = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const binary = Buffer.from(stripped, 'base64');
  return new Blob([binary], { type: 'image/png' });
}

async function uploadFacebookPhoto(
  endpoint: URL,
  image: string,
  fetcher: typeof fetch,
): Promise<{ id: string; post_id?: string }> {
  const form = new FormData();
  form.append('source', base64ImageToBlob(image), 'card.png');

  const res = await fetcher(endpoint, { method: 'POST', body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Facebook photo upload failed: ${res.status} - ${text}`);
  }
  return (await res.json()) as { id: string; post_id?: string };
}

export async function publishFacebookPagePost(
  pageId: string,
  token: string,
  images: string[],
  caption: string,
  fetcher: typeof fetch = fetch,
): Promise<{ postId: string }> {
  if (images.length === 0) {
    throw new Error('未收到圖卡圖片。請確認前端有正確渲染並擷取圖卡 PNG。');
  }

  if (images.length === 1) {
    const endpoint = new URL(`https://graph.facebook.com/v20.0/${pageId}/photos`);
    endpoint.searchParams.set('message', caption);
    endpoint.searchParams.set('access_token', token);
    const data = await uploadFacebookPhoto(endpoint, images[0], fetcher);
    return { postId: data.post_id ?? data.id };
  }

  const photoIds: string[] = [];
  for (const image of images) {
    const endpoint = new URL(`https://graph.facebook.com/v20.0/${pageId}/photos`);
    endpoint.searchParams.set('published', 'false');
    endpoint.searchParams.set('access_token', token);
    const data = await uploadFacebookPhoto(endpoint, image, fetcher);
    photoIds.push(data.id);
  }

  const feedEndpoint = new URL(`https://graph.facebook.com/v20.0/${pageId}/feed`);
  feedEndpoint.searchParams.set('message', caption);
  photoIds.forEach((id, i) => {
    feedEndpoint.searchParams.set(`attached_media[${i}]`, JSON.stringify({ media_fbid: id }));
  });
  feedEndpoint.searchParams.set('access_token', token);

  const feedRes = await fetcher(feedEndpoint, { method: 'POST' });
  if (!feedRes.ok) {
    const errText = await feedRes.text();
    throw new Error(`FB multi-photo post failed: ${feedRes.status} - ${errText}`);
  }
  const feedData = (await feedRes.json()) as { id: string };
  return { postId: feedData.id };
}

export async function validateFacebookPageConnection(
  pageId: string,
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<FacebookValidationResult> {
  const accountsEndpoint = new URL('https://graph.facebook.com/me/accounts');
  accountsEndpoint.searchParams.set('fields', 'id,name,access_token,tasks');
  accountsEndpoint.searchParams.set('access_token', token);
  const accountsResponse = await requestJson(accountsEndpoint, fetcher);

  if (accountsResponse.ok && accountsResponse.body && typeof accountsResponse.body === 'object') {
    const data = (accountsResponse.body as FacebookAccountsResponse).data;
    if (Array.isArray(data) && data.length > 0) {
      const matchingPage = data.find(
        (item) => item && typeof item === 'object' && (item as FacebookPageResponse).id === pageId,
      );
      if (!matchingPage) return { ok: false, error: 'account_mismatch' };
      return pageFromResponse(matchingPage, pageId, token, true);
    }
  }

  const specificEndpoint = new URL(`https://graph.facebook.com/${encodeURIComponent(pageId)}`);
  specificEndpoint.searchParams.set('fields', 'id,name,access_token');
  specificEndpoint.searchParams.set('access_token', token);
  const specificResponse = await requestJson(specificEndpoint, fetcher);
  if (specificResponse.ok) {
    return pageFromResponse(specificResponse.body, pageId, token, false);
  }

  const directEndpoint = new URL(`https://graph.facebook.com/${encodeURIComponent(pageId)}`);
  directEndpoint.searchParams.set('fields', 'id,name');
  directEndpoint.searchParams.set('access_token', token);
  const directResponse = await requestJson(directEndpoint, fetcher);
  if (!directResponse.ok) return { ok: false, error: 'invalid_token' };
  return pageFromResponse(directResponse.body, pageId, token, false);
}
