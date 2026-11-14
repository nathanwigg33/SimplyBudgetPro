import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from '../../components/Icon';
import { Tap } from '../../components/ui';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

const TABS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: 'home', label: 'Home' },
  budget: { icon: 'budget', label: 'Budget' },
  activity: { icon: 'activity', label: 'Activity' },
  settings: { icon: 'user', label: 'You' },
};

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes as { key: string; name: string }[];
  const items = routes.map((r, i) => {
    const focused = state.index === i;
    const t = TABS[r.name];
    return (
      <Tap key={r.key} style={styles.item} onPress={() => !focused && navigateToTab(r.key)}>
        <Icon name={t.icon} size={24} color={focused ? colors.brand : colors.faint} strokeWidth={focused ? 2.3 : 1.9} />
        <Text style={[styles.label, focused && { color: colors.brand }]}>{t.label}</Text>
      </Tap>
    );
  });
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {items.slice(0, 2)}
      <Tap onPress={() => router.push('/add')} style={styles.plusWrap} accessibilityLabel="Add transaction">
        <LinearGradient colors={[colors.heroA, colors.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.plus}>
          <Text style={styles.plusText}>+</Text>
        </LinearGradient>
      </Tap>
      {items.slice(2)}
    </View>
  );
}

export default function TabsLayout() {
  const onboarded = useStore((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/welcome" />;
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } } as any}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="budget" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingTop: 10,
    paddingHorizontal: 8,
    borderTopWidth: Platform.OS === 'web' ? 1 : StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  label: { fontSize: 11, fontWeight: '700', color: colors.faint, marginTop: 2 },
  plusWrap: { marginHorizontal: 10, marginTop: -26 },
  plus: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 8px 18px rgba(91, 76, 240, 0.38)',
  },
  plusText: { color: '#fff', fontSize: 34, fontWeight: '400', marginTop: -3 },
});
