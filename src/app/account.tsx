import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Icon } from '../components/Icon';
import { Button, Chip, confirmAction, Tap } from '../components/ui';
import { money, toISO } from '../lib/format';
import { accountBalance } from '../lib/networth';
import { useStore } from '../lib/store';
import { accountKinds, colors } from '../lib/theme';
import { AccountKind } from '../lib/types';

export default function AccountEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const accts = useStore((s) => s.accounts);
  const save = useStore((s) => s.saveAccount);
  const del = useStore((s) => s.deleteAccount);
  const txns = useStore((s) => s.txns);
  const existing = id ? accts.find((a) => a.id === id) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState<AccountKind>(existing?.kind ?? 'credit');
  const [limit, setLimit] = useState(existing?.limit ? String(existing.limit) : '');
  const startBal = existing && typeof existing.balance === 'number' ? accountBalance(existing, txns) : undefined;
  const [bal, setBal] = useState(startBal !== undefined ? String(startBal) : '');
  const [inWorth, setInWorth] = useState(!existing?.hideFromNetWorth);

  function onSave() {
    if (!name.trim()) return;
    const l = parseFloat(limit.replace(/[$,]/g, ''));
    const b = parseFloat(bal.replace(/[$,]/g, ''));
    const hasBal = bal.trim() !== '' && !isNaN(b);
    // Only re-anchor the balance when it was changed, so logged transactions keep moving it.
    const balFields = !hasBal
      ? { balance: undefined, balanceAsOf: undefined, balanceSeen: undefined }
      : startBal !== undefined && Math.abs(b - startBal) < 0.005
        ? {}
        : {
            balance: b,
            balanceAsOf: toISO(new Date()),
            balanceSeen: existing ? txns.filter((t) => t.accountId === existing.id).map((t) => t.id) : [],
          };
    save({ id: existing?.id, name: name.trim(), kind, limit: kind === 'credit' && l > 0 ? l : undefined, hideFromNetWorth: !inWorth, ...balFields });
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <Tap onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="close" size={20} color={colors.ink} />
        </Tap>
        <Text style={styles.title}>{existing ? 'Edit account' : 'New account'}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Chase Sapphire" placeholderTextColor={colors.faint} style={styles.input} />
        <Text style={styles.label}>Type</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {accountKinds.map((x) => (
            <Chip key={x.k} label={`${x.emoji} ${x.label}`} active={kind === x.k} onPress={() => setKind(x.k)} color={colors.ink} />
          ))}
        </View>
        {kind === 'credit' && (
          <>
            <Text style={styles.label}>Credit limit (optional)</Text>
            <TextInput value={limit} onChangeText={setLimit} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={colors.faint} style={styles.input} />
          </>
        )}
        <Text style={styles.label}>{kind === 'credit' ? 'Amount you owe right now' : 'Current balance'}</Text>
        <TextInput value={bal} onChangeText={setBal} keyboardType="decimal-pad" placeholder="Leave blank to skip" placeholderTextColor={colors.faint} style={styles.input} />
        <Text style={styles.help}>
          {kind === 'credit'
            ? 'Enter it once. Spending you log on this card raises it and refunds lower it.'
            : 'Enter it once. Money you log in or out of this account moves it automatically.'}
          {startBal !== undefined ? ` Right now it’s ${money(startBal, { cents: true })}.` : ''}
        </Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Count toward net worth</Text>
          <Switch value={inWorth} onValueChange={setInWorth} trackColor={{ true: colors.brand, false: colors.line }} />
        </View>
        <Button label={existing ? 'Save' : 'Add account'} onPress={onSave} style={{ marginTop: 26, opacity: name.trim() ? 1 : 0.4 }} />
        {existing && (
          <Button
            label="Delete account"
            kind="danger"
            style={{ marginTop: 12 }}
            onPress={() =>
              confirmAction('Delete account?', 'Past transactions stay, without an account name.', () => {
                del(existing.id);
                router.back();
              })
            }
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink },
  label: { fontSize: 13, fontWeight: '700', color: colors.sub, marginTop: 18, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  help: { fontSize: 13, color: colors.sub, marginTop: 8, marginHorizontal: 4, lineHeight: 18 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 16, height: 52, marginTop: 18 },
  switchText: { fontSize: 16, fontWeight: '600', color: colors.ink },
  input: { backgroundColor: colors.card, borderRadius: 16, height: 52, paddingHorizontal: 16, fontSize: 17, color: colors.ink, outlineStyle: 'none' } as any,
});
