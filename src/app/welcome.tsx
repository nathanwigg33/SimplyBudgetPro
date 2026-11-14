import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { confirmAction, Tap, tap } from '../components/ui';
import { APP_NAME } from '../lib/brand';
import { parseBackup, pickBackupFile, readClipboard } from '../lib/backup';
import { money } from '../lib/format';
import { STARTER, starterCategories } from '../lib/seed';
import { useStore } from '../lib/store';
import { colors, typeMeta, typeOrder } from '../lib/theme';

type Step = 'hello' | 'name' | 'income' | 'cats' | 'restore';

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const completeSetup = useStore((s) => s.completeSetup);
  const restore = useStore((s) => s.restore);
  const [step, setStep] = useState<Step>('hello');
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');
  const [picked, setPicked] = useState<string[]>(STARTER.filter((c) => c.on).map((c) => c.id));
  const [msg, setMsg] = useState('');

  const incomeNum = parseFloat(income.replace(/[$,]/g, '')) || 0;
  const preview = useMemo(() => starterCategories(incomeNum, picked), [incomeNum, picked]);
  const planned = preview.filter((c) => c.type !== 'income').reduce((a, c) => a + c.budget, 0);

  function finish() {
    tap('success');
    completeSetup({ name, income: incomeNum, categoryIds: picked });
    router.replace('/');
  }

  async function doRestore(read: () => Promise<string>) {
    setMsg('');
    try {
      const d = parseBackup(await read());
      confirmAction('Restore this backup?', `${d.txns.length} transactions and ${d.categories.length} categories will be loaded into this app.`, 'Restore', () => {
        restore(d);
        router.replace('/');
      });
    } catch (e: any) {
      setMsg(e?.message ?? 'Something went wrong.');
    }
  }

  const progress = step === 'name' ? 1 : step === 'income' ? 2 : step === 'cats' ? 3 : 0;

  if (step === 'hello' || step === 'restore') {
    return (
      <LinearGradient colors={[colors.heroA, colors.heroB, colors.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
        <View style={[styles.helloWrap, { paddingTop: insets.top + 40, paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={styles.blobA} />
          <View style={styles.blobB} />
          <View style={{ alignItems: 'center', marginTop: 30 }}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} accessibilityLabel={`${APP_NAME} logo`} />
            <Text style={styles.brand}>{APP_NAME}</Text>
            <Text style={styles.tag}>Know what’s safe to spend,{'\n'}every single day.</Text>
          </View>

          {step === 'hello' ? (
            <View>
              <View style={styles.points}>
                {['Log spending in two taps', 'See exactly what’s left this month', 'Your data stays on your phone'].map((p) => (
                  <View key={p} style={styles.point}>
                    <View style={styles.check}>
                      <Icon name="check" size={14} color={colors.brand} strokeWidth={3} />
                    </View>
                    <Text style={styles.pointText}>{p}</Text>
                  </View>
                ))}
              </View>
              <Tap onPress={() => setStep('name')} style={styles.whiteBtn}>
                <Text style={styles.whiteBtnText}>Get started</Text>
              </Tap>
              <Tap onPress={() => setStep('restore')} style={styles.linkBtn}>
                <Text style={styles.linkText}>I have a backup</Text>
              </Tap>
            </View>
          ) : (
            <View>
              <Text style={styles.restoreTitle}>Bring your data over</Text>
              <Text style={styles.restoreSub}>In your other copy of the app, go to You → Copy backup. Then come back here.</Text>
              <Tap onPress={() => doRestore(readClipboard)} style={styles.whiteBtn}>
                <Text style={styles.whiteBtnText}>📥  Paste backup</Text>
              </Tap>
              <Tap onPress={() => doRestore(pickBackupFile)} style={[styles.whiteBtn, styles.ghostBtn]}>
                <Text style={[styles.whiteBtnText, { color: '#fff' }]}>📂  Restore from a file</Text>
              </Tap>
              {msg ? <Text style={styles.err}>{msg}</Text> : null}
              <Tap onPress={() => setStep('hello')} style={styles.linkBtn}>
                <Text style={styles.linkText}>Back</Text>
              </Tap>
            </View>
          )}
        </View>
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <Tap onPress={() => setStep(step === 'cats' ? 'income' : step === 'income' ? 'name' : 'hello')} style={styles.iconBtn}>
          <Icon name="back" size={20} color={colors.ink} />
        </Tap>
        <View style={styles.dots}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.pdot, i <= progress && { backgroundColor: colors.brand, width: 22 }]} />
          ))}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        {step === 'name' && (
          <>
            <Text style={styles.q}>What should we call you?</Text>
            <Text style={styles.qs}>Just a first name is perfect.</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.faint}
              style={styles.bigInput}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={() => setStep('income')}
            />
          </>
        )}

        {step === 'income' && (
          <>
            <Text style={styles.q}>About how much do you take home each month?</Text>
            <Text style={styles.qs}>Your pay after taxes. We’ll use it to suggest a starting budget — you can change everything later.</Text>
            <View style={[styles.bigInput, { flexDirection: 'row', alignItems: 'center' }]}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: colors.sub }}>$</Text>
              <TextInput
                value={income}
                onChangeText={setIncome}
                placeholder="0"
                placeholderTextColor={colors.faint}
                keyboardType="decimal-pad"
                autoFocus
                style={styles.moneyInput}
              />
            </View>
          </>
        )}

        {step === 'cats' && (
          <>
            <Text style={styles.q}>What do you spend on?</Text>
            <Text style={styles.qs}>
              {incomeNum > 0
                ? `Tap to add or remove. We planned ${money(planned)} of your ${money(incomeNum)} — you can fine-tune any amount later.`
                : 'Tap to add or remove. You can set amounts later on the Budget tab.'}
            </Text>
            {typeOrder
              .filter((t) => t !== 'income')
              .map((t) => {
                const list = STARTER.filter((c) => c.type === t);
                if (!list.length) return null;
                return (
                  <View key={t} style={{ marginTop: 16 }}>
                    <Text style={styles.groupLabel}>{typeMeta[t].plural}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {list.map((c) => {
                        const on = picked.includes(c.id);
                        const b = preview.find((p) => p.id === c.id)?.budget;
                        return (
                          <Tap
                            key={c.id}
                            onPress={() => setPicked((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))}
                            style={[styles.catChip, on && { backgroundColor: typeMeta[t].tint, borderColor: typeMeta[t].color }]}
                          >
                            <Text style={{ fontSize: 16 }}>{c.emoji}</Text>
                            <Text style={[styles.catChipText, !on && { color: colors.faint }]}>{c.name}</Text>
                            {on && b ? <Text style={[styles.catAmt, { color: typeMeta[t].color }]}>{money(b)}</Text> : null}
                          </Tap>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
          </>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 18) }}>
        {step === 'name' && (
          <Tap onPress={() => setStep('income')} style={[styles.primary, !name.trim() && { opacity: 0.4 }]} disabled={!name.trim()}>
            <Text style={styles.primaryText}>Continue</Text>
          </Tap>
        )}
        {step === 'income' && (
          <>
            <Tap onPress={() => setStep('cats')} style={[styles.primary, !incomeNum && { opacity: 0.4 }]} disabled={!incomeNum}>
              <Text style={styles.primaryText}>Continue</Text>
            </Tap>
            <Tap onPress={() => { setIncome(''); setStep('cats'); }} style={styles.skip}>
              <Text style={styles.skipText}>Skip for now</Text>
            </Tap>
          </>
        )}
        {step === 'cats' && (
          <Tap onPress={finish} style={styles.primary}>
            <Text style={styles.primaryText}>Start budgeting</Text>
          </Tap>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  helloWrap: { flex: 1, paddingHorizontal: 26, justifyContent: 'space-between', overflow: 'hidden' },
  blobA: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(255,255,255,0.08)', top: -100, right: -120 },
  blobB: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)', bottom: 120, left: -110 },
  logo: { width: 132, height: 132, borderRadius: 30, boxShadow: '0px 14px 34px rgba(20, 10, 80, 0.35)' },
  brand: { color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: -1.2, marginTop: 24 },
  tag: { color: 'rgba(255,255,255,0.85)', fontSize: 18, fontWeight: '500', textAlign: 'center', marginTop: 10, lineHeight: 25 },
  points: { marginBottom: 26 },
  point: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  check: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  pointText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  whiteBtn: { height: 56, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  ghostBtn: { backgroundColor: 'rgba(255,255,255,0.16)' },
  whiteBtnText: { color: colors.brand, fontSize: 17, fontWeight: '800' },
  linkBtn: { alignItems: 'center', paddingVertical: 16 },
  linkText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '700' },
  restoreTitle: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  restoreSub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 21, marginTop: 6, marginBottom: 12 },
  err: { color: '#FFE0E0', fontSize: 14, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  pdot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  q: { fontSize: 30, fontWeight: '800', color: colors.ink, letterSpacing: -0.8, marginTop: 20, lineHeight: 36 },
  qs: { fontSize: 15, color: colors.sub, marginTop: 8, lineHeight: 21 },
  bigInput: { backgroundColor: colors.card, borderRadius: 20, height: 64, paddingHorizontal: 18, fontSize: 22, fontWeight: '700', color: colors.ink, marginTop: 26, outlineStyle: 'none' } as any,
  moneyInput: { flex: 1, minWidth: 0, fontSize: 28, fontWeight: '800', color: colors.ink, marginLeft: 6, height: 64, outlineStyle: 'none' } as any,
  groupLabel: { fontSize: 13, fontWeight: '700', color: colors.sub, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line, marginRight: 8, marginBottom: 8 },
  catChipText: { fontSize: 14, fontWeight: '700', color: colors.ink, marginLeft: 6 },
  catAmt: { fontSize: 12, fontWeight: '800', marginLeft: 6 },
  primary: { height: 56, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  skip: { alignItems: 'center', paddingVertical: 14 },
  skipText: { color: colors.sub, fontSize: 15, fontWeight: '700' },
});
