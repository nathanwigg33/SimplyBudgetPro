/**
 * SimplyBudgetPro server: email + password accounts and one synced budget per account.
 * Everything under /api/* lands here; every other path is the app itself (static files).
 */

interface AppEnv {
  DB: D1Database;
  ASSETS: Fetcher;
}

const SESSION_DAYS = 365;
const PBKDF2_ITERATIONS = 100_000; // the most Workers allows
const MAX_FAILED = 8; // failed sign-ins before a short lockout
const LOCK_MINUTES = 15;
const MAX_BODY = 8 * 1024 * 1024;

export default {
  async fetch(req: Request, env: AppEnv): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
    try {
      return cors(await route(req, env, url));
    } catch (e: any) {
      if (e instanceof HttpError) return cors(json({ error: e.message }, e.status));
      console.error(e);
      return cors(json({ error: 'Something went wrong on our end. Please try again.' }, 500));
    }
  },
};

async function route(req: Request, env: AppEnv, url: URL): Promise<Response> {
  const p = url.pathname;
  const m = req.method;
  if (p === '/api/signup' && m === 'POST') return signup(req, env);
  if (p === '/api/login' && m === 'POST') return login(req, env);
  if (p === '/api/logout' && m === 'POST') return logout(req, env);
  if (p === '/api/me' && m === 'GET') return me(req, env);
  if (p === '/api/data' && m === 'GET') return getData(req, env, url);
  if (p === '/api/data' && m === 'PUT') return putData(req, env);
  if (p === '/api/password' && m === 'POST') return changePassword(req, env);
  if (p === '/api/account' && m === 'DELETE') return deleteAccount(req, env);
  throw new HttpError(404, 'Not found');
}

// ---------- accounts ----------

async function signup(req: Request, env: AppEnv) {
  const { email, password } = await body<{ email: string; password: string }>(req);
  const e = normEmail(email);
  checkPassword(password);
  const exists = await env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(e).first();
  if (exists) throw new HttpError(409, 'There’s already an account with that email. Try signing in.');
  const salt = randomB64(16);
  const id = randomB64(12);
  const hash = await hashPassword(password, salt);
  await env.DB.prepare('INSERT INTO users (id, email, pass_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, e, hash, salt, Date.now()).run();
  const token = await newSession(env, id, req);
  return json({ token, email: e });
}

async function login(req: Request, env: AppEnv) {
  const { email, password } = await body<{ email: string; password: string }>(req);
  const e = normEmail(email);
  const u = await env.DB.prepare('SELECT id, pass_hash, salt, failed_logins, locked_until FROM users WHERE email = ?')
    .bind(e)
    .first<{ id: string; pass_hash: string; salt: string; failed_logins: number; locked_until: number }>();
  const wrong = new HttpError(401, 'That email and password don’t match.');
  if (!u) {
    await hashPassword(String(password ?? ''), 'timing-pad'); // keep timing similar for unknown emails
    throw wrong;
  }
  if (u.locked_until > Date.now()) throw new HttpError(429, `Too many tries. Wait ${LOCK_MINUTES} minutes and try again.`);
  const ok = safeEqual(await hashPassword(String(password ?? ''), u.salt), u.pass_hash);
  if (!ok) {
    const n = u.failed_logins + 1;
    const lock = n >= MAX_FAILED ? Date.now() + LOCK_MINUTES * 60_000 : 0;
    await env.DB.prepare('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?').bind(lock ? 0 : n, lock, u.id).run();
    throw wrong;
  }
  await env.DB.prepare('UPDATE users SET failed_logins = 0, locked_until = 0 WHERE id = ?').bind(u.id).run();
  const token = await newSession(env, u.id, req);
  return json({ token, email: e });
}

async function logout(req: Request, env: AppEnv) {
  const t = bearer(req);
  if (t) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(t)).run();
  return json({ ok: true });
}

async function me(req: Request, env: AppEnv) {
  const u = await auth(req, env);
  return json({ email: u.email });
}

async function changePassword(req: Request, env: AppEnv) {
  const u = await auth(req, env);
  const { current, next } = await body<{ current: string; next: string }>(req);
  const row = await env.DB.prepare('SELECT pass_hash, salt FROM users WHERE id = ?').bind(u.id).first<{ pass_hash: string; salt: string }>();
  if (!row || !safeEqual(await hashPassword(String(current ?? ''), row.salt), row.pass_hash)) throw new HttpError(401, 'Your current password isn’t right.');
  checkPassword(next);
  const salt = randomB64(16);
  await env.DB.prepare('UPDATE users SET pass_hash = ?, salt = ? WHERE id = ?').bind(await hashPassword(next, salt), salt, u.id).run();
  // Sign out every other device.
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(u.id, u.tokenHash).run();
  return json({ ok: true });
}

