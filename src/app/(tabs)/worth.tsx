import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { Bar, Card, EmojiBadge, Pill, SectionTitle, Tap } from '../../components/ui';
import { WorthChart } from '../../components/WorthChart';
import { money, toISO } from '../../lib/format';
import {
  accountHasBalance,
  assetGroups,
  daysSince,
  debtGroups,
  groupMeta,
  projectRetirement,
  retirementKinds,
  summarize,
  WorthLine,
  worthLines,
} from '../../lib/networth';
import { useStore } from '../../lib/store';
import { accountKinds, colors } from '../../lib/theme';

function tint(hex: string) {
  return `${hex}1F`;
}

export default function Worth() {
  const insets = useSafeAreaInsets();
  const accounts = useStore((s) => s.accounts);
  const items = useStore((s) => s.worthItems);
  const txns = useStore((s) => s.txns);
  const snapshots = useStore((s) => s.snapshots);
  const plan = useStore((s) => s.retirement);
  const setPlan = useStore((s) => s.setRetirement);

  const lines = useMemo(() => worthLines(accounts, items, txns), [accounts, items, txns]);
  const sum = useMemo(() => summarize(lines), [lines]);
  const missing = accounts.filter((a) => !accountHasBalance(a));

  // Change since about a month ago (or since the first snapshot, if newer).
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const cut = toISO(monthAgo);
  const base = [...snapshots].reverse().find((s) => s.date <= cut) ?? snapshots[0];
  const delta = base ? sum.net - (base.assets - base.debts) : 0;
  const deltaLabel = base && base.date <= cut ? 'in the last 30 days' : 'since you started';

  const retire = items.filter((i) => i.group === 'retirement');
  const retireTotal = retire.reduce((a, i) => a + i.value, 0);
  const retireYou = retire.reduce((a, i) => a + (i.monthlyYou ?? 0), 0);
  const retireEmp = retire.reduce((a, i) => a + (i.monthlyEmployer ?? 0), 0);
  const proj = projectRetirement(retireTotal, retireYou + retireEmp, plan);

  const assetsByGroup = assetGroups.map((g) => ({ ...g, lines: lines.filter((l) => !l.debt && l.group === g.g) })).filter((g) => g.lines.length);
  const debtsByGroup = debtGroups.map((g) => ({ ...g, lines: lines.filter((l) => l.debt && l.group === g.g) })).filter((g) => g.lines.length);
  const empty = lines.length === 0;

  function open(l: WorthLine) {
    if (l.accountId) router.push({ pathname: '/account', params: { id: l.accountId } });
    else router.push({ pathname: '/asset', params: { id: l.item!.id } });
  }

  function row(l: WorthLine, i: number) {
    const m = groupMeta(l.group);
    const stale = l.updated ? daysSince(l.updated) : 0;
    const rk = l.item?.retirementKind ? retirementKinds.find((r) => r.k === l.item!.retirementKind)?.label : undefined;
    const acctKind = l.accountId ? accountKinds.find((k) => k.k === accounts.find((a) => a.id === l.accountId)?.kind) : undefined;
    const sub = l.accountId
      ? `${acctKind?.label ?? 'Account'} · updates as you log`
      : stale > 30
        ? `${rk ? `${rk} · ` : ''}${stale} days old · tap to update`
        : [rk, stale === 0 ? 'Updated today' : stale === 1 ? 'Updated yesterday' : `Updated ${stale} days ago`].filter(Boolean).join(' · ');
    return (
      <Tap key={l.key} onPress={() => open(l)} style={[styles.row, i > 0 && styles.divider]}>
        <EmojiBadge emoji={acctKind?.emoji ?? m.emoji} tint={tint(m.color)} size={38} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {l.name}
          </Text>
          <Text style={[styles.rowSub, stale > 30 && { color: colors.warn }]} numberOfLines={1}>
            {sub}
          </Text>
        </View>
        <Text style={[styles.rowAmt, l.debt && { color: colors.bad }]}>{l.debt ? money(-l.value) : money(l.value)}</Text>
        <Icon name="chevron" size={16} color={colors.faint} />
      </Tap>
    );
  }

  function groupBlock(g: { g: string; label: string; color: string; lines: WorthLine[] }, debt: boolean) {
    const total = g.lines.reduce((a, l) => a + l.value, 0);
    return (
      <View key={g.g} style={{ marginBottom: 12 }}>
        <View style={styles.groupHead}>
          <View style={[styles.dot, { backgroundColor: g.color }]} />
          <Text style={styles.groupName}>{g.label}</Text>
          <Text style={[styles.groupTotal, debt && { color: colors.bad }]}>{debt ? money(-total) : money(total)}</Text>
        </View>
        <Card style={{ paddingVertical: 4 }}>{g.lines.map(row)}</Card>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={[colors.heroA, colors.heroB, colors.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 18 }]}>
        <View style={styles.blobA} />
        <Text style={styles.heroLabel}>Net worth</Text>
        <Text style={styles.heroBig} adjustsFontSizeToFit numberOfLines={1}>
          {money(sum.net)}
        </Text>
        {base && snapshots.length > 1 ? (
          <View style={styles.deltaPill}>
            <Text style={styles.deltaText}>
              {delta >= 0 ? '▲' : '▼'} {money(Math.abs(delta))} {deltaLabel}
            </Text>
          </View>
        ) : (
          <Text style={styles.heroSub}>What you own minus what you owe</Text>
        )}
        <View style={styles.heroSplit}>
          <View style={{ flex: 1 }}>
            <Text style={styles.splitLabel}>What you own</Text>
            <Text style={styles.splitVal}>{money(sum.assets)}</Text>
          </View>
          <View style={styles.splitLine} />
          <View style={{ flex: 1, paddingLeft: 16 }}>
            <Text style={styles.splitLabel}>What you owe</Text>
            <Text style={styles.splitVal}>{money(sum.debts)}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {empty ? (
          <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Text style={{ fontSize: 40 }}>🧭</Text>
            <Text style={[styles.rowTitle, { fontSize: 18, marginTop: 10 }]}>See everything in one number</Text>
            <Text style={[styles.rowSub, { textAlign: 'center', marginTop: 6, lineHeight: 19, paddingHorizontal: 10 }]}>
              Add your bank balances, savings, investments, 401(k), home and car, then the loans and cards you owe on. We’ll do the math.
            </Text>
            <Tap onPress={() => router.push({ pathname: '/asset', params: { debt: '0' } })} style={styles.cta}>
              <Text style={styles.ctaText}>＋ Add something you own</Text>
            </Tap>
            <Tap onPress={() => router.push({ pathname: '/asset', params: { debt: '1' } })} style={[styles.cta, styles.ctaGhost]}>
              <Text style={[styles.ctaText, { color: colors.ink }]}>＋ Add something you owe</Text>
            </Tap>
          </Card>
        ) : (
          <Card>
            <WorthChart snapshots={snapshots} current={sum.net} />
          </Card>
        )}

        {missing.length > 0 && (
          <Card style={[styles.nudge, { marginTop: 14 }]}>
            <Text style={styles.nudgeTitle}>💡 Add balances to your budget accounts</Text>
            <Text style={styles.nudgeSub}>Enter each balance once and it keeps itself up to date as you log spending.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
              {missing.map((a) => (
                <Tap key={a.id} onPress={() => router.push({ pathname: '/account', params: { id: a.id } })} style={styles.nudgeChip}>
                  <Text style={styles.nudgeChipText}>
                    {accountKinds.find((k) => k.k === a.kind)?.emoji} {a.name}
                  </Text>
                </Tap>
              ))}
            </View>
          </Card>
        )}

        {!empty && (
          <>
            <SectionTitle>Money you can actually use</SectionTitle>
            <Card>
              <View style={styles.useRow}>
                <Text style={{ fontSize: 22 }}>💵</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.rowTitle}>Spendable now</Text>
                  <Text style={styles.rowSub}>Checking, savings and cash</Text>
                </View>
                <Text style={[styles.useAmt, { color: colors.good }]}>{money(sum.spendableNow)}</Text>
              </View>
              {sum.spendableNow !== sum.spendableAfterCards && (
                <View style={styles.afterCards}>
                  <Text style={styles.rowSub}>After paying off your credit cards</Text>
                  <Text style={[styles.rowAmt, sum.spendableAfterCards < 0 && { color: colors.bad }]}>{money(sum.spendableAfterCards)}</Text>
                </View>
              )}
              <View style={[styles.useRow, styles.divider]}>
                <Text style={{ fontSize: 22 }}>⏳</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.rowTitle}>Could get in a few days</Text>
                  <Text style={styles.rowSub}>Investments & crypto (selling may mean taxes)</Text>
                </View>
                <Text style={styles.useAmt}>{money(sum.soon)}</Text>
              </View>
              <View style={[styles.useRow, styles.divider]}>
                <Text style={{ fontSize: 22 }}>🔒</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.rowTitle}>Locked up</Text>
                  <Text style={styles.rowSub}>Retirement, home, vehicles, other</Text>
                </View>
                <Text style={styles.useAmt}>{money(sum.locked)}</Text>
              </View>
              {sum.assets > 0 && (
                <>
                  <View style={styles.stack}>
                    {assetsByGroup.map((g) => {
                      const v = g.lines.reduce((a, l) => a + l.value, 0);
                      return v > 0 ? <View key={g.g} style={{ flex: v, backgroundColor: g.color }} /> : null;
                    })}
                  </View>
                  <View style={styles.legend}>
                    {assetsByGroup.map((g) => {
                      const v = g.lines.reduce((a, l) => a + l.value, 0);
                      if (v <= 0) return null;
                      return (
                        <View key={g.g} style={styles.legendItem}>
                          <View style={[styles.dot, { backgroundColor: g.color }]} />
                          <Text style={styles.legendText}>
                            {g.label} {Math.round((v / sum.assets) * 100)}%
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </Card>
          </>
        )}

        {retire.length > 0 && (
          <>
            <SectionTitle>Retirement</SectionTitle>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View>
                  <Text style={styles.rowSub}>Saved so far</Text>
                  <Text style={styles.bigNum}>{money(retireTotal)}</Text>
                </View>
                <Pill label={`${retire.length} account${retire.length > 1 ? 's' : ''}`} color={colors.brand} bg="#ECEAFE" />
              </View>
              {(retireYou > 0 || retireEmp > 0) && (
                <View style={{ marginTop: 14 }}>
                  <View style={styles.contribRow}>
                    <Text style={styles.rowSub}>You add</Text>
                    <Text style={styles.rowAmt}>{money(retireYou)}/mo</Text>
                  </View>
                  <View style={styles.contribRow}>
                    <Text style={styles.rowSub}>Employer adds</Text>
                    <Text style={[styles.rowAmt, { color: colors.good }]}>{money(retireEmp)}/mo</Text>
                  </View>
                  <View style={{ marginTop: 8 }}>
                    <Bar pct={retireYou + retireEmp > 0 ? retireYou / (retireYou + retireEmp) : 0} color={colors.brand} track={colors.goodBg} height={8} />
                  </View>
                  <Text style={[styles.rowSub, { marginTop: 6 }]}>
                    {money((retireYou + retireEmp) * 12)} a year going in
                    {retireEmp > 0 ? `, ${money(retireEmp * 12)} of it free from your employer` : ''}
                  </Text>
                </View>
              )}
              <View style={styles.planRow}>
                <View style={styles.planField}>
                  <Text style={styles.planLabel}>Your age</Text>
                  <TextInput
                    value={plan.age ? String(plan.age) : ''}
                    onChangeText={(t) => setPlan({ age: parseInt(t, 10) || undefined })}
                    keyboardType="number-pad"
                    placeholder="—"
                    placeholderTextColor={colors.faint}
                    style={styles.planInput}
                    maxLength={2}
                  />
                </View>
                <View style={styles.planField}>
                  <Text style={styles.planLabel}>Retire at</Text>
                  <TextInput
                    value={String(plan.retireAge)}
                    onChangeText={(t) => setPlan({ retireAge: parseInt(t, 10) || 0 })}
                    keyboardType="number-pad"
                    style={styles.planInput}
                    maxLength={2}
                  />
                </View>
                <View style={styles.planField}>
                  <Text style={styles.planLabel}>Growth %</Text>
                  <TextInput
                    value={String(plan.growth)}
                    onChangeText={(t) => setPlan({ growth: parseFloat(t) || 0 })}
                    keyboardType="decimal-pad"
                    style={styles.planInput}
                    maxLength={4}
                  />
                </View>
              </View>
              {proj ? (
                <View style={styles.proj}>
                  <Text style={styles.projLabel}>At {plan.retireAge} you could have about</Text>
                  <Text style={styles.projBig}>{money(Math.round(proj.total / 1000) * 1000)}</Text>
                  <Text style={styles.projSub}>
                    If you keep adding {money(retireYou + retireEmp)}/mo for {proj.years} years and it grows {plan.growth}% a year. That’s in future dollars, and real returns go up and
                    down, so treat it as a rough guide.
                  </Text>
                </View>
              ) : (
                <Text style={[styles.rowSub, { marginTop: 12 }]}>Enter your age to see an estimate of what you’ll have when you retire.</Text>
              )}
            </Card>
          </>
        )}

        {!empty && (
          <>
            <SectionTitle
              right={
                <Tap onPress={() => router.push({ pathname: '/asset', params: { debt: '0' } })}>
                  <Text style={styles.link}>＋ Add</Text>
                </Tap>
              }
            >
              What you own
            </SectionTitle>
            {assetsByGroup.length ? assetsByGroup.map((g) => groupBlock(g, false)) : <Text style={styles.none}>Nothing yet</Text>}

            <SectionTitle
              right={
                <Tap onPress={() => router.push({ pathname: '/asset', params: { debt: '1' } })}>
                  <Text style={styles.link}>＋ Add</Text>
                </Tap>
              }
            >
              What you owe
            </SectionTitle>
            {debtsByGroup.length ? debtsByGroup.map((g) => groupBlock(g, true)) : <Text style={styles.none}>No debts added 🎉</Text>}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 22, paddingBottom: 34, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden' },
  blobA: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.08)', top: -90, right: -80 },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },
  heroBig: { color: '#fff', fontSize: 48, fontWeight: '800', letterSpacing: -1.5, marginTop: 2 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500', marginTop: 2 },
  deltaPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginTop: 6 },
  deltaText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  heroSplit: { flexDirection: 'row', marginTop: 22, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 18, padding: 14 },
  splitLine: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  splitLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '600' },
  splitVal: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 2, letterSpacing: -0.4 },
  body: { paddingHorizontal: 20, marginTop: -18 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 6 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  rowSub: { fontSize: 13, color: colors.sub, marginTop: 2 },
  rowAmt: { fontSize: 15, fontWeight: '700', color: colors.ink },
  groupHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  groupName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.sub },
  groupTotal: { fontSize: 14, fontWeight: '700', color: colors.ink },
  link: { color: colors.brand, fontWeight: '700', fontSize: 14 },
  none: { color: colors.faint, fontSize: 14, paddingHorizontal: 4 },
  cta: { marginTop: 18, alignSelf: 'stretch', height: 50, borderRadius: 16, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  ctaGhost: { marginTop: 10, backgroundColor: colors.track },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  nudge: { backgroundColor: colors.warnBg },
  nudgeTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  nudgeSub: { fontSize: 13, color: colors.sub, marginTop: 4, lineHeight: 18 },
  nudgeChip: { backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  nudgeChipText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  useRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  useAmt: { fontSize: 18, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  afterCards: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6 },
  stack: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginTop: 14, gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 14, marginBottom: 6 },
  legendText: { fontSize: 12, color: colors.sub, fontWeight: '600' },
  bigNum: { fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.6, marginTop: 2 },
  contribRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  planRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  planField: { flex: 1, backgroundColor: colors.bg, borderRadius: 14, padding: 10 },
  planLabel: { fontSize: 11, fontWeight: '700', color: colors.sub, textTransform: 'uppercase', letterSpacing: 0.4 },
  planInput: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 2, padding: 0, outlineStyle: 'none' } as any,
  proj: { marginTop: 14, backgroundColor: '#ECEAFE', borderRadius: 16, padding: 14 },
  projLabel: { fontSize: 13, color: colors.brand, fontWeight: '700' },
  projBig: { fontSize: 30, fontWeight: '800', color: colors.ink, letterSpacing: -0.8, marginTop: 2 },
  projSub: { fontSize: 12, color: colors.sub, marginTop: 4, lineHeight: 17 },
});
