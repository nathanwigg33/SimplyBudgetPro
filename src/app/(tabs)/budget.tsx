import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MonthSwitcher } from '../../components/MonthSwitcher';
import { Bar, Card, Chip, EmojiBadge, Tap } from '../../components/ui';
import { CatLine } from '../../lib/calc';
import { money } from '../../lib/format';
import { colors, typeMeta, typeOrder } from '../../lib/theme';
import { CategoryType } from '../../lib/types';
import { useSummary } from '../../lib/useSummary';

type Filter = 'all' | CategoryType;

export default function Budget() {
  const insets = useSafeAreaInsets();
  const s = useSummary();
  const [filter, setFilter] = useState<Filter>('all');
  const [showUnused, setShowUnused] = useState(false);
  const unused = s.lines.filter((l) => l.status === 'none').length;

  const outTypes = typeOrder.filter((k) => k !== 'income' && s.byType[k].budget > 0);
  const total = outTypes.reduce((a, k) => a + s.byType[k].budget, 0) || 1;
  const groups = typeOrder.filter((k) => filter === 'all' || filter === k);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Budget</Text>
      <View style={{ marginTop: 12 }}>
        <MonthSwitcher />
      </View>

      <Card style={{ marginTop: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={styles.label}>Spent so far</Text>
            <Text style={styles.big}>{money(s.spent)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.label}>{s.leftInBudget < 0 ? 'Over by' : 'Remaining'}</Text>
            <Text style={[styles.mid, { color: s.leftInBudget < 0 ? colors.bad : colors.good }]}>{money(Math.abs(s.leftInBudget))}</Text>
          </View>
        </View>

        {/* stacked plan bar: each segment is a type's budget share, filled by actual */}
        <View style={styles.stack}>
          {outTypes.map((k) => {
            const v = s.byType[k];
            const fill = Math.min(1, v.budget ? v.actual / v.budget : 0);
            return (
              <View key={k} style={{ flex: v.budget / total, height: '100%', backgroundColor: typeMeta[k].tint, marginRight: 3, borderRadius: 6, overflow: 'hidden' }}>
                <View style={{ width: `${fill * 100}%`, height: '100%', backgroundColor: typeMeta[k].color }} />
              </View>
            );
          })}
        </View>
        <View style={styles.legend}>
          {outTypes.map((k) => (
            <View key={k} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: typeMeta[k].color }]} />
              <Text style={styles.legendText}>
                {typeMeta[k].label} {Math.round((s.byType[k].actual / (s.byType[k].budget || 1)) * 100)}%
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
        <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        {typeOrder.map((k) => (
          <Chip key={k} label={`${typeMeta[k].emoji} ${typeMeta[k].label}`} active={filter === k} color={typeMeta[k].color} onPress={() => setFilter(k)} />
        ))}
      </ScrollView>

      {groups.map((k) => {
        const lines = s.lines.filter((l) => l.cat.type === k && (showUnused || l.status !== 'none'));
        if (!lines.length) return null;
        const v = s.byType[k];
        return (
          <View key={k} style={{ marginTop: 18 }}>
            <View style={styles.groupHead}>
              <Text style={styles.groupTitle}>
                {typeMeta[k].emoji}  {typeMeta[k].plural}
              </Text>
              <Text style={styles.groupSum}>
                {money(v.actual)} <Text style={{ color: colors.faint }}>/ {money(v.budget)}</Text>
              </Text>
            </View>
            <Card style={{ paddingVertical: 4 }}>
              {lines.map((l, i) => (
                <CatRow key={l.cat.id} l={l} first={i === 0} />
              ))}
            </Card>
          </View>
        );
      })}

      {unused > 0 && (
        <Tap onPress={() => setShowUnused((v) => !v)} style={{ alignItems: 'center', marginTop: 18 }}>
          <Text style={{ color: colors.sub, fontWeight: '600', fontSize: 14 }}>
            {showUnused ? 'Hide' : 'Show'} {unused} unused {unused === 1 ? 'category' : 'categories'}
          </Text>
        </Tap>
      )}

      <Tap onPress={() => router.push({ pathname: '/category', params: filter !== 'all' ? { type: filter } : {} })} style={styles.add}>
        <Text style={styles.addText}>＋  Add a category</Text>
      </Tap>
    </ScrollView>
  );
}

function CatRow({ l, first }: { l: CatLine; first: boolean }) {
  const m = typeMeta[l.cat.type];
  const isIncome = l.cat.type === 'income';
  let right = '';
  let rc: string = colors.sub;
  if (l.status === 'none') right = 'Not budgeted';
  else if (isIncome) {
    right = l.actual >= l.budget ? 'Received ✓' : `${money(l.budget - l.actual)} to come`;
    rc = l.actual >= l.budget ? colors.good : colors.sub;
  } else if (l.status === 'over') {
    right = `${money(-l.left)} over`;
    rc = colors.bad;
  } else if (l.status === 'done') {
    right = 'Done ✓';
    rc = colors.good;
  } else {
    right = `${money(l.left)} left`;
    rc = l.status === 'near' ? colors.warn : colors.sub;
  }
  const barColor = l.status === 'over' ? colors.bad : l.status === 'near' ? colors.warn : m.color;
  return (
    <Tap onPress={() => router.push({ pathname: '/category', params: { id: l.cat.id } })} style={[styles.row, !first && styles.divider]}>
      <EmojiBadge emoji={l.cat.emoji} tint={m.tint} size={40} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {l.cat.name}
          </Text>
          <Text style={[styles.rowRight, { color: rc }]}>{right}</Text>
        </View>
        <Bar pct={l.budget ? l.actual / l.budget : 0} color={barColor} height={7} />
        <Text style={styles.rowSub}>
          {money(l.actual)} of {money(l.budget)}
        </Text>
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: '800', color: colors.ink, letterSpacing: -0.8 },
  label: { fontSize: 13, color: colors.sub, fontWeight: '600' },
  big: { fontSize: 32, fontWeight: '800', color: colors.ink, letterSpacing: -1, marginTop: 2 },
  mid: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  stack: { flexDirection: 'row', height: 14, marginTop: 16 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 14, marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 12, color: colors.sub, fontWeight: '600' },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
  groupTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  groupSum: { fontSize: 14, fontWeight: '700', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.ink, flexShrink: 1 },
  rowRight: { fontSize: 13, fontWeight: '700', marginLeft: 8 },
  rowSub: { fontSize: 12, color: colors.faint, marginTop: 5, fontWeight: '500' },
  add: { marginTop: 20, height: 52, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#C9CBE0', alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 15, fontWeight: '700', color: colors.brand },
});
