import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Chip, confirmAction, Tap, tap } from '../components/ui';
import { fromISO, shortDate, toISO } from '../lib/format';
import { useStore } from '../lib/store';
import { colors, typeMeta, typeOrder } from '../lib/theme';

export default function AddTxn() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const txns = useStore((s) => s.txns);
  const cats = useStore((s) => s.categories);
  const accts = useStore((s) => s.accounts);
  const saveTxn = useStore((s) => s.saveTxn);
  const deleteTxn = useStore((s) => s.deleteTxn);
  const existing = id ? txns.find((t) => t.id === id) : undefined;

  const recent = useMemo(() => [...txns].sort((a, b) => (a.date < b.date ? 1 : -1)), [txns]);
  const lastOut = recent.find((t) => t.direction === 'out');

  const [direction, setDirection] = useState<'in' | 'out'>(existing?.direction ?? 'out');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [desc, setDesc] = useState(existing?.desc ?? '');
  const [catId, setCatId] = useState(existing?.categoryId ?? lastOut?.categoryId ?? cats[0]?.id);
  const [acctId, setAcctId] = useState(existing?.accountId ?? lastOut?.accountId ?? accts[0]?.id);
  const [date, setDate] = useState(existing?.date ?? toISO(new Date()));
  const [touchedCat, setTouchedCat] = useState(!!existing);

  // Categories ordered: income first when money in, and most-used first within each.
  const useCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txns) m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + 1);
    return m;
  }, [txns]);
  const orderedCats = useMemo(() => {
    // income categories first for money in, last for money out; then most-used first
    const group = (type: string) => (type === 'income' ? (direction === 'in' ? 0 : 2) : 1);
    return [...cats].sort(
      (a, b) =>
        group(a.type) - group(b.type) ||
        (useCount.get(b.id) ?? 0) - (useCount.get(a.id) ?? 0) ||
        typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type),
    );
  }, [cats, useCount, direction]);

  const suggestions = useMemo(() => {
    const n = desc.trim().toLowerCase();
    if (!n) return [];
    const seen = new Set<string>();
    const out: typeof txns = [];
    for (const t of recent) {
      const k = t.desc.toLowerCase();
      if (k.startsWith(n) && k !== n && !seen.has(k)) {
        seen.add(k);
        out.push(t);
      }
      if (out.length >= 3) break;
    }
    return out;
  }, [desc, recent]);

  function onDesc(v: string) {
    setDesc(v);
    const match = recent.find((t) => t.desc.toLowerCase() === v.trim().toLowerCase());
    if (match && !touchedCat) {
      setCatId(match.categoryId);
      setAcctId(match.accountId);
    }
  }

  function pickSuggestion(t: (typeof txns)[number]) {
    tap();
    setDesc(t.desc);
    setCatId(t.categoryId);
    setAcctId(t.accountId);
    setDirection(t.direction);
    if (!amount) setAmount(String(t.amount));
  }

  function press(k: string) {
    tap();
    setAmount((a) => {
      if (k === '⌫') return a.slice(0, -1);
      if (k === '.') return a.includes('.') ? a : (a || '0') + '.';
      if (a.includes('.') && a.split('.')[1].length >= 2) return a;
      if (a === '0') return k;
      if (a.replace('.', '').length >= 8) return a;
      return a + k;
    });
  }

  const value = parseFloat(amount) || 0;
  const cat = cats.find((c) => c.id === catId);
  const isRefund = direction === 'in' && cat && cat.type !== 'income';
  const canSave = value > 0 && !!catId && !!acctId;

  function save() {
    if (!canSave) return;
    tap('success');
    saveTxn({
      id: existing?.id,
      date,
      desc: desc.trim() || cat?.name || '',
      categoryId: catId!,
      accountId: acctId!,
      amount: Math.round(value * 100) / 100,
      direction,
      sample: existing?.sample,
    });
    router.back();
  }

  const today = toISO(new Date());
  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  const yesterday = toISO(yd);
  const shiftDate = (n: number) => {
    const d = fromISO(date);
    d.setDate(d.getDate() + n);
    setDate(toISO(d));
  };

  const display = amount ? amount : '0';
  const [whole, cents] = display.split('.');
  const pretty = Number(whole).toLocaleString('en-US') + (cents !== undefined ? '.' + cents : '');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'ios' ? 12 : insets.top + 8 }}>
      <View style={styles.top}>
        <Tap onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
          <Icon name="close" size={20} color={colors.ink} />
        </Tap>
        <View style={styles.seg}>
          {(['out', 'in'] as const).map((d) => (
            <Tap
              key={d}
              onPress={() => {
                setDirection(d);
                if (!touchedCat) {
                  const pick = d === 'in' ? cats.find((c) => c.type === 'income') : cats.find((c) => c.id === lastOut?.categoryId);
                  if (pick) setCatId(pick.id);
                }
              }}
              style={[styles.segItem, direction === d && styles.segOn]}>
              <Text style={[styles.segText, direction === d && { color: d === 'in' ? colors.good : colors.ink }]}>{d === 'out' ? 'Money out' : 'Money in'}</Text>
            </Tap>
          ))}
        </View>
        {existing ? (
          <Tap
            onPress={() =>
              confirmAction('Delete transaction?', 'This can’t be undone.', () => {
                deleteTxn(existing.id);
                router.back();
              })
            }
            style={styles.iconBtn}
          >
            <Text style={{ fontSize: 17 }}>🗑</Text>
          </Tap>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.amountWrap}>
          <Text style={[styles.amount, { color: direction === 'in' ? colors.good : colors.ink }, !amount && { color: colors.faint }]} adjustsFontSizeToFit numberOfLines={1}>
            <Text style={styles.dollar}>$</Text>
            {pretty}
          </Text>
          {isRefund && <Text style={styles.refund}>Counts as a refund — lowers {cat!.name} spending</Text>}
        </View>

        <View style={styles.pad20}>
          <TextInput value={desc} onChangeText={onDesc} placeholder="What was it? (e.g. Kroger)" placeholderTextColor={colors.faint} style={styles.desc} returnKeyType="done" />
          {suggestions.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
              {suggestions.map((t) => (
                <Chip key={t.id} label={`${cats.find((c) => c.id === t.categoryId)?.emoji ?? ''} ${t.desc}`} onPress={() => pickSuggestion(t)} />
              ))}
            </View>
          )}
        </View>

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
          {orderedCats.map((c) => {
            const on = c.id === catId;
            const m = typeMeta[c.type];
            return (
              <Tap
                key={c.id}
                onPress={() => {
                  setCatId(c.id);
                  setTouchedCat(true);
                }}
                style={[styles.catTile, { backgroundColor: on ? m.color : colors.card }]}
              >
                <Text style={{ fontSize: 24 }}>{c.emoji}</Text>
                <Text style={[styles.catName, on && { color: '#fff' }]} numberOfLines={2}>
                  {c.name}
                </Text>
              </Tap>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Paid with</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
          {accts.map((a) => (
            <Chip key={a.id} label={a.name} active={a.id === acctId} onPress={() => setAcctId(a.id)} color={colors.ink} />
          ))}
        </ScrollView>

        <Text style={styles.label}>When</Text>
        <View style={[styles.pad20, { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }]}>
          <Chip label="Today" active={date === today} onPress={() => setDate(today)} color={colors.ink} />
          <Chip label="Yesterday" active={date === yesterday} onPress={() => setDate(yesterday)} color={colors.ink} />
          <View style={styles.stepper}>
            <Tap onPress={() => shiftDate(-1)} hitSlop={8} style={styles.stepBtn}>
              <Icon name="back" size={16} color={colors.ink} strokeWidth={2.4} />
            </Tap>
            <Text style={styles.stepText}>{shortDate(date)}</Text>
            <Tap onPress={() => shiftDate(1)} hitSlop={8} style={styles.stepBtn}>
              <Icon name="chevron" size={16} color={colors.ink} strokeWidth={2.4} />
            </Tap>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.padArea, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.keys}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((k) => (
            <Tap key={k} onPress={() => press(k)} haptic={false} style={styles.key}>
              <Text style={styles.keyText}>{k}</Text>
            </Tap>
          ))}
        </View>
        <Tap onPress={save} disabled={!canSave} style={[styles.save, !canSave && { opacity: 0.4 }]}>
          <Text style={styles.saveText}>{existing ? 'Save changes' : direction === 'in' ? 'Add money in' : 'Add expense'}</Text>
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', backgroundColor: colors.track, borderRadius: 14, padding: 3 },
  segItem: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 11 },
  segOn: { backgroundColor: colors.card, boxShadow: '0px 2px 6px rgba(0,0,0,0.08)' },
  segText: { fontSize: 14, fontWeight: '700', color: colors.sub },
  amountWrap: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20 },
  amount: { fontSize: 60, fontWeight: '800', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  dollar: { fontSize: 36, fontWeight: '700' },
  refund: { fontSize: 12, color: colors.good, fontWeight: '600', marginTop: 4 },
  pad20: { paddingHorizontal: 20 },
  desc: { backgroundColor: colors.card, borderRadius: 16, height: 50, paddingHorizontal: 16, fontSize: 16, color: colors.ink, outlineStyle: 'none' } as any,
  label: { fontSize: 13, fontWeight: '700', color: colors.sub, marginTop: 18, marginBottom: 10, paddingHorizontal: 24, textTransform: 'uppercase', letterSpacing: 0.6 },
  catTile: { width: 82, height: 82, borderRadius: 20, marginRight: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  catName: { fontSize: 11, fontWeight: '700', color: colors.ink, textAlign: 'center', marginTop: 4, lineHeight: 13 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 999, borderWidth: 1, borderColor: colors.line, marginBottom: 8, paddingHorizontal: 4 },
  stepBtn: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 14, fontWeight: '700', color: colors.ink, minWidth: 54, textAlign: 'center' },
  padArea: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 16, boxShadow: '0px -6px 20px rgba(26,24,80,0.06)' },
  keys: { flexDirection: 'row', flexWrap: 'wrap' },
  key: { width: '33.333%', height: 52, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 26, fontWeight: '600', color: colors.ink },
  save: { height: 56, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
