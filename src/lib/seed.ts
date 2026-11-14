import { Account, Category, CategoryType } from './types';

/**
 * Starter categories for a new user. `share` is the suggested slice of monthly
 * take-home pay, used to pre-fill budgets during setup (everyone can change them).
 */
export const STARTER: { id: string; name: string; type: CategoryType; emoji: string; share: number; on: boolean }[] = [
  { id: 'paycheck', name: 'Paycheck', type: 'income', emoji: '💼', share: 1, on: true },
  { id: 'side-income', name: 'Side income', type: 'income', emoji: '🧑‍💻', share: 0, on: true },
  { id: 'other-income', name: 'Other income', type: 'income', emoji: '💵', share: 0, on: true },

  { id: 'housing', name: 'Rent / Mortgage', type: 'fixed', emoji: '🏠', share: 0.28, on: true },
  { id: 'utilities', name: 'Utilities', type: 'fixed', emoji: '💡', share: 0.04, on: true },
  { id: 'insurance', name: 'Insurance', type: 'fixed', emoji: '🛡', share: 0.03, on: true },
  { id: 'phone', name: 'Phone', type: 'fixed', emoji: '📱', share: 0.02, on: true },
  { id: 'internet', name: 'Internet', type: 'fixed', emoji: '🌐', share: 0.015, on: true },
  { id: 'subscriptions', name: 'Subscriptions', type: 'fixed', emoji: '📺', share: 0.01, on: true },
  { id: 'car-payment', name: 'Car payment', type: 'fixed', emoji: '🚗', share: 0.07, on: false },

  { id: 'groceries', name: 'Groceries', type: 'variable', emoji: '🛒', share: 0.09, on: true },
  { id: 'dining', name: 'Dining out', type: 'variable', emoji: '🍔', share: 0.04, on: true },
  { id: 'transport', name: 'Gas & transport', type: 'variable', emoji: '⛽', share: 0.04, on: true },
  { id: 'entertainment', name: 'Entertainment', type: 'variable', emoji: '🎟', share: 0.02, on: true },
  { id: 'shopping', name: 'Shopping', type: 'variable', emoji: '🛍', share: 0.03, on: true },
  { id: 'personal-care', name: 'Personal care', type: 'variable', emoji: '🧴', share: 0.01, on: true },
  { id: 'household', name: 'Household', type: 'variable', emoji: '🧻', share: 0.015, on: true },
  { id: 'pets', name: 'Pets', type: 'variable', emoji: '🐶', share: 0.02, on: false },
  { id: 'kids', name: 'Kids', type: 'variable', emoji: '👶', share: 0.05, on: false },
  { id: 'misc', name: 'Miscellaneous', type: 'variable', emoji: '✨', share: 0.015, on: true },

  { id: 'emergency-fund', name: 'Emergency fund', type: 'savings', emoji: '🆘', share: 0.05, on: true },
  { id: 'savings', name: 'Savings', type: 'savings', emoji: '🐷', share: 0.03, on: true },
  { id: 'giving', name: 'Giving', type: 'giving', emoji: '❤️', share: 0.03, on: true },
  { id: 'credit-card', name: 'Credit card payment', type: 'debt', emoji: '💳', share: 0.03, on: false },
  { id: 'student-loan', name: 'Student loan', type: 'debt', emoji: '🎓', share: 0.03, on: false },
  { id: 'retirement', name: 'Retirement', type: 'investment', emoji: '🌴', share: 0.05, on: true },
];

/** Builds the category list for a new user from their monthly take-home pay. */
export function starterCategories(income: number, ids?: string[]): Category[] {
  const pick = ids ? STARTER.filter((c) => ids.includes(c.id)) : STARTER.filter((c) => c.on);
  return pick.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    emoji: c.emoji,
    budget: income > 0 && c.share > 0 ? (c.type === 'income' ? Math.round(income) : Math.max(5, Math.round((income * c.share) / 5) * 5)) : 0,
  }));
}

export const starterAccounts: Account[] = [
  { id: 'debit', name: 'Debit card', kind: 'debit' },
  { id: 'credit', name: 'Credit card', kind: 'credit' },
  { id: 'cash', name: 'Cash', kind: 'cash' },
];

export const EMOJI_CHOICES = [
  '🛒', '🍔', '☕', '🍕', '⛽', '🚗', '🚌', '✈️', '🏠', '💡', '📱', '🌐', '📺', '🎟', '🎮', '🎵',
  '🛍', '👕', '🧴', '💇', '🧻', '🐶', '👶', '🏥', '💊', '🏋️', '📚', '🎓', '🎁', '❤️', '⛪', '🤝',
  '🐷', '🏦', '🆘', '📈', '🌴', '💳', '📄', '💼', '💵', '🎉', '🧑‍💻', '🛡', '🔧', '✨',
];
