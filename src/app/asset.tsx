import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../components/Icon';
import { Button, Chip, confirmAction, Tap } from '../components/ui';
import { assetGroups, debtGroups, groupMeta, isDebt, retirementKinds } from '../lib/networth';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';
import { RetirementKind, WorthGroup } from '../lib/types';

const NAME_HINTS: Partial<Record<WorthGroup, string>> = {
  cash: 'e.g. Ally high-yield savings',
  investments: 'e.g. Fidelity brokerage',
  retirement: 'e.g. Work 401(k)',
  crypto: 'e.g. Coinbase',
  property: 'e.g. Our house',
  vehicle: 'e.g. 2021 Toyota Camry',
  otherAsset: 'e.g. Wedding ring',
  creditCard: 'e.g. Store card',
  mortgage: 'e.g. Home mortgage',
  autoLoan: 'e.g. Camry loan',
  studentLoan: 'e.g. Federal student loans',
  personalLoan: 'e.g. SoFi loan',
  medical: 'e.g. Hospital bill',
  otherDebt: 'e.g. Owed to Dad',
};

function num(s: string) {
  const n = parseFloat(s.replace(/[$,%]/g, ''));
  return isNaN(n) ? undefined : n;
}

export default function AssetEditor() {
  const params = useLocalSearchParams<{ id?: string; group?: WorthGroup; debt?: string }>();
  const items = useStore((s) => s.worthItems);
  const save = useStore((s) => s.saveWorthItem);
  const del = useStore((s) => s.deleteWorthItem);
  const existing = params.id ? items.find((i) => i.id === params.id) : undefined;

  const [owe, setOwe] = useState(existing ? isDebt(existing.group) : params.debt === '1' || (params.group ? isDebt(params.group) : false));
  const [group, setGroup] = useState<WorthGroup>(existing?.group ?? params.group ?? (owe ? 'creditCard' : 'cash'));
  const [name, setName] = useState(existing?.name ?? '');
  const [value, setValue] = useState(existing ? String(existing.value) : '');
  const [rk, setRk] = useState<RetirementKind>(existing?.retirementKind ?? '401k');
  const [you, setYou] = useState(existing?.monthlyYou ? String(existing.monthlyYou) : '');
  const [employer, setEmployer] = useState(existing?.monthlyEmployer ? String(existing.monthlyEmployer) : '');
  const [rate, setRate] = useState(existing?.rate !== undefined ? String(existing.rate) : '');
  const [payment, setPayment] = useState(existing?.payment ? String(existing.payment) : '');

  const groups = owe ? debtGroups : assetGroups;
  const v = num(value);
  const ok = name.trim() !== '' && v !== undefined && v >= 0;
  const meta = groupMeta(group);

  function switchSide(debt: boolean) {
    setOwe(debt);
    setGroup(debt ? 'creditCard' : 'cash');
  }

  function onSave() {
    if (!ok) return;
    const retire = group === 'retirement';
    const debt = isDebt(group);
    save({
      id: existing?.id,
      name: name.trim(),
      group,
      value: v!,
      retirementKind: retire ? rk : undefined,
      monthlyYou: retire ? num(you) : undefined,
      monthlyEmployer: retire ? num(employer) : undefined,
      rate: debt ? num(rate) : undefined,
      payment: debt ? num(payment) : undefined,
    });
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <Tap onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="close" size={20} color={colors.ink} />
        </Tap>
        <Text style={styles.title}>{existing ? `Edit ${owe ? 'debt' : 'asset'}` : owe ? 'Add something you owe' : 'Add something you own'}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
        {!existing && (
          <View style={styles.seg}>
            <Tap onPress={() => switchSide(false)} style={[styles.segBtn, !owe && styles.segOn]}>
              <Text style={[styles.segText, !owe && { color: colors.good }]}>I own it</Text>
            </Tap>
            <Tap onPress={() => switchSide(true)} style={[styles.segBtn, owe && styles.segOn]}>
              <Text style={[styles.segText, owe && { color: colors.bad }]}>I owe it</Text>
            </Tap>
          </View>
        )}

        <Text style={styles.label}>Type</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {groups.map((x) => (
            <Chip key={x.g} label={`${x.emoji} ${x.label}`} active={group === x.g} onPress={() => setGroup(x.g)} color={colors.ink} />
          ))}
        </View>
        {'hint' in meta && <Text style={styles.help}>{meta.hint}</Text>}

        {group === 'retirement' && (
          <>
            <Text style={styles.label}>Account type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {retirementKinds.map((x) => (
                <Chip key={x.k} label={x.label} active={rk === x.k} onPress={() => setRk(x.k)} color={colors.brand} />
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Name</Text>
        <TextInput value={name} onChangeText={setName} placeholder={NAME_HINTS[group]} placeholderTextColor={colors.faint} style={styles.input} />

        <Text style={styles.label}>{owe ? 'Amount you owe' : group === 'property' || group === 'vehicle' || group === 'otherAsset' ? 'What it’s worth today' : 'Current balance'}</Text>
        <TextInput value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={colors.faint} style={styles.input} />
        {(group === 'property' || group === 'vehicle') && (
          <Text style={styles.help}>
            {group === 'property'
              ? 'A Zillow or Redfin estimate is a good starting point. Add the mortgage separately under “I owe it”.'
              : 'Kelley Blue Book’s private-party value is a good estimate. Add any car loan separately under “I owe it”.'}
          </Text>
        )}

        {group === 'retirement' && (
          <>
            <Text style={styles.label}>You put in each month (optional)</Text>
            <TextInput value={you} onChangeText={setYou} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={colors.faint} style={styles.input} />
            {(rk === '401k' || rk === 'roth401k' || rk === '403b' || rk === 'hsa') && (
              <>
                <Text style={styles.label}>Employer adds each month (optional)</Text>
                <TextInput value={employer} onChangeText={setEmployer} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={colors.faint} style={styles.input} />
                <Text style={styles.help}>Your pay stub usually shows the employer match in dollars.</Text>
              </>
            )}
          </>
        )}

        {owe && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Interest rate</Text>
              <TextInput value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="e.g. 6.5%" placeholderTextColor={colors.faint} style={styles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Monthly payment</Text>
              <TextInput value={payment} onChangeText={setPayment} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={colors.faint} style={styles.input} />
            </View>
          </View>
        )}

        <Button label={existing ? 'Save' : 'Add'} onPress={onSave} style={{ marginTop: 26, opacity: ok ? 1 : 0.4 }} />
        {existing && (
          <Button
            label="Delete"
            kind="danger"
            style={{ marginTop: 12 }}
            onPress={() =>
              confirmAction(`Delete ${existing.name}?`, 'It comes off your net worth. Your past chart stays as it was.', () => {
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
  seg: { flexDirection: 'row', backgroundColor: colors.track, borderRadius: 16, padding: 4 },
  segBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.card, boxShadow: '0px 2px 8px rgba(26,24,80,0.08)' } as any,
  segText: { fontSize: 15, fontWeight: '700', color: colors.sub },
  label: { fontSize: 13, fontWeight: '700', color: colors.sub, marginTop: 18, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  help: { fontSize: 13, color: colors.sub, marginTop: 4, marginHorizontal: 4, lineHeight: 18 },
  input: { backgroundColor: colors.card, borderRadius: 16, height: 52, paddingHorizontal: 16, fontSize: 17, color: colors.ink, outlineStyle: 'none' } as any,
});
