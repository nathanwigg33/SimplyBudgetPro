import React, { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { MonthSwitcher } from '../../components/MonthSwitcher';
import { TxnRow } from '../../components/TxnRow';
import { Chip } from '../../components/ui';
import { dayLabel, money } from '../../lib/format';
import { useStore } from '../../lib/store';
import { colors, shadow } from '../../lib/theme';
import { Txn } from '../../lib/types';

type F = 'all' | 'in' | 'out';

export default function Activity() {
  const insets = useSafeAreaInsets();
  const txns = useStore((s) => s.txns);
  const cats = useStore((s) => s.categories);
  const accts = useStore((s) => s.accounts);
  const month = useStore((s) => s.month);
  const [q, setQ] = useState('');
  const [f, setF] = useState<F>('all');

  const sections = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = txns
      .filter((t) => (needle ? true : t.date.startsWith(month)))
      .filter((t) => f === 'all' || t.direction === f)
      .filter((t) => {
        if (!needle) return true;
        const c = cats.find((x) => x.id === t.categoryId)?.name ?? '';
        return `${t.desc} ${c} ${t.note ?? ''}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const map = new Map<string, Txn[]>();
    for (const t of list) map.set(t.date, [...(map.get(t.date) ?? []), t]);
    return [...map.entries()].map(([date, data]) => ({
      date,
      data,
      net: data.reduce((a, t) => a + (t.direction === 'in' ? t.amount : -t.amount), 0),
    }));
  }, [txns, cats, month, q, f]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={styles.h1}>Activity</Text>
        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.faint} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search all transactions" placeholderTextColor={colors.faint} style={styles.searchInput} clearButtonMode="while-editing" />
        </View>
        {!q && (
          <View style={{ marginTop: 12 }}>
            <MonthSwitcher />
          </View>
        )}
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <Chip label="All" active={f === 'all'} onPress={() => setF('all')} />
          <Chip label="Money in" active={f === 'in'} color={colors.good} onPress={() => setF('in')} />
          <Chip label="Money out" active={f === 'out'} color={colors.ink} onPress={() => setF('out')} />
        </View>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        renderSectionHeader={({ section }) => (
          <View style={styles.dayHead}>
            <Text style={styles.day}>{dayLabel(section.date)}</Text>
            <Text style={styles.dayNet}>{money(section.net, { sign: true, cents: true })}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.item,
              index === 0 && styles.first,
              index === section.data.length - 1 && styles.last,
              index > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
            ]}
          >
            <TxnRow t={item} cat={cats.find((c) => c.id === item.categoryId)} acct={accts.find((a) => a.id === item.accountId)} />
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 40 }}>{q ? '🔍' : '🌱'}</Text>
            <Text style={styles.emptyT}>{q ? 'No matches' : 'No transactions yet'}</Text>
            <Text style={styles.emptyS}>{q ? 'Try a different word' : 'Tap + to log one in seconds'}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: '800', color: colors.ink, letterSpacing: -0.8 },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 14, height: 46, marginTop: 14, ...shadow },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: colors.ink, outlineStyle: 'none' } as any,
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 8, paddingHorizontal: 4 },
  day: { fontSize: 14, fontWeight: '700', color: colors.sub },
  dayNet: { fontSize: 13, fontWeight: '600', color: colors.faint },
  item: { backgroundColor: colors.card, paddingHorizontal: 14 },
  first: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 4 },
  last: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingBottom: 4 },
  emptyT: { fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: 10 },
  emptyS: { fontSize: 14, color: colors.sub, marginTop: 4 },
});
