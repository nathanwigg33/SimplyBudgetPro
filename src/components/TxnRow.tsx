import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { money } from '../lib/format';
import { colors, typeMeta } from '../lib/theme';
import { Account, Category, Txn } from '../lib/types';
import { EmojiBadge, Tap } from './ui';

export function TxnRow({ t, cat, acct, showDate }: { t: Txn; cat?: Category; acct?: Account; showDate?: string }) {
  const meta = cat ? typeMeta[cat.type] : typeMeta.variable;
  const isIn = t.direction === 'in';
  const isRefund = isIn && cat?.type !== 'income';
  return (
    <Tap onPress={() => router.push({ pathname: '/add', params: { id: t.id } })} style={styles.row}>
      <EmojiBadge emoji={cat?.emoji ?? '❔'} tint={meta.tint} size={42} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.title} numberOfLines={1}>
          {t.desc || cat?.name || 'Transaction'}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {[showDate, cat?.name, acct?.name].filter(Boolean).join(' · ')}
          {isRefund ? ' · Refund' : ''}
        </Text>
      </View>
      <Text style={[styles.amt, isIn && { color: colors.good }]}>{isIn ? '+' : '-'}{money(t.amount, { cents: true })}</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  title: { fontSize: 16, fontWeight: '600', color: colors.ink },
  sub: { fontSize: 13, color: colors.sub, marginTop: 2 },
  amt: { fontSize: 16, fontWeight: '700', color: colors.ink, marginLeft: 8, fontVariant: ['tabular-nums'] },
});
