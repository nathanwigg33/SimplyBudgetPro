import { AccountKind, CategoryType } from './types';

export const colors = {
  bg: '#F4F5FA',
  card: '#FFFFFF',
  ink: '#14152B',
  sub: '#6B6F86',
  faint: '#A3A7BC',
  line: '#ECEDF4',
  track: '#EEF0F6',
  brand: '#5B4CF0',
  brand2: '#8A5CF6',
  heroA: '#3B2FD9',
  heroB: '#7B4DF2',
  heroC: '#B067F0',
  good: '#16A36A',
  goodBg: '#E3F7EE',
  warn: '#E8930C',
  warnBg: '#FFF3DD',
  bad: '#E5484D',
  badBg: '#FDE8E9',
};

export const typeMeta: Record<
  CategoryType,
  { label: string; plural: string; color: string; tint: string; emoji: string }
> = {
  income: { label: 'Income', plural: 'Income', color: '#16A36A', tint: '#E3F7EE', emoji: '💰' },
  fixed: { label: 'Fixed', plural: 'Fixed bills', color: '#5B4CF0', tint: '#ECEAFE', emoji: '🏠' },
  variable: { label: 'Everyday', plural: 'Everyday spending', color: '#F2711C', tint: '#FEEFE3', emoji: '🛍' },
  savings: { label: 'Savings', plural: 'Savings', color: '#0EA5E9', tint: '#E1F3FC', emoji: '🏦' },
  giving: { label: 'Giving', plural: 'Giving', color: '#E5487F', tint: '#FDE7EF', emoji: '❤️' },
  debt: { label: 'Debt', plural: 'Debt payments', color: '#7C5A3C', tint: '#F4ECE4', emoji: '💳' },
  investment: { label: 'Investing', plural: 'Investing', color: '#0F9D8F', tint: '#DFF5F2', emoji: '📈' },
};

export const typeOrder: CategoryType[] = ['income', 'fixed', 'variable', 'savings', 'giving', 'debt', 'investment'];

export const radius = { sm: 12, md: 18, lg: 26 };

export const shadow = {
  boxShadow: '0px 6px 20px rgba(26, 24, 80, 0.07)',
} as const;

export const accountKinds: { k: AccountKind; label: string; emoji: string }[] = [
  { k: 'credit', label: 'Credit card', emoji: '💳' },
  { k: 'debit', label: 'Debit card', emoji: '🏧' },
  { k: 'checking', label: 'Checking', emoji: '🏦' },
  { k: 'savings', label: 'Savings', emoji: '🐷' },
  { k: 'cash', label: 'Cash', emoji: '💵' },
  { k: 'wallet', label: 'App / wallet', emoji: '📲' },
];
