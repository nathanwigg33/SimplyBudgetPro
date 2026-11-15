import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { monthKey, toISO, uid } from './format';
import { summarize, worthLines } from './networth';
import { starterAccounts, starterCategories } from './seed';
import { Account, Category, RetirementPlan, Txn, WorthItem, WorthSnapshot } from './types';

interface State {
  onboarded: boolean; // false until the person finishes setup (or restores a backup)
  name: string;
  warnAt: number; // 0.9 = warn when a category is 90% used
  categories: Category[];
  accounts: Account[];
  txns: Txn[];
  month: string; // month being viewed, YYYY-MM
  hydrated: boolean;
  worthItems: WorthItem[];
  snapshots: WorthSnapshot[];
  retirement: RetirementPlan;

  setName: (n: string) => void;
  setMonth: (m: string) => void;
  completeSetup: (d: { name: string; income: number; categoryIds: string[] }) => void;
  saveTxn: (t: Omit<Txn, 'id'> & { id?: string }) => void;
  deleteTxn: (id: string) => void;
  saveCategory: (c: Omit<Category, 'id'> & { id?: string }) => void;
  deleteCategory: (id: string) => void;
  saveAccount: (a: Omit<Account, 'id'> & { id?: string }) => void;
  deleteAccount: (id: string) => void;
  saveWorthItem: (i: Omit<WorthItem, 'id' | 'updated'> & { id?: string }) => void;
  deleteWorthItem: (id: string) => void;
  setRetirement: (p: Partial<RetirementPlan>) => void;
  clearSamples: () => void;
  resetAll: () => void;
  restore: (d: {
    name: string;
    categories: Category[];
    accounts: Account[];
    txns: Txn[];
    warnAt?: number;
    worthItems?: WorthItem[];
    snapshots?: WorthSnapshot[];
    retirement?: RetirementPlan;
  }) => void;
}

function upsert<T extends { id: string }>(list: T[], item: Omit<T, 'id'> & { id?: string }): T[] {
  if (item.id && list.some((x) => x.id === item.id)) {
    return list.map((x) => (x.id === item.id ? ({ ...x, ...item } as T) : x));
  }
  return [...list, { ...item, id: item.id ?? uid() } as T];
}

const blank = () => ({
  onboarded: false,
  name: '',
  categories: starterCategories(0),
  accounts: starterAccounts,
  txns: [] as Txn[],
  month: monthKey(new Date()),
  worthItems: [] as WorthItem[],
  snapshots: [] as WorthSnapshot[],
  retirement: { retireAge: 65, growth: 7 } as RetirementPlan,
});

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...blank(),
      warnAt: 0.9,
      hydrated: false,

      setName: (name) => set({ name }),
      setMonth: (month) => set({ month }),
      completeSetup: ({ name, income, categoryIds }) =>
        set({ onboarded: true, name: name.trim(), categories: starterCategories(income, categoryIds), month: monthKey(new Date()) }),
      saveTxn: (t) => set((s) => ({ txns: upsert(s.txns, t) })),
      deleteTxn: (id) => set((s) => ({ txns: s.txns.filter((t) => t.id !== id) })),
      saveCategory: (c) => set((s) => ({ categories: upsert(s.categories, c) })),
      deleteCategory: (id) => set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),
      saveAccount: (a) => set((s) => ({ accounts: upsert(s.accounts, a) })),
      deleteAccount: (id) => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),
      saveWorthItem: (i) => set((s) => ({ worthItems: upsert(s.worthItems, { ...i, updated: toISO(new Date()) }) })),
      deleteWorthItem: (id) => set((s) => ({ worthItems: s.worthItems.filter((i) => i.id !== id) })),
      setRetirement: (p) => set((s) => ({ retirement: { ...s.retirement, ...p } })),
      clearSamples: () => set((s) => ({ txns: s.txns.filter((t) => !t.sample) })),
      restore: (d) =>
        set((s) => ({
          onboarded: true,
          name: d.name ?? s.name,
          warnAt: d.warnAt ?? s.warnAt,
          categories: d.categories,
          accounts: d.accounts,
          txns: d.txns,
          worthItems: d.worthItems ?? [],
          snapshots: d.snapshots ?? [],
          retirement: d.retirement ?? s.retirement,
          month: monthKey(new Date()),
        })),
      resetAll: () => set(blank()),
    }),
    {
      name: 'simplybudgetpro-v1',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated, month, ...rest }) => rest,
      // Anyone who used version 1 already has their own data: skip setup for them.
      migrate: (persisted: any, version) => {
        if (version < 2 && persisted) persisted.onboarded = true;
        return persisted;
      },
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
);

/**
 * Keeps one net worth snapshot per day (today's is overwritten as balances change),
 * which is what the net worth chart draws.
 */
function recordSnapshot(s: State) {
  if (!s.hydrated) return;
  const lines = worthLines(s.accounts, s.worthItems, s.txns);
  const last = s.snapshots[s.snapshots.length - 1];
  if (lines.length === 0 && !last) return;
  const { assets, debts } = summarize(lines);
  const today = toISO(new Date());
  if (last && last.assets === assets && last.debts === debts) return;
  const rest = last?.date === today ? s.snapshots.slice(0, -1) : s.snapshots;
  useStore.setState({ snapshots: [...rest, { date: today, assets, debts }] });
}
useStore.subscribe(recordSnapshot);
