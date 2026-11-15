import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGrad, Path, Stop } from 'react-native-svg';
import { fromISO, money, shortDate, toISO } from '../lib/format';
import { colors } from '../lib/theme';
import { WorthSnapshot } from '../lib/types';
import { Chip } from './ui';

type Range = '1M' | '3M' | '1Y' | 'All';
const DAYS: Record<Range, number> = { '1M': 31, '3M': 92, '1Y': 366, All: 100000 };

function compact(n: number) {
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(a >= 1e5 ? 0 : 1)}K`;
  return money(n);
}

/** Line chart of net worth over time, drawn from the daily snapshots. */
export function WorthChart({ snapshots, current }: { snapshots: WorthSnapshot[]; current: number }) {
  const [range, setRange] = useState<Range>('3M');
  const [w, setW] = useState(0);
  const H = 150;

  const pts = useMemo(() => {
    const today = toISO(new Date());
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DAYS[range]);
    const cut = toISO(cutoff);
    const all = snapshots.map((s) => ({ date: s.date, v: s.assets - s.debts }));
    // The value going into the window, so the line starts at the left edge.
    const before = [...all].reverse().find((p) => p.date < cut);
    const inside = all.filter((p) => p.date >= cut);
    const list = before ? [{ date: cut, v: before.v }, ...inside] : inside;
    if (list.length && list[list.length - 1].date !== today) list.push({ date: today, v: current });
    return list;
  }, [snapshots, current, range]);

  const enough = pts.length >= 2;
  const t0 = enough ? fromISO(pts[0].date).getTime() : 0;
  const t1 = enough ? fromISO(pts[pts.length - 1].date).getTime() : 1;
  const vals = pts.map((p) => p.v);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi === lo) {
    hi += Math.max(100, Math.abs(hi) * 0.05);
    lo -= Math.max(100, Math.abs(lo) * 0.05);
  }
  const pad = 10;
  const x = (d: string) => (t1 === t0 ? w : ((fromISO(d).getTime() - t0) / (t1 - t0)) * w);
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (H - pad * 2);

  // Step line: a balance holds until the day it changes.
  let line = '';
  pts.forEach((p, i) => {
    const px = x(p.date).toFixed(1);
    const py = y(p.v).toFixed(1);
    if (i === 0) line = `M${px},${py}`;
    else line += ` H${px} V${py}`;
  });
  const area = `${line} V${H} H0 Z`;
  const first = pts[0]?.v ?? 0;
  const change = current - first;
  const up = change >= 0;
  const stroke = up ? colors.good : colors.bad;

  return (
    <View>
      <View style={styles.headRow}>
        <View>
          <Text style={styles.label}>Change over {range === 'All' ? 'all time' : range === '1Y' ? 'the past year' : range === '3M' ? '3 months' : 'the past month'}</Text>
          <Text style={[styles.change, { color: enough ? stroke : colors.faint }]}>{enough ? money(change, { sign: true }) : '—'}</Text>
        </View>
        {enough && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.small}>High {compact(Math.max(...vals))}</Text>
            <Text style={styles.small}>Low {compact(Math.min(...vals))}</Text>
          </View>
        )}
      </View>
      <View style={{ height: H, marginTop: 12 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {enough && w > 0 ? (
          <Svg width={w} height={H}>
            <Defs>
              <SvgGrad id="nwFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={stroke} stopOpacity={0.22} />
                <Stop offset="1" stopColor={stroke} stopOpacity={0} />
              </SvgGrad>
            </Defs>
            {lo < 0 && hi > 0 && <Line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke={colors.line} strokeWidth={1} strokeDasharray="4 4" />}
            <Path d={area} fill="url(#nwFill)" />
            <Path d={line} stroke={stroke} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            <Circle cx={x(pts[pts.length - 1].date)} cy={y(pts[pts.length - 1].v)} r={4.5} fill={stroke} stroke="#fff" strokeWidth={2} />
          </Svg>
        ) : (
          <View style={styles.empty}>
            <Text style={{ fontSize: 28 }}>📈</Text>
            <Text style={styles.emptyText}>Your chart starts today.{'\n'}Each time a balance changes, a new point is added.</Text>
          </View>
        )}
      </View>
      {enough && (
        <View style={styles.axis}>
          <Text style={styles.small}>{shortDate(pts[0].date)}</Text>
          <Text style={styles.small}>Today</Text>
        </View>
      )}
      <View style={styles.ranges}>
        {(['1M', '3M', '1Y', 'All'] as Range[]).map((r) => (
          <Chip key={r} label={r} active={range === r} onPress={() => setRange(r)} color={colors.ink} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: 13, color: colors.sub, fontWeight: '600' },
  change: { fontSize: 22, fontWeight: '800', marginTop: 2, letterSpacing: -0.4 },
  small: { fontSize: 12, color: colors.faint, fontWeight: '600' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  ranges: { flexDirection: 'row', justifyContent: 'center', marginTop: 14, marginBottom: -8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, borderRadius: 16 },
  emptyText: { fontSize: 13, color: colors.sub, textAlign: 'center', marginTop: 6, lineHeight: 18 },
});
