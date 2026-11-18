import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SignIn } from '../components/SignIn';
import { useStore } from '../lib/store';
import { startSync, useAuth, useSync } from '../lib/sync';
import { colors } from '../lib/theme';

export default function RootLayout() {
  const storeReady = useStore((s) => s.hydrated);
  const authReady = useAuth((s) => s.hydrated);
  const token = useAuth((s) => s.token);
  const synced = useSync((s) => s.ready);
  const hydrated = storeReady && authReady;

  // Signed in: download the latest budget, then keep this device and the account in step.
  useEffect(() => {
    if (hydrated && token) void startSync();
  }, [hydrated, token]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {hydrated && !token ? (
        <SignIn />
      ) : !hydrated || !synced ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="welcome" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="add" options={{ presentation: 'modal' }} />
          <Stack.Screen name="category" options={{ presentation: 'modal' }} />
          <Stack.Screen name="account" options={{ presentation: 'modal' }} />
          <Stack.Screen name="asset" options={{ presentation: 'modal' }} />
          <Stack.Screen name="security" options={{ presentation: 'modal' }} />
        </Stack>
      )}
    </SafeAreaProvider>
  );
}
