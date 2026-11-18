import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../components/Icon';
import { Button, Card, confirmAction, Tap } from '../components/ui';
import { changePassword, deleteAccount, useAuth } from '../lib/sync';
import { colors } from '../lib/theme';

export default function Security() {
  const email = useAuth((s) => s.email);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [next2, setNext2] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [delPw, setDelPw] = useState('');
  const [delMsg, setDelMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function onChange() {
    setPwMsg(null);
    if (next.length < 8) return setPwMsg({ ok: false, text: 'Use at least 8 characters for your new password.' });
    if (next !== next2) return setPwMsg({ ok: false, text: 'The new passwords don’t match.' });
    setBusy(true);
    try {
      await changePassword(cur, next);
      setCur('');
      setNext('');
      setNext2('');
      setPwMsg({ ok: true, text: '✅ Password changed. Other devices were signed out.' });
    } catch (e: any) {
      setPwMsg({ ok: false, text: e?.message ?? 'Something went wrong.' });
    }
    setBusy(false);
  }

  function onDelete() {
    setDelMsg('');
    if (!delPw) return setDelMsg('Enter your password to confirm.');
    confirmAction(
      'Delete your account?',
      'This permanently deletes your account and your budget on every device. It can’t be undone.',
      'Delete forever',
      async () => {
        try {
          await deleteAccount(delPw);
        } catch (e: any) {
          setDelMsg(e?.message ?? 'Something went wrong.');
        }
      },
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <Tap onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="close" size={20} color={colors.ink} />
        </Tap>
        <Text style={styles.title}>Password & account</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.signed}>Signed in as {email}</Text>

        <Text style={styles.h}>Change password</Text>
        <Card>
          <TextInput value={cur} onChangeText={setCur} placeholder="Current password" placeholderTextColor={colors.faint} secureTextEntry autoCapitalize="none" autoComplete="current-password" style={styles.input} />
          <TextInput value={next} onChangeText={setNext} placeholder="New password (8+ characters)" placeholderTextColor={colors.faint} secureTextEntry autoCapitalize="none" autoComplete="new-password" style={[styles.input, { marginTop: 10 }]} />
          <TextInput value={next2} onChangeText={setNext2} placeholder="New password again" placeholderTextColor={colors.faint} secureTextEntry autoCapitalize="none" autoComplete="new-password" style={[styles.input, { marginTop: 10 }]} />
          {pwMsg ? <Text style={[styles.msg, { color: pwMsg.ok ? colors.good : colors.bad }]}>{pwMsg.text}</Text> : null}
          <Button label={busy ? 'Saving…' : 'Change password'} onPress={busy ? () => {} : onChange} style={{ marginTop: 14 }} />
        </Card>

        <Text style={styles.h}>Delete account</Text>
        <Card>
          <Text style={styles.body}>Permanently deletes your account and everything in it from all your devices. Save a backup first (You → Save backup file) if you might want your data later.</Text>
          <TextInput value={delPw} onChangeText={setDelPw} placeholder="Your password" placeholderTextColor={colors.faint} secureTextEntry autoCapitalize="none" style={[styles.input, { marginTop: 12 }]} />
          {delMsg ? <Text style={[styles.msg, { color: colors.bad }]}>{delMsg}</Text> : null}
          <Button label="Delete my account" kind="danger" onPress={onDelete} style={{ marginTop: 14 }} />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink },
  signed: { fontSize: 14, color: colors.sub, textAlign: 'center', marginBottom: 6 },
  h: { fontSize: 13, fontWeight: '700', color: colors.sub, marginTop: 22, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  body: { fontSize: 14, color: colors.sub, lineHeight: 20 },
  input: { backgroundColor: colors.bg, borderRadius: 14, height: 50, paddingHorizontal: 14, fontSize: 16, color: colors.ink, outlineStyle: 'none' } as any,
  msg: { fontSize: 14, fontWeight: '600', marginTop: 12 },
});
