import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api, ApiError } from './api';
import { docsEqual, merge, SyncDoc } from './merge';
import { useStore } from './store';

// ---------- who is signed in ----------

interface AuthState {
  token: string | null;
  email: string | null;
  hydrated: boolean;
}

export const useAuth = create<AuthState>()(
  persist(() => ({ token: null, email: null, hydrated: false }) as AuthState, {
    name: 'simplybudgetpro-auth',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: ({ token, email }) => ({ token, email }),
    onRehydrateStorage: () => () => useAuth.setState({ hydrated: true }),
  }),
);

// ---------- sync status (shown on the You tab) ----------

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';
export const useSync = create<{ ready: boolean; status: SyncStatus; lastSynced?: number; error?: string }>(() => ({
  ready: false,
  status: 'idle',
}));

// What this device last agreed on with the server, kept so edits from two devices can be merged.
interface Meta {
  email: string | null;
  rev: number;
  base: SyncDoc | null;
}
const META_KEY = 'simplybudgetpro-sync';
let meta: Meta = { email: null, rev: 0, base: null };

async function loadMeta(email: string) {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    const m = raw ? (JSON.parse(raw) as Meta) : null;
    meta = m && m.email === email ? m : { email, rev: 0, base: null };
  } catch {
    meta = { email, rev: 0, base: null };
  }
}
async function saveMeta() {
  try {
    await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // storage full or unavailable: next launch will simply re-download
  }
}

export function docOf(s = useStore.getState()): SyncDoc {
  return {
    onboarded: s.onboarded,
    name: s.name,
    warnAt: s.warnAt,
    categories: s.categories,
    accounts: s.accounts,
    txns: s.txns,
    worthItems: s.worthItems,
    snapshots: s.snapshots,
    retirement: s.retirement,
  };
}

function apply(doc: SyncDoc) {
  useStore.setState({ ...(doc as any) });
}

// ---------- the engine ----------

let running = false;
let unsubStore: (() => void) | null = null;
let appStateSub: { remove: () => void } | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;
let pushAgain = false;

const token = () => useAuth.getState().token;

function fail(e: unknown) {
  if (e instanceof ApiError && e.status === 401) {
    // Session ended (signed out elsewhere or password changed): back to sign-in.
    void signOut({ skipServer: true });
    return;
  }
  const offline = e instanceof ApiError && e.status === 0;
  useSync.setState({ status: offline ? 'offline' : 'error', error: e instanceof Error ? e.message : String(e) });
  schedulePush(offline ? 15000 : 30000);
}

export function schedulePush(ms = 1200) {
  if (!running) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void push(), ms);
}

async function push() {
  if (!running) return;
  if (pushing) {
    pushAgain = true;
    return;
  }
  const doc = docOf();
  if (meta.base ? docsEqual(doc, meta.base) : !doc.onboarded) return; // nothing new to save
  pushing = true;
  useSync.setState({ status: 'syncing' });
  try {
    const res = await api<{ rev: number }>('/api/data', { method: 'PUT', token: token(), body: { data: doc, baseRev: meta.rev } });
    meta = { ...meta, rev: res.rev, base: doc };
    await saveMeta();
    useSync.setState({ status: 'idle', lastSynced: Date.now(), error: undefined });
  } catch (e) {
    if (e instanceof ApiError && e.status === 409 && e.body?.data) {
      // Another device saved first: fold our changes into theirs and save again.
      const remote = e.body.data as SyncDoc;
      apply(merge(meta.base, docOf(), remote));
      meta = { ...meta, rev: e.body.rev, base: remote };
      await saveMeta();
      pushAgain = true;
    } else fail(e);
  } finally {
    pushing = false;
    if (pushAgain) {
      pushAgain = false;
      schedulePush(200);
    }
  }
}

/** Gets the latest from the server and folds it into this device. */
export async function pull() {
  if (!running) return;
  useSync.setState({ status: 'syncing' });
  try {
    const q = meta.base ? `?since=${meta.rev}` : '';
    const res = await api<{ data?: SyncDoc | null; rev: number; unchanged?: boolean }>(`/api/data${q}`, { token: token() });
    if (!res.unchanged) {
      if (!res.data) {
        // Brand-new account: whatever is on this device becomes the account's data.
        meta = { ...meta, rev: 0, base: null };
      } else if (!meta.base) {
        // First sync on this device: the account's data wins. Keep a copy of anything that was here.
        const local = docOf();
        if (local.onboarded && local.txns.length && !docsEqual(local, res.data)) {
          await AsyncStorage.setItem('simplybudgetpro-device-backup', JSON.stringify({ savedAt: new Date().toISOString(), ...local })).catch(() => {});
        }
        apply(res.data);
        meta = { ...meta, rev: res.rev, base: res.data };
      } else {
        apply(merge(meta.base, docOf(), res.data));
        meta = { ...meta, rev: res.rev, base: res.data };
      }
      await saveMeta();
    }
    useSync.setState({ status: 'idle', lastSynced: Date.now(), error: undefined });
    schedulePush(300); // send anything changed here (including edits made while offline)
  } catch (e) {
    fail(e);
  }
}

export async function startSync() {
  const { token: t, email } = useAuth.getState();
  if (running || !t || !email) return;
  running = true;
  await loadMeta(email);
  await pull();
  useSync.setState({ ready: true });

  let last = docOf();
  unsubStore = useStore.subscribe((s) => {
    // Only react to the parts of the app that are saved to the account.
    const d = docOf(s);
    const changed = (Object.keys(d) as (keyof SyncDoc)[]).some((k) => d[k] !== last[k]);
    last = d;
    if (changed) schedulePush();
  });
  pollTimer = setInterval(() => {
    if (AppState.currentState === 'active') void pull();
  }, 60_000);
  appStateSub = AppState.addEventListener('change', (st) => {
    if (st === 'active') void pull();
    else void push(); // leaving the app: save right away
  });
}

function stopSync() {
  running = false;
  unsubStore?.();
  unsubStore = null;
  appStateSub?.remove();
  appStateSub = null;
  if (pollTimer) clearInterval(pollTimer);
  if (pushTimer) clearTimeout(pushTimer);
  pollTimer = pushTimer = null;
  useSync.setState({ ready: false, status: 'idle', lastSynced: undefined, error: undefined });
}

// ---------- sign in / out ----------

export async function signIn(mode: 'login' | 'signup', email: string, password: string) {
  const res = await api<{ token: string; email: string }>(mode === 'signup' ? '/api/signup' : '/api/login', {
    method: 'POST',
    body: { email, password },
  });
  useAuth.setState({ token: res.token, email: res.email });
  await startSync();
}

/** Signs out and clears this device so the next person doesn't see the budget. */
export async function signOut(opts: { skipServer?: boolean } = {}) {
  const t = token();
  if (!opts.skipServer && running) {
    if (pushTimer) clearTimeout(pushTimer);
    await push().catch(() => {});
  }
  stopSync();
  if (!opts.skipServer && t) await api('/api/logout', { method: 'POST', token: t }).catch(() => {});
  useAuth.setState({ token: null, email: null });
  meta = { email: null, rev: 0, base: null };
  await AsyncStorage.removeItem(META_KEY).catch(() => {});
  useStore.getState().resetAll();
}

export async function changePassword(current: string, next: string) {
  await api('/api/password', { method: 'POST', token: token(), body: { current, next } });
}

export async function deleteAccount(password: string) {
  await api('/api/account', { method: 'DELETE', token: token(), body: { password } });
  await signOut({ skipServer: true });
}
