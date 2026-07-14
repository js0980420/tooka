export const INSTAGRAM_TOKEN_SOURCES = ['instagram_login', 'business_system_user'] as const;

export type InstagramTokenSource = (typeof INSTAGRAM_TOKEN_SOURCES)[number];

export type InstagramAccount = {
  userId: string;
  username: string;
};

export type InstagramValidationError =
  | 'account_mismatch'
  | 'invalid_response'
  | 'invalid_token'
  | 'missing_user_id';

export type InstagramValidationResult =
  | { ok: true; account: InstagramAccount }
  | { ok: false; error: InstagramValidationError };

export type InstagramRefreshResult = {
  token: string;
  expiresAt: number;
};

type InstagramLoginAccountResponse = {
  id?: unknown;
  user_id?: unknown;
  username?: unknown;
  data?: Array<{ id?: unknown; user_id?: unknown; username?: unknown }>;
};

type BusinessAccountResponse = {
  id?: unknown;
  username?: unknown;
};

type RefreshResponse = {
  access_token?: unknown;
  expires_in?: unknown;
};

export function isInstagramTokenSource(value: unknown): value is InstagramTokenSource {
  return (
    typeof value === 'string' && INSTAGRAM_TOKEN_SOURCES.includes(value as InstagramTokenSource)
  );
}

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

function accountFromInstagramLogin(value: unknown): InstagramAccount | null {
  if (!value || typeof value !== 'object') return null;
  const response = value as InstagramLoginAccountResponse;
  const account = response.data?.[0] ?? response;
  const userId = stringValue(account.user_id) ?? stringValue(account.id);
  const username = stringValue(account.username);
  return userId && username ? { userId, username } : null;
}

function accountFromBusiness(value: unknown): InstagramAccount | null {
  if (!value || typeof value !== 'object') return null;
  const response = value as BusinessAccountResponse;
  const userId = stringValue(response.id);
  const username = stringValue(response.username);
  return userId && username ? { userId, username } : null;
}

export async function validateInstagramConnection(
  source: InstagramTokenSource,
  token: string,
  expectedUserId?: string,
  fetcher: typeof fetch = fetch,
): Promise<InstagramValidationResult> {
  if (source === 'business_system_user' && !expectedUserId) {
    return { ok: false, error: 'missing_user_id' };
  }

  const endpoint =
    source === 'instagram_login'
      ? new URL('https://graph.instagram.com/me')
      : new URL(`https://graph.facebook.com/${encodeURIComponent(expectedUserId as string)}`);
  endpoint.searchParams.set(
    'fields',
    source === 'instagram_login' ? 'user_id,username' : 'id,username',
  );
  endpoint.searchParams.set('access_token', token);

  let response: Response;
  try {
    response = await fetcher(endpoint);
  } catch (err) {
    console.error('[validateInstagramConnection] Fetch failed:', err);
    return { ok: false, error: 'invalid_token' };
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('[validateInstagramConnection] Non-ok status:', response.status, text);
    return { ok: false, error: 'invalid_token' };
  }

  const body = await getJson(response);
  const account =
    source === 'instagram_login' ? accountFromInstagramLogin(body) : accountFromBusiness(body);
  if (!account) {
    console.error('[validateInstagramConnection] Invalid response body structure:', body);
    return { ok: false, error: 'invalid_response' };
  }
  if (expectedUserId && account.userId !== expectedUserId) {
    return { ok: false, error: 'account_mismatch' };
  }
  return { ok: true, account };
}

export async function refreshInstagramLoginToken(
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<InstagramRefreshResult | null> {
  const endpoint = new URL('https://graph.instagram.com/refresh_access_token');
  endpoint.searchParams.set('grant_type', 'ig_refresh_token');
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
