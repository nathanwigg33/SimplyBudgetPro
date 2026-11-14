import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { monthKey, monthLabel, shiftMonth } from '../lib/format';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';
import { Tap } from './ui';

export function MonthSwitcher({ light }: { light?: boolean }) {
  const month = useStore((s) => s.month);
  const setMonth = useStore((s) => s.setMonth);
  const isNow = month === monthKey(new Date());
  const fg = light ? '#fff' : colors.ink;
  const bg = light ? 'rgba(255,255,255,0.16)' : colors.card;
  return (
    <View style={styles.wrap}>
      <Tap onPress={() => setMonth(shiftMonth(month, -1))} style={[styles.arrow, { backgroundColor: bg }]} hitSlop={8}>
        <Text style={[styles.arrowText, { color: fg }]}>‹</Text>
      </Tap>
      <Tap onPress={() => setMonth(monthKey(new Date()))} haptic={!isNow} style={styles.labelWrap}>
        <Text style={[styles.label, { color: fg }]}>{monthLabel(month)}</Text>
        {!isNow && <Text style={[styles.back, { color: light ? 'rgba(255,255,255,0.75)' : colors.brand }]}>Tap for this month</Text>}
      </Tap>
      <Tap onPress={() => setMonth(shiftMonth(month, 1))} style={[styles.arrow, { backgroundColor: bg }]} hitSlop={8}>
        <Text style={[styles.arrowText, { color: fg }]}>›</Text>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 22, fontWeight: '600', marginTop: -2 },
  labelWrap: { alignItems: 'center', paddingHorizontal: 12 },
  label: { fontSize: 15, fontWeight: '700' },
  back: { fontSize: 11, fontWeight: '600', marginTop: 1 },
});
