import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../components/Icon';
import { Button, Chip, confirmAction, Tap } from '../components/ui';
import { useStore } from '../lib/store';
import { accountKinds, colors } from '../lib/theme';
import { AccountKind } from '../lib/types';

export default function AccountEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const accts = useStore((s) => s.accounts);
  const save = useStore((s) => s.saveAccount);
  const del = useStore((s) => s.deleteAccount);
  const existing = id ? accts.find((a) => a.id === id) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState<AccountKind>(existing?.kind ?? 'credit');
  const [limit, setLimit] = useState(existing?.limit ? String(existing.limit) : '');

  function onSave() {
    if (!name.trim()) return;
    const l = parseFloat(limit.replace(/[$,]/g, ''));
    save({ id: existing?.id, name: name.trim(), kind, limit: kind === 'credit' && l > 0 ? l : undefined });
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <Tap onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="close" size={20} color={colors.ink} />
        </Tap>
        <Text style={styles.title}>{existing ? 'Edit account' : 'New account'}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Chase Sapphire" placeholderTextColor={colors.faint} style={styles.input} />
        <Text style={styles.label}>Type</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {accountKinds.map((x) => (
            <Chip key={x.k} label={`${x.emoji} ${x.label}`} active={kind === x.k} onPress={() => setKind(x.k)} color={colors.ink} />
          ))}
        </View>
        {kind === 'credit' && (
          <>
            <Text style={styles.label}>Credit limit (optional)</Text>
            <TextInput value={limit} onChangeText={setLimit} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={colors.faint} style={styles.input} />
          </>
        )}
        <Button label={existing ? 'Save' : 'Add account'} onPress={onSave} style={{ marginTop: 26, opacity: name.trim() ? 1 : 0.4 }} />
        {existing && (
          <Button
            label="Delete account"
            kind="danger"
            style={{ marginTop: 12 }}
            onPress={() =>
              confirmAction('Delete account?', 'Past transactions stay, without an account name.', () => {
                del(existing.id);
                router.back();
              })
            }
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink },
  label: { fontSize: 13, fontWeight: '700', color: colors.sub, marginTop: 18, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: { backgroundColor: colors.card, borderRadius: 16, height: 52, paddingHorizontal: 16, fontSize: 17, color: colors.ink, outlineStyle: 'none' } as any,
});
