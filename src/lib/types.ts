export type CategoryType = 'income' | 'fixed' | 'variable' | 'savings' | 'giving' | 'debt' | 'investment';

export type AccountKind = 'credit' | 'debit' | 'checking' | 'cash' | 'wallet' | 'savings';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  budget: number; // monthly
  emoji: string;
}

export interface Account extends AccountBalance {
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

/** Budget accounts can carry a balance so they count toward net worth. */
export interface AccountBalance {
  /** Balance (or amount owed, for credit cards) as of the end of `balanceAsOf`. */
  balance?: number;
  balanceAsOf?: string; // YYYY-MM-DD; transactions dated after this move the balance
  hideFromNetWorth?: boolean;
}

export type AssetGroup = 'cash' | 'investments' | 'retirement' | 'crypto' | 'property' | 'vehicle' | 'otherAsset';
export type DebtGroup = 'creditCard' | 'mortgage' | 'autoLoan' | 'studentLoan' | 'personalLoan' | 'medical' | 'otherDebt';
export type WorthGroup = AssetGroup | DebtGroup;

export type RetirementKind = '401k' | 'roth401k' | '403b' | 'tradIra' | 'rothIra' | 'hsa' | 'pension' | 'other';

/** Something you own or owe that isn't a budget account (a 401(k), the house, a car loan…). */
export interface WorthItem {
  id: string;
  name: string;
  group: WorthGroup;
  value: number; // what it's worth, or what you owe
  updated: string; // YYYY-MM-DD the value was last set
  // retirement extras
  retirementKind?: RetirementKind;
  monthlyYou?: number; // your contribution per month
  monthlyEmployer?: number; // employer match per month
  // debt extras
  rate?: number; // interest rate, % per year
  payment?: number; // monthly payment
}

export interface WorthSnapshot {
  date: string; // YYYY-MM-DD, one per day
  assets: number;
  debts: number;
}

export interface RetirementPlan {
  age?: number;
  retireAge: number;
  growth: number; // % per year
}
