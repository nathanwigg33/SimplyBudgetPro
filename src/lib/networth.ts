import { Account, AssetGroup, DebtGroup, RetirementKind, RetirementPlan, Txn, WorthGroup, WorthItem } from './types';

export type Access = 'now' | 'soon' | 'locked';

export const assetGroups: { g: AssetGroup; label: string; emoji: string; color: string; access: Access; hint: string }[] = [
  { g: 'cash', label: 'Cash & savings', emoji: '🏦', color: '#0EA5E9', access: 'now', hint: 'Other checking, savings, high-yield savings, CDs' },
  { g: 'investments', label: 'Investments', emoji: '📈', color: '#0F9D8F', access: 'soon', hint: 'Brokerage accounts, stocks, ETFs, bonds' },
  { g: 'retirement', label: 'Retirement', emoji: '🌴', color: '#5B4CF0', access: 'locked', hint: '401(k), IRA, Roth IRA, 403(b), HSA, pension' },
  { g: 'crypto', label: 'Crypto', emoji: '🪙', color: '#E8930C', access: 'soon', hint: 'Bitcoin, Ethereum, exchange balances' },
  { g: 'property', label: 'Real estate', emoji: '🏡', color: '#16A36A', access: 'locked', hint: 'Your home, land, rental property' },
  { g: 'vehicle', label: 'Vehicles', emoji: '🚗', color: '#7C5A3C', access: 'locked', hint: 'Cars, trucks, motorcycles, boats' },
  { g: 'otherAsset', label: 'Other assets', emoji: '💎', color: '#E5487F', access: 'locked', hint: 'Jewelry, collectibles, a business, money owed to you' },
];

export const debtGroups: { g: DebtGroup; label: string; emoji: string; color: string }[] = [
  { g: 'creditCard', label: 'Credit cards', emoji: '💳', color: '#E5484D' },
  { g: 'mortgage', label: 'Mortgage', emoji: '🏠', color: '#B4532A' },
  { g: 'autoLoan', label: 'Auto loan', emoji: '🚙', color: '#C2410C' },
  { g: 'studentLoan', label: 'Student loans', emoji: '🎓', color: '#9F1239' },
  { g: 'personalLoan', label: 'Personal loan', emoji: '🤝', color: '#BE185D' },
  { g: 'medical', label: 'Medical debt', emoji: '🏥', color: '#A21CAF' },
  { g: 'otherDebt', label: 'Other debt', emoji: '📄', color: '#6B6F86' },
];

export const retirementKinds: { k: RetirementKind; label: string }[] = [
  { k: '401k', label: '401(k)' },
  { k: 'roth401k', label: 'Roth 401(k)' },
  { k: '403b', label: '403(b)' },
  { k: 'tradIra', label: 'Traditional IRA' },
  { k: 'rothIra', label: 'Roth IRA' },
  { k: 'hsa', label: 'HSA' },
  { k: 'pension', label: 'Pension' },
  { k: 'other', label: 'Other' },
];

export function isDebt(g: WorthGroup): g is DebtGroup {
  return debtGroups.some((d) => d.g === g);
}

export function groupMeta(g: WorthGroup) {
  return assetGroups.find((x) => x.g === g) ?? debtGroups.find((x) => x.g === g)!;
}

/** Credit cards are owed; every other budget account kind is money you hold. */
export function accountIsDebt(a: Account) {
  return a.kind === 'credit';
}

export function accountHasBalance(a: Account) {
  return typeof a.balance === 'number';
}

/** Current balance of a budget account: its saved balance, moved by every transaction logged after that date. */
export function accountBalance(a: Account, txns: Txn[]) {
  if (typeof a.balance !== 'number') return 0;
  const asOf = a.balanceAsOf ?? '0000-00-00';
  let b = a.balance;
  for (const t of txns) {
    if (t.accountId !== a.id || t.date <= asOf) continue;
    const inflow = t.direction === 'in' ? t.amount : -t.amount;
    // For a card, spending raises what you owe and refunds/payments lower it.
    b += accountIsDebt(a) ? -inflow : inflow;
  }
  return Math.round(b * 100) / 100;
}

export interface WorthLine {
  key: string;
  name: string;
  value: number; // positive; for debts it's the amount owed
  debt: boolean;
  group: WorthGroup;
  accountId?: string;
  item?: WorthItem;
  updated?: string;
}

export function worthLines(accounts: Account[], items: WorthItem[], txns: Txn[]): WorthLine[] {
  const fromAccounts: WorthLine[] = accounts
    .filter((a) => accountHasBalance(a) && !a.hideFromNetWorth)
    .map((a) => ({
      key: `a:${a.id}`,
      name: a.name,
      value: accountBalance(a, txns),
      debt: accountIsDebt(a),
      group: accountIsDebt(a) ? 'creditCard' : 'cash',
      accountId: a.id,
    }));
  const fromItems: WorthLine[] = items.map((i) => ({
    key: `i:${i.id}`,
    name: i.name,
    value: i.value,
    debt: isDebt(i.group),
    group: i.group,
    item: i,
    updated: i.updated,
  }));
  return [...fromAccounts, ...fromItems];
}

export function summarize(lines: WorthLine[]) {
  let assets = 0;
  let debts = 0;
  const byGroup = new Map<WorthGroup, number>();
  const access = { now: 0, soon: 0, locked: 0 };
  let cardDebt = 0;
  for (const l of lines) {
    byGroup.set(l.group, (byGroup.get(l.group) ?? 0) + l.value);
    if (l.debt) {
      debts += l.value;
      if (l.group === 'creditCard') cardDebt += l.value;
    } else {
      assets += l.value;
      const a = assetGroups.find((x) => x.g === l.group)?.access ?? 'locked';
      access[a] += l.value;
    }
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    assets: r(assets),
    debts: r(debts),
    net: r(assets - debts),
    byGroup,
    spendableNow: r(access.now),
    spendableAfterCards: r(access.now - cardDebt),
    accessible: r(access.now + access.soon),
    soon: r(access.soon),
    locked: r(access.locked),
  };
}

/** Projects retirement savings to retirement age with monthly contributions and compounding. */
export function projectRetirement(current: number, monthly: number, plan: RetirementPlan) {
  if (!plan.age || plan.retireAge <= plan.age) return undefined;
  const months = (plan.retireAge - plan.age) * 12;
  const r = plan.growth / 100 / 12;
  const grow = Math.pow(1 + r, months);
  const fromNow = current * grow;
  const fromSaving = r > 0 ? monthly * ((grow - 1) / r) : monthly * months;
  return { total: fromNow + fromSaving, years: plan.retireAge - plan.age, contributed: monthly * months };
}

export function daysSince(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const then = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((today - then) / 86400000);
}
