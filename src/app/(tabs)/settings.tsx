import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { Card, confirmAction, SectionTitle, Tap } from '../../components/ui';
import { copyBackup, parseBackup, pickBackupFile, readClipboard, saveBackupFile } from '../../lib/backup';
import { APP_NAME } from '../../lib/brand';
import { money } from '../../lib/format';
import { useStore } from '../../lib/store';
import { accountKinds, colors } from '../../lib/theme';

export default function Settings() {
  const insets = useSafeAreaInsets();
  const name = useStore((s) => s.name);
  const setName = useStore((s) => s.setName);
  const accounts = useStore((s) => s.accounts);
  const cats = useStore((s) => s.categories);
  const txns = useStore((s) => s.txns);
  const month = useStore((s) => s.month);
  const clearSamples = useStore((s) => s.clearSamples);
  const resetAll = useStore((s) => s.resetAll);
  const sampleCount = txns.filter((t) => t.sample).length;
  const restore = useStore((s) => s.restore);
  const [note, setNote] = useState('');

  async function doRestore(read: () => Promise<string>) {
    setNote('');
    try {
      const d = parseBackup(await read());
      const when = d.savedAt ? new Date(d.savedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'earlier';
      confirmAction(
        'Restore this backup?',
        `Backup from ${when} with ${d.txns.length} transactions and ${d.categories.length} categories. It replaces everything currently in this app.`,
        'Restore',
        () => {
          restore(d);
          setNote(`✅ Restored ${d.txns.length} transactions.`);
        },
      );
    } catch (e: any) {
      setNote(`⚠️ ${e?.message ?? 'Something went wrong.'}`);
    }
  }

  const spendByAcct = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txns) {
      if (!t.date.startsWith(month)) continue;
      const v = t.direction === 'out' ? t.amount : -t.amount;
      const c = cats.find((x) => x.id === t.categoryId);
      if (c?.type === 'income') continue;
      m.set(t.accountId, (m.get(t.accountId) ?? 0) + v);
    }
    return m;
  }, [txns, cats, month]);

  const monthlyBudget = cats.filter((c) => c.type !== 'income').reduce((a, c) => a + c.budget, 0);
  const monthlyIncome = cats.filter((c) => c.type === 'income').reduce((a, c) => a + c.budget, 0);
  const monthlyLeft = monthlyIncome - monthlyBudget;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>You</Text>

      <Card style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center' }}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(name || '?').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.small}>Your name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.faint} style={styles.nameInput} />
        </View>
      </Card>

      <Text style={styles.planTitle}>Monthly plan</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Card style={styles.planCard}>
          <Text style={styles.small}>💰 Income</Text>
          <Text style={styles.stat} adjustsFontSizeToFit numberOfLines={1}>
            {money(monthlyIncome)}
          </Text>
        </Card>
        <Card style={styles.planCard}>
          <Text style={styles.small}>🧾 Spending</Text>
          <Text style={styles.stat} adjustsFontSizeToFit numberOfLines={1}>
            {money(monthlyBudget)}
          </Text>
        </Card>
        <Card style={[styles.planCard, { backgroundColor: monthlyLeft < 0 ? colors.badBg : colors.goodBg }]}>
          <Text style={styles.small}>🏆 Left over</Text>
          <Text style={[styles.stat, { color: monthlyLeft < 0 ? colors.bad : colors.good }]} adjustsFontSizeToFit numberOfLines={1}>
            {money(monthlyLeft)}
          </Text>
        </Card>
      </View>

      <SectionTitle
        right={
          <Tap onPress={() => router.push('/account')}>
            <Text style={styles.link}>＋ Add</Text>
          </Tap>
        }
      >
        Cards & accounts
      </SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        {accounts.map((a, i) => {
          const k = accountKinds.find((x) => x.k === a.kind);
          const spent = spendByAcct.get(a.id) ?? 0;
          return (
            <Tap key={a.id} onPress={() => router.push({ pathname: '/account', params: { id: a.id } })} style={[styles.row, i > 0 && styles.divider]}>
              <Text style={{ fontSize: 22, width: 34 }}>{k?.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{a.name}</Text>
                <Text style={styles.rowSub}>
                  {k?.label}
                  {a.limit ? ` · ${Math.round((spent / a.limit) * 100)}% of ${money(a.limit)} limit this month` : ''}
                </Text>
              </View>
              <Text style={styles.rowAmt}>{spent ? money(spent) : ''}</Text>
              <Icon name="chevron" size={16} color={colors.faint} />
            </Tap>
          );
        })}
      </Card>

      <SectionTitle>Categories</SectionTitle>
      <Tap onPress={() => router.navigate('/budget')}>
        <Card style={styles.row}>
          <Text style={{ fontSize: 22, width: 34 }}>🏷</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{cats.length} categories</Text>
            <Text style={styles.rowSub}>Edit names, icons & budgets on the Budget tab</Text>
          </View>
          <Icon name="chevron" size={16} color={colors.faint} />
        </Card>
      </Tap>

      <SectionTitle>Backup & restore</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <Tap
          style={styles.row}
          onPress={async () => {
            const ok = await copyBackup();
            setNote(ok ? `✅ Backup copied (${txns.length} transactions). Open the other app and tap “Paste backup”.` : '⚠️ Couldn’t copy. Try “Save backup file” instead.');
          }}
        >
          <Text style={{ fontSize: 22, width: 34 }}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Copy backup</Text>
            <Text style={styles.rowSub}>Quickest way to move your data to another copy of the app</Text>
          </View>
        </Tap>
        <Tap style={[styles.row, styles.divider]} onPress={() => saveBackupFile().catch(() => setNote('⚠️ Couldn’t save the file.'))}>
          <Text style={{ fontSize: 22, width: 34 }}>💾</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Save backup file</Text>
            <Text style={styles.rowSub}>Keep a copy in Files, iCloud Drive or email</Text>
          </View>
        </Tap>
        <Tap style={[styles.row, styles.divider]} onPress={() => doRestore(readClipboard)}>
          <Text style={{ fontSize: 22, width: 34 }}>📥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Paste backup</Text>
            <Text style={styles.rowSub}>Restore from a backup you copied</Text>
          </View>
        </Tap>
        <Tap style={[styles.row, styles.divider]} onPress={() => doRestore(pickBackupFile)}>
          <Text style={{ fontSize: 22, width: 34 }}>📂</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Restore from a file</Text>
            <Text style={styles.rowSub}>Pick a saved backup file</Text>
          </View>
        </Tap>
      </Card>
      {note ? <Text style={styles.note}>{note}</Text> : null}

      <SectionTitle>Data</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        {sampleCount > 0 && (
          <Tap
            style={styles.row}
            onPress={() => confirmAction('Clear imported transactions?', `Removes the ${sampleCount} transactions copied from your sheet. Your categories, budgets and accounts stay.`, 'Clear', clearSamples)}
          >
            <Text style={{ fontSize: 22, width: 34 }}>🧹</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Start fresh</Text>
              <Text style={styles.rowSub}>Clear the {sampleCount} transactions imported from your sheet</Text>
            </View>
          </Tap>
        )}
        <Tap
          style={[styles.row, sampleCount > 0 && styles.divider]}
          onPress={() => confirmAction('Erase everything?', 'Deletes all your transactions, categories and accounts on this device and starts setup again. Save a backup first if you might want them back.', 'Erase', () => { resetAll(); router.replace('/welcome'); })}
        >
          <Text style={{ fontSize: 22, width: 34 }}>↺</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.bad }]}>Erase & start over</Text>
            <Text style={styles.rowSub}>Clears this device and runs setup again</Text>
          </View>
        </Tap>
      </Card>

      <Text style={styles.foot}>{APP_NAME} · version 1.3{'\n'}Your data stays on this device. Save a backup now and then.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: '800', color: colors.ink, letterSpacing: -0.8 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  small: { fontSize: 12, color: colors.sub, fontWeight: '600' },
  nameInput: { fontSize: 20, fontWeight: '700', color: colors.ink, paddingVertical: 2, outlineStyle: 'none' } as any,
  planTitle: { fontSize: 13, fontWeight: '700', color: colors.sub, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8, marginLeft: 4 },
  planCard: { flex: 1, paddingVertical: 14, paddingHorizontal: 12 },
  stat: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 4 },
  link: { color: colors.brand, fontWeight: '700', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  rowSub: { fontSize: 12, color: colors.sub, marginTop: 2 },
  rowAmt: { fontSize: 14, fontWeight: '700', color: colors.ink, marginRight: 6 },
  note: { fontSize: 13, color: colors.sub, marginTop: 10, marginHorizontal: 6, lineHeight: 18 },
  foot: { textAlign: 'center', color: colors.faint, fontSize: 12, marginTop: 30, lineHeight: 18 },
});
