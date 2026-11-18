/**
 * Talks to the SimplyBudgetPro server. On the website the server is the same address the app
 * is served from; the App Store build will set EXPO_PUBLIC_API_URL to the full address.
 */
const BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: any,
  ) {
    super(message);
  }
}

export async function api<T = any>(path: string, opts: { method?: string; token?: string | null; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError(0, 'Can’t reach the server. Check your internet connection.');
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // not JSON
  }
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Something went wrong (${res.status}).`, data);
  return data as T;
}
