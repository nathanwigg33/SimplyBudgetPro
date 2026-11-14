import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { monthKey, uid } from './format';
import { starterAccounts, starterCategories } from './seed';
import { Account, Category, Txn } from './types';

interface State {
  onboarded: boolean; // false until the person finishes setup (or restores a backup)
  name: string;
  warnAt: number; // 0.9 = warn when a category is 90% used
  categories: Category[];
  accounts: Account[];
  txns: Txn[];
  month: string; // month being viewed, YYYY-MM
  hydrated: boolean;

  setName: (n: string) => void;
  setMonth: (m: string) => void;
  completeSetup: (d: { name: string; income: number; categoryIds: string[] }) => void;
  saveTxn: (t: Omit<Txn, 'id'> & { id?: string }) => void;
  deleteTxn: (id: string) => void;
  saveCategory: (c: Omit<Category, 'id'> & { id?: string }) => void;
  deleteCategory: (id: string) => void;
  saveAccount: (a: Omit<Account, 'id'> & { id?: string }) => void;
  deleteAccount: (id: string) => void;
  clearSamples: () => void;
  resetAll: () => void;
  restore: (d: { name: string; categories: Category[]; accounts: Account[]; txns: Txn[]; warnAt?: number }) => void;
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
      clearSamples: () => set((s) => ({ txns: s.txns.filter((t) => !t.sample) })),
      restore: (d) =>
        set((s) => ({
          onboarded: true,
          name: d.name ?? s.name,
          warnAt: d.warnAt ?? s.warnAt,
          categories: d.categories,
          accounts: d.accounts,
          txns: d.txns,
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