async function deleteAccount(req: Request, env: AppEnv) {
  const u = await auth(req, env);
  const { password } = await body<{ password: string }>(req);
  const row = await env.DB.prepare('SELECT pass_hash, salt FROM users WHERE id = ?').bind(u.id).first<{ pass_hash: string; salt: string }>();
  if (!row || !safeEqual(await hashPassword(String(password ?? ''), row.salt), row.pass_hash)) throw new HttpError(401, 'That password isn’t right.');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM user_data WHERE user_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(u.id),
  ]);
  return json({ ok: true });
}

// ---------- synced data ----------

async function getData(req: Request, env: AppEnv, url: URL) {
  const u = await auth(req, env);
  const row = await env.DB.prepare('SELECT data, rev, updated_at FROM user_data WHERE user_id = ?')
    .bind(u.id)
    .first<{ data: ArrayBuffer | number[]; rev: number; updated_at: number }>();
  if (!row) return json({ data: null, rev: 0 });
  // Cheap check: the app asks "anything newer than rev N?" every so often.
  const since = Number(url.searchParams.get('since') ?? -1);
  if (since === row.rev) return json({ unchanged: true, rev: row.rev });
  return json({ data: JSON.parse(await gunzip(row.data)), rev: row.rev, updatedAt: row.updated_at });
}

async function putData(req: Request, env: AppEnv) {
  const u = await auth(req, env);
  const { data, baseRev } = await body<{ data: unknown; baseRev: number }>(req);
  if (!data || typeof data !== 'object') throw new HttpError(400, 'Missing data.');
  const blob = await gzip(JSON.stringify(data));
  if (blob.byteLength > 1_900_000) throw new HttpError(413, 'Your budget is too large to save. Please contact support.');
  const now = Date.now();
  const base = Number(baseRev ?? 0);
  // Save only if nobody else saved since this device last synced; otherwise hand back the newer copy to merge.
  const res =
    base === 0
      ? await env.DB.prepare('INSERT INTO user_data (user_id, data, rev, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(user_id) DO NOTHING')
          .bind(u.id, blob, now)
          .run()
      : await env.DB.prepare('UPDATE user_data SET data = ?, rev = rev + 1, updated_at = ? WHERE user_id = ? AND rev = ?').bind(blob, now, u.id, base).run();
  if (res.meta.changes === 1) return json({ rev: base + 1, updatedAt: now });
  const row = await env.DB.prepare('SELECT data, rev FROM user_data WHERE user_id = ?').bind(u.id).first<{ data: ArrayBuffer | number[]; rev: number }>();
  if (!row) throw new HttpError(409, 'Please try again.');
  return json({ conflict: true, data: JSON.parse(await gunzip(row.data)), rev: row.rev }, 409);
}

// ---------- helpers ----------

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

/** The App Store build will call this API from the phone app, not the website, so allow that. */
function cors(res: Response) {
  const h = new Headers(res.headers);
  h.set('access-control-allow-origin', '*');
  h.set('access-control-allow-headers', 'authorization, content-type');
  h.set('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS');
  return new Response(res.body, { status: res.status, headers: h });
}

async function body<T>(req: Request): Promise<T> {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > MAX_BODY) throw new HttpError(413, 'That’s too much data to send at once.');
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, 'Bad request.');
  }
}

function normEmail(email: unknown) {
  const e = String(email ?? '').trim().toLowerCase();
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new HttpError(400, 'Enter a valid email address.');
  return e;
}

function checkPassword(pw: unknown) {
  const s = String(pw ?? '');
  if (s.length < 8) throw new HttpError(400, 'Use at least 8 characters for your password.');
  if (s.length > 200) throw new HttpError(400, 'That password is too long.');
}

function bearer(req: Request) {
  const h = req.headers.get('authorization') ?? '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

async function auth(req: Request, env: AppEnv) {
  const t = bearer(req);
  if (!t) throw new HttpError(401, 'Please sign in.');
  const tokenHash = await sha256(t);
  const row = await env.DB.prepare(
    'SELECT u.id, u.email, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?',
  )
    .bind(tokenHash)
    .first<{ id: string; email: string; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) throw new HttpError(401, 'You’ve been signed out. Please sign in again.');
  return { id: row.id, email: row.email, tokenHash };
}

async function newSession(env: AppEnv, userId: string, req: Request) {
  const token = randomB64(32);
  const now = Date.now();
  const device = (req.headers.get('user-agent') ?? '').slice(0, 200);
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, device) VALUES (?, ?, ?, ?, ?)')
    .bind(await sha256(token), userId, now, now + SESSION_DAYS * 86_400_000, device)
    .run();
  // Tidy up expired sessions now and then.
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at < ?').bind(userId, now).run();
  return token;
}

const enc = new TextEncoder();

function b64(bytes: ArrayBuffer | Uint8Array) {
  const a = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const c of a) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomB64(n: number) {
  return b64(crypto.getRandomValues(new Uint8Array(n)));
}

async function sha256(s: string) {
  return b64(await crypto.subtle.digest('SHA-256', enc.encode(s)));
}

async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS }, key, 256);
  return b64(bits);
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function gzip(s: string) {
  const stream = new Blob([s]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(data: ArrayBuffer | number[]) {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}
