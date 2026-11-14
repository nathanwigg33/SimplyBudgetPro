import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MonthSwitcher } from '../../components/MonthSwitcher';
import { TxnRow } from '../../components/TxnRow';
import { Bar, Card, EmojiBadge, Pill, Ring, SectionTitle, Tap } from '../../components/ui';
import { greeting, money, shortDate } from '../../lib/format';
import { useStore } from '../../lib/store';
import { colors, typeMeta, typeOrder } from '../../lib/theme';
import { useSummary } from '../../lib/useSummary';

export default function Home() {
  const insets = useSafeAreaInsets();
  const name = useStore((s) => s.name);
  const accounts = useStore((s) => s.accounts);
  const s = useSummary();

  const over = s.leftInBudget < 0;
  const heroLabel = over ? 'Over budget by' : 'Left to spend';
  const watch = s.lines
    .filter((l) => l.cat.type !== 'income' && (l.status === 'over' || l.status === 'near'))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);
  const recent = [...s.monthTxns].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  const top = s.lines
    .filter((l) => l.cat.type !== 'income' && l.actual > 0)
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 5);
  const topMax = top[0]?.actual ?? 1;

  let mood = { text: 'Right on track', color: colors.good, bg: colors.goodBg };
  if (s.usedPct > 1) mood = { text: 'Over budget', color: colors.bad, bg: colors.badBg };
  else {
    // Bills land early in the month, so judge pace on everyday (variable) spending only.
    const v = s.byType.variable;
    const pace = v.budget > 0 ? v.actual / v.budget : 0;
    const elapsed = s.daysInMonth ? s.daysSoFar / s.daysInMonth : 0;
    if (s.isCurrent && pace > elapsed + 0.15) mood = { text: 'Everyday spending is running fast', color: colors.warn, bg: colors.warnBg };
    else if (s.isPast) mood = s.leftInBudget >= 0 ? { text: 'Finished under budget 🎉', color: colors.good, bg: colors.goodBg } : mood;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={[colors.heroA, colors.heroB, colors.heroC]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 14 }]}
      >
        <View style={styles.blobA} />
        <View style={styles.blobB} />
        <Text style={styles.hello}>
          {greeting()}{name ? `, ${name}` : ''} 👋
        </Text>
        <View style={{ marginTop: 14, marginBottom: 18 }}>
          <MonthSwitcher light />
        </View>

        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>{heroLabel}</Text>
            <Text style={styles.heroBig} adjustsFontSizeToFit numberOfLines={1}>
              {money(Math.abs(s.leftInBudget))}
            </Text>
            <Text style={styles.heroSub}>of {money(s.outBudget)} budgeted</Text>
            {s.isCurrent && s.daysLeft > 0 && (
              <View style={styles.safe}>
                <Text style={styles.safeBig}>{money(s.safePerDay)}/day</Text>
                <Text style={styles.safeSub}>safe to spend · {s.daysLeft} days left</Text>
              </View>
            )}
          </View>
          <Ring pct={s.usedPct} size={128} stroke={13} to={over ? '#FFB4B4' : '#CFC2FF'}>
            <Text style={styles.ringPct}>{Math.round(s.usedPct * 100)}%</Text>
            <Text style={styles.ringSub}>used</Text>
          </Ring>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Income / Spent / Left over */}
        <View style={styles.trio}>
          <Card style={styles.mini}>
            <Text style={styles.miniLabel}>💰 Income</Text>
            <Text style={styles.miniVal}>{money(s.income)}</Text>
            <Text style={styles.miniSub}>of {money(s.incomeBudget)}</Text>
          </Card>
          <Card style={styles.mini}>
            <Text style={styles.miniLabel}>🧾 Spent</Text>
            <Text style={styles.miniVal}>{money(s.spent)}</Text>
            <Text style={styles.miniSub}>{s.income > 0 ? `${Math.round((s.spent / s.income) * 100)}% of income` : '—'}</Text>
          </Card>
          <Card style={styles.mini}>
            <Text style={styles.miniLabel}>🏆 Left over</Text>
            <Text style={[styles.miniVal, { color: s.leftOver < 0 ? colors.bad : colors.good }]}>{money(s.leftOver)}</Text>
            <Text style={styles.miniSub}>income − out</Text>
          </Card>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingHorizontal: 4 }}>
          <Pill label={mood.text} color={mood.color} bg={mood.bg} />
          {s.daysSoFar > 0 && <Text style={styles.avg}>  Avg {money(s.avgPerDay)}/day so far</Text>}
        </View>

        {/* Heads up */}
        {watch.length > 0 && (
          <>
            <SectionTitle>Heads up</SectionTitle>
            <Card style={{ paddingVertical: 8 }}>
              {watch.map((l, i) => (
                <Tap key={l.cat.id} onPress={() => router.push({ pathname: '/category', params: { id: l.cat.id } })} style={[styles.watchRow, i > 0 && styles.divider]}>
                  <EmojiBadge emoji={l.cat.emoji} tint={typeMeta[l.cat.type].tint} size={38} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.rowTitle}>{l.cat.name}</Text>
                    <Text style={styles.rowSub}>
                      {money(l.actual)} of {money(l.budget)}
                    </Text>
                  </View>
                  <Pill
                    label={l.status === 'over' ? `${money(-l.left)} over` : `${money(l.left)} left`}
                    color={l.status === 'over' ? colors.bad : colors.warn}
                    bg={l.status === 'over' ? colors.badBg : colors.warnBg}
                  />
                </Tap>
              ))}
            </Card>
          </>
        )}

        {/* By type */}
        <SectionTitle>Where it's going</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {typeOrder
            .filter((k) => k !== 'income' && (s.byType[k].budget > 0 || s.byType[k].actual > 0))
            .map((k) => {
              const m = typeMeta[k];
              const v = s.byType[k];
              const pct = v.budget > 0 ? v.actual / v.budget : 0;
              return (
                <Tap key={k} onPress={() => router.navigate('/budget')} style={[styles.typeCard, { backgroundColor: m.tint }]}>
                  <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                  <Text style={[styles.typeName, { color: m.color }]}>{m.label}</Text>
                  <Text style={styles.typeVal}>{money(v.actual)}</Text>
                  <Text style={styles.typeSub}>of {money(v.budget)}</Text>
                  <View style={{ marginTop: 10 }}>
                    <Bar pct={pct} color={pct > 1 ? colors.bad : m.color} height={6} track="rgba(255,255,255,0.8)" />
                  </View>
                </Tap>
              );
            })}
        </ScrollView>

        {/* Top categories */}
        {top.length > 0 && (
          <>
            <SectionTitle>Top categories</SectionTitle>
            <Card>
              {top.map((l, i) => (
                <View key={l.cat.id} style={[{ paddingVertical: 9 }, i > 0 && styles.divider]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 16, width: 28 }}>{l.cat.emoji}</Text>
                    <Text style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>
                      {l.cat.name}
                    </Text>
                    <Text style={styles.rowAmt}>{money(l.actual)}</Text>
                  </View>
                  <Bar pct={l.actual / topMax} color={typeMeta[l.cat.type].color} height={6} />
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Recent */}
        <SectionTitle
          right={
            <Tap onPress={() => router.navigate('/activity')}>
              <Text style={styles.link}>See all</Text>
            </Tap>
          }
        >
          Recent
        </SectionTitle>
        <Card style={{ paddingVertical: 6 }}>
          {recent.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 26 }}>
              <Text style={{ fontSize: 34 }}>🌱</Text>
              <Text style={[styles.rowTitle, { marginTop: 8 }]}>Nothing logged this month</Text>
              <Text style={styles.rowSub}>Tap the + button to add your first one</Text>
            </View>
          ) : (
            recent.map((t, i) => (
              <View key={t.id} style={i > 0 ? styles.divider : undefined}>
                <TxnRow
                  t={t}
                  cat={s.lines.find((l) => l.cat.id === t.categoryId)?.cat}
                  acct={accounts.find((a) => a.id === t.accountId)}
                  showDate={shortDate(t.date)}
                />
              </View>
            ))
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 22, paddingBottom: 30, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden' },
  blobA: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.08)', top: -90, right: -80 },
  blobB: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -70, left: -40 },
  hello: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600' },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 14, fontWeight: '600' },
  heroBig: { color: '#fff', fontSize: 46, fontWeight: '800', letterSpacing: -1.5, marginTop: 2 },
  heroSub: { color: 'rgba(255,255,255,0.72)', fontSize: 13, fontWeight: '500' },
  safe: { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  safeBig: { color: '#fff', fontSize: 17, fontWeight: '800' },
  safeSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500', marginTop: 1 },
  ringPct: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  ringSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', marginTop: -2 },
  body: { paddingHorizontal: 20, marginTop: -18 },
  trio: { flexDirection: 'row', gap: 10 },
  mini: { flex: 1, padding: 14, borderRadius: 20 },
  miniLabel: { fontSize: 12, color: colors.sub, fontWeight: '600' },
  miniVal: { fontSize: 19, fontWeight: '800', color: colors.ink, marginTop: 6, letterSpacing: -0.4 },
  miniSub: { fontSize: 11, color: colors.faint, marginTop: 2, fontWeight: '500' },
  avg: { fontSize: 13, color: colors.sub, fontWeight: '500' },
  watchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  rowSub: { fontSize: 13, color: colors.sub, marginTop: 2 },
  rowAmt: { fontSize: 15, fontWeight: '700', color: colors.ink },
  typeCard: { width: 132, borderRadius: 22, padding: 14, marginRight: 10 },
  typeName: { fontSize: 13, fontWeight: '700', marginTop: 8 },
  typeVal: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 2, letterSpacing: -0.4 },
  typeSub: { fontSize: 12, color: colors.sub, fontWeight: '500' },
  link: { color: colors.brand, fontWeight: '700', fontSize: 14 },
});
