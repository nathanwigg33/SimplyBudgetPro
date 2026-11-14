import { monthKey } from './format';
import { typeOrder } from './theme';
import { Category, CategoryType, Txn } from './types';

export interface CatLine {
  cat: Category;
  actual: number; // income: money in; others: out minus refunds
  budget: number;
  left: number;
  pct: number; // 0..∞
  status: 'none' | 'good' | 'near' | 'over' | 'done';
}

export interface MonthSummary {
  income: number;
  incomeBudget: number;
  spent: number;
  outBudget: number;
  leftOver: number; // income - spent
  leftInBudget: number; // outBudget - spent
  usedPct: number;
  daysInMonth: number;
  daysLeft: number; // including today
  daysSoFar: number;
  safePerDay: number;
  avgPerDay: number;
  byType: Record<CategoryType, { actual: number; budget: number }>;
  lines: CatLine[];
  monthTxns: Txn[];
  isCurrent: boolean;
  isPast: boolean;
}

export function summarize(month: string, cats: Category[], txns: Txn[], warnAt: number, now = new Date()): MonthSummary {
  const monthTxns = txns.filter((t) => t.date.startsWith(month));
  const net = new Map<string, number>();
  for (const t of monthTxns) {
    const cat = cats.find((c) => c.id === t.categoryId);
    if (!cat) continue;
    const isIncomeCat = cat.type === 'income';
    // income categories count money in; everything else counts money out (refunds subtract)
    const v = isIncomeCat ? (t.direction === 'in' ? t.amount : -t.amount) : t.direction === 'out' ? t.amount : -t.amount;
    net.set(cat.id, (net.get(cat.id) ?? 0) + v);
  }

  const byType = Object.fromEntries(typeOrder.map((k) => [k, { actual: 0, budget: 0 }])) as MonthSummary['byType'];

  const lines: CatLine[] = cats.map((cat) => {
    const actual = round(net.get(cat.id) ?? 0);
    const budget = cat.budget;
    byType[cat.type].actual += actual;
    byType[cat.type].budget += budget;
    const pct = budget > 0 ? actual / budget : actual > 0 ? 1 : 0;
    let status: CatLine['status'] = 'good';
    if (budget === 0 && actual === 0) status = 'none';
    else if (cat.type === 'income') status = actual >= budget ? 'done' : 'good';
    else if (actual > budget + 0.005) status = 'over';
    else if (budget > 0 && Math.abs(actual - budget) < 0.005) status = 'done';
    else if (pct >= warnAt) status = 'near';
    return { cat, actual, budget, left: round(budget - actual), pct, status };
  });

  const income = byType.income.actual;
  const incomeBudget = byType.income.budget;
  let spent = 0;
  let outBudget = 0;
  for (const k of typeOrder) {
    if (k === 'income') continue;
    spent += byType[k].actual;
    outBudget += byType[k].budget;
  }

  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const curKey = monthKey(now);
  const isCurrent = curKey === month;
  const isPast = month < curKey;
  const daysSoFar = isCurrent ? now.getDate() : isPast ? daysInMonth : 0;
  const daysLeft = isCurrent ? daysInMonth - now.getDate() + 1 : isPast ? 0 : daysInMonth;
  const leftInBudget = outBudget - spent;

  return {
    income,
    incomeBudget,
    spent,
    outBudget,
    leftOver: income - spent,
    leftInBudget,
    usedPct: outBudget > 0 ? spent / outBudget : 0,
    daysInMonth,
    daysLeft,
    daysSoFar,
    safePerDay: daysLeft > 0 ? Math.max(0, leftInBudget) / daysLeft : 0,
    avgPerDay: daysSoFar > 0 ? spent / daysSoFar : 0,
    byType,
    lines,
    monthTxns,
    isCurrent,
    isPast,
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
