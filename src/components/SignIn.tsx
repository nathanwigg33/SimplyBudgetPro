import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_NAME } from '../lib/brand';
import { useStore } from '../lib/store';
import { signIn } from '../lib/sync';
import { colors } from '../lib/theme';
import { Tap, tap } from './ui';

/** Shown whenever nobody is signed in. */
export function SignIn() {
  const insets = useSafeAreaInsets();
  const hasLocal = useStore((s) => s.onboarded && s.txns.length > 0);
  const [mode, setMode] = useState<'login' | 'signup'>(hasLocal ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    setErr('');
    if (!email.trim() || !pw) return setErr('Enter your email and password.');
    if (mode === 'signup' && pw.length < 8) return setErr('Use at least 8 characters for your password.');
    if (mode === 'signup' && pw !== pw2) return setErr('Those passwords don’t match.');
    setBusy(true);
    try {
      await signIn(mode, email, pw);
      tap('success');
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong.');
      setBusy(false);
    }
  }

  const signup = mode === 'signup';

  return (
    <LinearGradient colors={[colors.heroA, colors.heroB, colors.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 36, paddingBottom: Math.max(insets.bottom, 24) + 10 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.blobA} />
          <View style={{ alignItems: 'center' }}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} accessibilityLabel={`${APP_NAME} logo`} />
            <Text style={styles.brand}>{APP_NAME}</Text>
            <Text style={styles.tag}>{signup ? 'Create your account. Your budget syncs to every device you sign in on.' : 'Welcome back. Sign in to pick up where you left off.'}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.seg}>
              {(['login', 'signup'] as const).map((m) => (
                <Tap key={m} onPress={() => (setMode(m), setErr(''))} style={[styles.segBtn, mode === m && styles.segOn]}>
                  <Text style={[styles.segText, mode === m && { color: colors.brand }]}>{m === 'login' ? 'Sign in' : 'Create account'}</Text>
                </Tap>
              ))}
            </View>

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              style={styles.input}
            />
            <Text style={styles.label}>Password</Text>
            <View style={styles.pwRow}>
              <TextInput
                value={pw}
                onChangeText={setPw}
                placeholder={signup ? 'At least 8 characters' : 'Your password'}
                placeholderTextColor={colors.faint}
                secureTextEntry={!show}
                autoCapitalize="none"
                autoComplete={signup ? 'new-password' : 'current-password'}
                textContentType={signup ? 'newPassword' : 'password'}
                onSubmitEditing={signup ? undefined : submit}
                style={[styles.input, { flex: 1, minWidth: 0, width: 0, marginTop: 0 }]}
              />
              <Tap onPress={() => setShow(!show)} style={styles.showBtn}>
                <Text style={styles.showText}>{show ? 'Hide' : 'Show'}</Text>
              </Tap>
            </View>
            {signup && (
              <>
                <Text style={styles.label}>Confirm password</Text>
                <TextInput
                  value={pw2}
                  onChangeText={setPw2}
                  placeholder="Type it again"
                  placeholderTextColor={colors.faint}
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  onSubmitEditing={submit}
                  style={styles.input}
                />
              </>
            )}

            {err ? <Text style={styles.err}>{err}</Text> : null}

            <Tap onPress={busy ? () => {} : submit} style={[styles.primary, busy && { opacity: 0.7 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{signup ? 'Create account' : 'Sign in'}</Text>}
            </Tap>

            {signup && hasLocal ? (
              <Text style={styles.note}>💾 The budget already on this device will be moved into your new account.</Text>
            ) : !signup ? (
              <Text style={styles.note}>Forgot your password? Reset by email is coming soon.</Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, paddingHorizontal: 22, justifyContent: 'center', overflow: 'hidden' },
  blobA: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(255,255,255,0.08)', top: -100, right: -120 },
  logo: { width: 96, height: 96, borderRadius: 24, boxShadow: '0px 14px 34px rgba(20, 10, 80, 0.35)' } as any,
  brand: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 16 },
  tag: { color: 'rgba(255,255,255,0.88)', fontSize: 15, fontWeight: '500', textAlign: 'center', marginTop: 8, lineHeight: 21, maxWidth: 320 },
  card: { backgroundColor: colors.card, borderRadius: 26, padding: 18, marginTop: 26, width: '100%', maxWidth: 440, alignSelf: 'center' },
  seg: { flexDirection: 'row', backgroundColor: colors.track, borderRadius: 14, padding: 4 },
  segBtn: { flex: 1, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.card, boxShadow: '0px 2px 8px rgba(26,24,80,0.08)' } as any,
  segText: { fontSize: 14, fontWeight: '700', color: colors.sub },
  label: { fontSize: 12, fontWeight: '700', color: colors.sub, marginTop: 16, marginBottom: 6, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: { backgroundColor: colors.bg, borderRadius: 14, height: 50, paddingHorizontal: 14, fontSize: 16, color: colors.ink, outlineStyle: 'none' } as any,
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  showBtn: { height: 50, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  showText: { fontSize: 14, fontWeight: '700', color: colors.brand },
  err: { color: colors.bad, fontSize: 14, fontWeight: '600', marginTop: 14, textAlign: 'center' },
  primary: { height: 54, borderRadius: 16, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  note: { fontSize: 13, color: colors.sub, textAlign: 'center', marginTop: 14, lineHeight: 18 },
});
