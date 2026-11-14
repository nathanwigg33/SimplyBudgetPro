export type CategoryType = 'income' | 'fixed' | 'variable' | 'savings' | 'giving' | 'debt' | 'investment';

export type AccountKind = 'credit' | 'debit' | 'checking' | 'cash' | 'wallet' | 'savings';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  budget: number; // monthly
  emoji: string;
}

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  limit?: number;
}

/** direction 'in' on an expense category = refund (reduces that category's spending). */
export interface Txn {
  id: string;
  date: string; // YYYY-MM-DD
  desc: string;
  categoryId: string;
  accountId: string;
  amount: number; // always positive
  direction: 'in' | 'out';
  note?: string;
  sample?: boolean;
}
