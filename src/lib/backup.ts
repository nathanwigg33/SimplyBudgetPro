import { Platform, Share } from 'react-native';
import { toISO } from './format';
import { useStore } from './store';

// Internal marker kept from the app's first name so older backups still restore.
const MARK = 'pocketplan-backup';

export function makeBackup() {
  const s = useStore.getState();
  return JSON.stringify({
    app: MARK,
    version: 2,
    savedAt: new Date().toISOString(),
    name: s.name,
    warnAt: s.warnAt,
    categories: s.categories,
    accounts: s.accounts,
    txns: s.txns,
    worthItems: s.worthItems,
    snapshots: s.snapshots,
    retirement: s.retirement,
  });
}

export type Parsed = ReturnType<typeof parseBackup>;

/** Returns the data, or throws an Error with a friendly message. */
export function parseBackup(text: string) {
  let d: any;
  try {
    d = JSON.parse(text.trim());
  } catch {
    throw new Error('That doesn’t look like a SimplyBudget backup.');
  }
  if (!d || d.app !== MARK || !Array.isArray(d.categories) || !Array.isArray(d.accounts) || !Array.isArray(d.txns)) {
    throw new Error('That doesn’t look like a SimplyBudget backup.');
  }
  return d as {
    name: string;
    warnAt?: number;
    categories: any[];
    accounts: any[];
    txns: any[];
    worthItems?: any[];
    snapshots?: any[];
    retirement?: any;
    savedAt?: string;
  };
}

/** Copies the backup to the clipboard. Returns true on success. */
export async function copyBackup(): Promise<boolean> {
  const text = makeBackup();
  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  await Share.share({ message: text });
  return true;
}

/** Opens the iPhone share sheet with a backup file (Save to Files, AirDrop, Mail…), or downloads it. */
export async function saveBackupFile() {
  const text = makeBackup();
  const filename = `simplybudgetpro-backup-${toISO(new Date())}.json`;
  if (Platform.OS !== 'web') {
    await Share.share({ message: text });
    return;
  }
  const file = new File([text], filename, { type: 'application/json' });
  const nav = navigator as any;
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'SimplyBudgetPro backup' });
      return;
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function readClipboard(): Promise<string> {
  if (Platform.OS !== 'web') throw new Error('Paste isn’t available here yet.');
  try {
    return await navigator.clipboard.readText();
  } catch {
    throw new Error('Couldn’t read what you copied. Try “Restore from a file” instead.');
  }
}

export function pickBackupFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'web') return reject(new Error('Not available here yet.'));
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/plain';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return reject(new Error('No file chosen.'));
      f.text().then(resolve, () => reject(new Error('Couldn’t open that file.')));
    };
    input.click();
  });
}
