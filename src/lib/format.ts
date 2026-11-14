const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function money(n: number, opts: { cents?: boolean; sign?: boolean } = {}) {
  const neg = n < 0;
  const abs = Math.abs(n);
  const s = abs.toLocaleString('en-US', {
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  });
  if (neg) return `-$${s}`;
  return `${opts.sign ? '+' : ''}$${s}`;
}

export function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

export function dayLabel(iso: string) {
  const today = toISO(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (iso === today) return 'Today';
  if (iso === toISO(y)) return 'Yesterday';
  const d = fromISO(iso);
  return `${DAYS[d.getDay()]}, ${SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function shortDate(iso: string) {
  const d = fromISO(iso);
  return `${SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
