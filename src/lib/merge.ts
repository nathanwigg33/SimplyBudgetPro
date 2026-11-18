/**
 * Three-way merge for syncing between devices.
 * `base` is the copy this device last synced, `local` is this device now, `remote` is the server now.
 * Changes made here since `base` are laid over `remote`, so edits on two devices both survive,
 * and something deleted on one device stays deleted.
 */

export interface SyncDoc {
  onboarded: boolean;
  name: string;
  warnAt: number;
  categories: { id: string }[];
  accounts: { id: string }[];
  txns: { id: string }[];
  worthItems: { id: string }[];
  snapshots: { date: string }[];
  retirement: unknown;
}

const LISTS: { k: keyof SyncDoc; key: string }[] = [
  { k: 'categories', key: 'id' },
  { k: 'accounts', key: 'id' },
  { k: 'txns', key: 'id' },
  { k: 'worthItems', key: 'id' },
  { k: 'snapshots', key: 'date' },
];
const SCALARS: (keyof SyncDoc)[] = ['onboarded', 'name', 'warnAt', 'retirement'];

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function mergeList<T extends Record<string, any>>(base: T[] = [], local: T[] = [], remote: T[] = [], key: string): T[] {
  const b = new Map(base.map((x) => [x[key], x]));
  const l = new Map(local.map((x) => [x[key], x]));
  const out = new Map(remote.map((x) => [x[key], x]));
  for (const [id, item] of l) {
    const was = b.get(id);
    if (!was || !same(was, item)) out.set(id, item); // added or edited here
  }
  for (const id of b.keys()) if (!l.has(id)) out.delete(id); // deleted here
  // Keep the server's order, then anything new from this device in its order.
  const order = [...remote.map((x) => x[key]), ...local.map((x) => x[key]).filter((id) => !remote.some((r) => r[key] === id))];
  const seen = new Set<string>();
  const res: T[] = [];
  for (const id of order) {
    if (seen.has(id) || !out.has(id)) continue;
    seen.add(id);
    res.push(out.get(id)!);
  }
  return res;
}

export function merge(base: SyncDoc | null, local: SyncDoc, remote: SyncDoc): SyncDoc {
  if (!base) return remote;
  const out: any = { ...remote };
  for (const k of SCALARS) out[k] = same(local[k], base[k]) ? remote[k] : local[k];
  for (const { k, key } of LISTS) out[k] = mergeList(base[k] as any[], local[k] as any[], remote[k] as any[], key);
  if (Array.isArray(out.snapshots)) out.snapshots = [...out.snapshots].sort((a: any, b: any) => (a.date < b.date ? -1 : 1));
  return out as SyncDoc;
}


export function docsEqual(a: SyncDoc | null, b: SyncDoc | null) {
  return same(a, b);
}
