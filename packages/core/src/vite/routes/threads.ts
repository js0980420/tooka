export type ThreadsAccount = {
  userId: string;
  username: string;
};

export type ThreadsValidationError = 'invalid_response' | 'invalid_token';

export type ThreadsValidationResult =
  | { ok: true; account: ThreadsAccount }
  | { ok: false; error: ThreadsValidationError };

export type ThreadsRefreshResult = {
  token: string;
  expiresAt: number;
};

type ThreadsProfileResponse = {
  id?: unknown;
  username?: unknown;
};

type RefreshResponse = {
  access_token?: unknown;
  expires_in?: unknown;
};

async function getJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export async function validateThreadsConnection(
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<ThreadsValidationResult> {
  const endpoint = new URL('https://graph.threads.net/v1.0/me');
  endpoint.searchParams.set('fields', 'id,username');
  endpoint.searchParams.set('access_token', token);

  let response: Response;
  try {
    response = await fetcher(endpoint);
  } catch (err) {
    console.error('[validateThreadsConnection] Fetch failed:', err);
    return { ok: false, error: 'invalid_token' };
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('[validateThreadsConnection] Non-ok status:', response.status, text);
    return { ok: false, error: 'invalid_token' };
  }

  const body = (await getJson(response)) as ThreadsProfileResponse | null;
  const userId = stringValue(body?.id);
  const username = stringValue(body?.username);
  if (!userId || !username) {
    console.error('[validateThreadsConnection] Invalid response body structure:', body);
    return { ok: false, error: 'invalid_response' };
  }
  return { ok: true, account: { userId, username } };
}

export async function refreshThreadsToken(
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<ThreadsRefreshResult | null> {
  const endpoint = new URL('https://graph.threads.net/refresh_access_token');
  endpoint.searchParams.set('grant_type', 'th_refresh_token');
  endpoint.searchParams.set('access_token', token);

  let response: Response;
  try {
    response = await fetcher(endpoint);
  } catch {
    return null;
  }
  if (!response.ok) return null;

  const body = (await getJson(response)) as RefreshResponse | null;
  const refreshedToken = stringValue(body?.access_token);
  const expiresIn =
    typeof body?.expires_in === 'number' && Number.isFinite(body.expires_in)
      ? body.expires_in
      : null;
  if (!refreshedToken || !expiresIn || expiresIn <= 0) return null;
  return {
    token: refreshedToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}
