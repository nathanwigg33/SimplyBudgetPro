import { useMemo } from 'react';
import { summarize } from './calc';
import { useStore } from './store';

export function useSummary() {
  const month = useStore((s) => s.month);
  const categories = useStore((s) => s.categories);
  const txns = useStore((s) => s.txns);
  const warnAt = useStore((s) => s.warnAt);
  return useMemo(() => summarize(month, categories, txns, warnAt), [month, categories, txns, warnAt]);
}
