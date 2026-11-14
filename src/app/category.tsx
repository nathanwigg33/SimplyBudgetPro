import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../components/Icon';
import { Button, Chip, confirmAction, Tap } from '../components/ui';
import { EMOJI_CHOICES } from '../lib/seed';
import { useStore } from '../lib/store';
import { colors, typeMeta, typeOrder } from '../lib/theme';
import { CategoryType } from '../lib/types';

export default function CategoryEditor() {
  const { id, type: typeParam } = useLocalSearchParams<{ id?: string; type?: CategoryType }>();
  const cats = useStore((s) => s.categories);
  const txns = useStore((s) => s.txns);
  const save = useStore((s) => s.saveCategory);
  const del = useStore((s) => s.deleteCategory);
  const existing = id ? cats.find((c) => c.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<CategoryType>(existing?.type ?? typeParam ?? 'variable');
  const [budget, setBudget] = useState(existing?.budget ? String(existing.budget) : '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? '✨');
  const used = existing ? txns.filter((t) => t.categoryId === existing.id).length : 0;
  const m = typeMeta[type];

  function onSave() {
    if (!name.trim()) return;
    save({ id: existing?.id, name: name.trim(), type, emoji, budget: Math.max(0, parseFloat(budget.replace(/[$,]/g, '')) || 0) });
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <Tap onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="close" size={20} color={colors.ink} />
        </Tap>
        <Text style={styles.title}>{existing ? 'Edit category' : 'New category'}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={[styles.bigEmoji, { backgroundColor: m.tint }]}>
            <Text style={{ fontSize: 44 }}>{emoji}</Text>
          </View>
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Coffee" placeholderTextColor={colors.faint} style={styles.input} />

        <Text style={styles.label}>{type === 'income' ? 'Expected each month' : 'Monthly budget'}</Text>
        <View style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.sub }}>$</Text>
          <TextInput value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.faint} style={[styles.money]} />
        </View>

        <Text style={styles.label}>Kind</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {typeOrder.map((k) => (
            <Chip key={k} label={`${typeMeta[k].emoji} ${typeMeta[k].label}`} active={type === k} color={typeMeta[k].color} onPress={() => setType(k)} />
          ))}
        </View>

        <Text style={styles.label}>Icon</Text>
        <View style={styles.emojiGrid}>
          {EMOJI_CHOICES.map((e) => (
            <Tap key={e} onPress={() => setEmoji(e)} style={[styles.emojiCell, emoji === e && { backgroundColor: m.tint, borderColor: m.color }]}>
              <Text style={{ fontSize: 22 }}>{e}</Text>
            </Tap>
          ))}
        </View>

        <Button label={existing ? 'Save' : 'Add category'} onPress={onSave} style={{ marginTop: 26, opacity: name.trim() ? 1 : 0.4 }} />
        {existing && (
          <Button
            label="Delete category"
            kind="danger"
            style={{ marginTop: 12 }}
            onPress={() =>
              confirmAction(
                'Delete category?',
                used ? `${used} transaction(s) use it. They’ll stay but show as uncategorized.` : 'This can’t be undone.',
                () => {
                  del(existing.id);
                  router.back();
                },
              )
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
  bigEmoji: { width: 92, height: 92, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '700', color: colors.sub, marginTop: 18, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: { backgroundColor: colors.card, borderRadius: 16, minHeight: 52, paddingHorizontal: 16, fontSize: 17, color: colors.ink, outlineStyle: 'none' } as any,
  money: { flex: 1, minWidth: 0, fontSize: 22, fontWeight: '700', color: colors.ink, marginLeft: 6, height: 52, outlineStyle: 'none' } as any,
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.card, borderRadius: 20, padding: 8 },
  emojiCell: { width: '12.5%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent' },
});
