import * as Haptics from 'expo-haptics';
import React from 'react';
import { Alert, Platform, Pressable, PressableProps, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { colors, radius, shadow } from '../lib/theme';

export function tap(kind: 'light' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  try {
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

export function confirmAction(title: string, msg: string, ...rest: [string, () => void] | [() => void]) {
  const action = rest.length === 2 ? rest[0] : 'Delete';
  const ok = rest.length === 2 ? rest[1] : rest[0];
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${msg}`)) ok();
    return;
  }
  Alert.alert(title, msg, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: ok },
  ]);
}

/** Pressable that gently shrinks when touched. */
export function Tap({ style, children, haptic = true, onPress, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; haptic?: boolean }) {
  return (
    <Pressable
      {...rest}
      onPress={(e) => {
        if (haptic) tap();
        onPress?.(e);
      }}
      style={({ pressed }) => [style, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]}
    >
      {children as React.ReactNode}
    </Pressable>
  );
}

export function Card({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right, style }: { children: React.ReactNode; right?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sectionRow, style]}>
      <Text style={styles.section}>{children}</Text>
      {right}
    </View>
  );
}

export function Bar({ pct, color, height = 8, track = colors.track }: { pct: number; color: string; height?: number; track?: string }) {
  const w = Math.max(0, Math.min(1, pct));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${w * 100}%`, height: '100%', borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function Ring({
  pct,
  size = 132,
  stroke = 14,
  track = 'rgba(255,255,255,0.18)',
  from = '#FFFFFF',
  to = '#D9CCFF',
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  track?: string;
  from?: string;
  to?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGrad id="rg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </SvgGrad>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#rg)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export function Pill({ label, color, bg, style }: { label: string; color: string; bg: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.pill, { color, backgroundColor: bg }, style]}>{label}</Text>;
}

export function EmojiBadge({ emoji, tint, size = 40 }: { emoji: string; tint: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.48 }}>{emoji}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress, color = colors.brand }: { label: string; active?: boolean; onPress: () => void; color?: string }) {
  return (
    <Tap onPress={onPress} style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}>
      <Text style={[styles.chipText, active && { color: '#fff' }]} numberOfLines={1}>
        {label}
      </Text>
    </Tap>
  );
}

export function Button({ label, onPress, kind = 'primary', style }: { label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; style?: StyleProp<ViewStyle> }) {
  const bg = kind === 'primary' ? colors.brand : kind === 'danger' ? colors.badBg : colors.track;
  const fg = kind === 'primary' ? '#fff' : kind === 'danger' ? colors.bad : colors.ink;
  return (
    <Tap onPress={onPress} style={[styles.button, { backgroundColor: bg }, style]}>
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, ...shadow },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12, paddingHorizontal: 4 },
  section: { fontSize: 19, fontWeight: '700', color: colors.ink, letterSpacing: -0.3 },
  pill: { fontSize: 12, fontWeight: '700', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  button: { height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
