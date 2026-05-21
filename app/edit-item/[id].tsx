import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { ColorSwatch } from '@/components/color-swatch';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import {
  CLOTHING_TYPES_ORDER,
  COLOR_PALETTE,
  MATERIALS_ORDER,
  PATTERNS_ORDER,
  PATTERN_LABELS_FR,
  SEASONS_ORDER,
  SEASON_LABELS_FR,
  SUB_TYPES_BY_TYPE,
  TYPE_LABELS_FR,
  maxColorsForPattern,
  type PaletteColor,
} from '@/constants/taxonomy';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useItemsStore } from '@/stores/items-store';
import type { ClothingType, ItemColor, Pattern, Season } from '@/types';

const THICKNESS_LABELS = ['Très fin', 'Fin', 'Moyen', 'Épais', 'Très épais'];

/**
 * Edit screen — modal route. Pre-fills all attributes from the existing item
 * and saves via itemsStore.update. Photo is NOT editable here (delete & re-add
 * to change the photo).
 */
export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  const text = Colors[scheme].text;

  const item = useItemsStore((s) => (id ? s.items[id] : undefined));
  const updateItem = useItemsStore((s) => s.update);

  const [type, setType] = useState<ClothingType>(item?.type ?? 'unknown');
  const [subType, setSubType] = useState<string>(item?.subType ?? '');
  const [pattern, setPattern] = useState<Pattern>(item?.pattern ?? 'uni');
  const [colors, setColors] = useState<ItemColor[]>(item?.colors ?? []);
  const [material, setMaterial] = useState<string>(item?.material ?? '');
  const [thickness, setThickness] = useState<number | undefined>(item?.thickness);
  const [seasons, setSeasons] = useState<Season[]>(item?.seasons ?? []);

  const [advancedOpen, setAdvancedOpen] = useState(
    Boolean(item?.brand || item?.size || item?.purchasePrice != null || item?.notes),
  );
  const [brand, setBrand] = useState(item?.brand ?? '');
  const [size, setSize] = useState(item?.size ?? '');
  const [purchasePrice, setPurchasePrice] = useState(
    item?.purchasePrice != null ? String(item.purchasePrice) : '',
  );
  const [notes, setNotes] = useState(item?.notes ?? '');

  const maxColors = useMemo(() => maxColorsForPattern(pattern), [pattern]);

  if (!id || !item) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
        <View style={styles.notFoundWrap}>
          <ThemedText style={styles.notFound}>Vêtement introuvable.</ThemedText>
          <Pressable onPress={() => router.back()}>
            <ThemedText style={{ color: tint, marginTop: 12 }}>Fermer</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handlePatternChange = (next: Pattern) => {
    setPattern(next);
    const limit = maxColorsForPattern(next);
    setColors((current) => current.slice(0, limit));
  };

  const toggleColor = useCallback(
    (c: PaletteColor) => {
      setColors((current) => {
        const exists = current.find((x) => x.hex === c.hex);
        if (exists) return current.filter((x) => x.hex !== c.hex);
        const next: ItemColor = {
          hex: c.hex,
          r: parseInt(c.hex.slice(1, 3), 16),
          g: parseInt(c.hex.slice(3, 5), 16),
          b: parseInt(c.hex.slice(5, 7), 16),
          name: c.name,
        };
        if (current.length >= maxColors) {
          return [...current.slice(0, maxColors - 1), next];
        }
        return [...current, next];
      });
    },
    [maxColors],
  );

  const toggleSeason = (s: Season) =>
    setSeasons((current) => (current.includes(s) ? current.filter((x) => x !== s) : [...current, s]));

  const canSave = colors.length >= 1;

  const handleSave = () => {
    if (colors.length < 1) {
      Alert.alert('Couleur manquante', 'Sélectionne au moins une couleur.');
      return;
    }
    const priceNumber =
      purchasePrice.trim() === ''
        ? undefined
        : parseFloat(purchasePrice.replace(',', '.'));
    updateItem(item.id, {
      type,
      subType: subType.trim() || undefined,
      pattern,
      colors,
      material: material.trim() || undefined,
      thickness,
      seasons,
      brand: brand.trim() || undefined,
      size: size.trim() || undefined,
      purchasePrice: priceNumber != null && !Number.isNaN(priceNumber) ? priceNumber : undefined,
      notes: notes.trim() || undefined,
    });
    router.back();
  };

  const displayedUri = item.photoBgRemovedUri ?? item.photoUri;
  const availableSubTypes = SUB_TYPES_BY_TYPE[type] ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: text + '15' }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText style={styles.headerCancel}>Annuler</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>Modifier</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.previewWrap}>
          <Image source={{ uri: displayedUri }} style={styles.preview} contentFit="contain" transition={120} />
          <ThemedText style={styles.previewNote}>
            La photo ne peut pas être modifiée ici. Supprime et recrée si besoin.
          </ThemedText>
        </View>

        {/* Type */}
        <SectionHeader title="Type" required />
        <ChipsRow>
          {CLOTHING_TYPES_ORDER.map((t) => (
            <Chip
              key={t}
              label={TYPE_LABELS_FR[t]}
              selected={type === t}
              onPress={() => {
                setType(t);
                setSubType('');
              }}
            />
          ))}
        </ChipsRow>

        {/* Sub-type */}
        {availableSubTypes.length > 0 && (
          <>
            <SectionHeader title="Sous-type" />
            <ChipsRow>
              {availableSubTypes.map((st) => (
                <Chip
                  key={st}
                  label={st}
                  selected={subType === st}
                  onPress={() => setSubType(subType === st ? '' : st)}
                />
              ))}
            </ChipsRow>
          </>
        )}

        {/* Pattern */}
        <SectionHeader title="Motif" />
        <ChipsRow>
          {PATTERNS_ORDER.map((p) => (
            <Chip
              key={p}
              label={PATTERN_LABELS_FR[p]}
              selected={pattern === p}
              onPress={() => handlePatternChange(p)}
            />
          ))}
        </ChipsRow>

        {/* Colors */}
        <SectionHeader
          title={maxColors === 1 ? 'Couleur' : 'Couleurs'}
          subtitle={
            maxColors === 1
              ? 'Sélectionne une couleur.'
              : 'Sélectionne 1 à 2 couleurs (principale puis secondaire).'
          }
          required
        />
        <View style={styles.palette}>
          {COLOR_PALETTE.map((c) => (
            <ColorSwatch
              key={c.hex}
              hex={c.hex}
              selected={colors.some((x) => x.hex === c.hex)}
              onPress={() => toggleColor(c)}
            />
          ))}
        </View>
        {colors.length > 0 && (
          <View style={styles.colorsSelected}>
            {colors.map((c, i) => (
              <ThemedText key={c.hex} style={styles.colorTag}>
                {i === 0 ? '● ' : '◐ '}
                {c.name ?? c.hex}
              </ThemedText>
            ))}
          </View>
        )}

        {/* Material */}
        <SectionHeader title="Matière" />
        <ChipsRow>
          {MATERIALS_ORDER.map((m) => (
            <Chip
              key={m}
              label={m}
              selected={material === m}
              onPress={() => setMaterial(material === m ? '' : m)}
            />
          ))}
        </ChipsRow>
        <TextInput
          style={[
            styles.input,
            { color: text, borderColor: text + '30' },
          ]}
          placeholder="Ou tape une matière personnalisée…"
          placeholderTextColor={text + '60'}
          value={MATERIALS_ORDER.includes(material) ? '' : material}
          onChangeText={setMaterial}
        />

        {/* Thickness */}
        <SectionHeader title="Épaisseur" subtitle="Optionnel" />
        <View style={styles.thicknessRow}>
          {THICKNESS_LABELS.map((label, idx) => {
            const value = idx + 1;
            return (
              <Pressable
                key={label}
                style={[
                  styles.thicknessBtn,
                  thickness === value
                    ? { backgroundColor: tint }
                    : { borderColor: text + '30' },
                ]}
                onPress={() => setThickness(thickness === value ? undefined : value)}
              >
                <ThemedText
                  style={[
                    styles.thicknessText,
                    thickness === value
                      ? { color: scheme === 'light' ? '#fff' : '#000' }
                      : { color: text },
                  ]}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Seasons */}
        <SectionHeader title="Saisons" subtitle="Sélectionne celles où tu portes ce vêtement." />
        <ChipsRow>
          {SEASONS_ORDER.map((s) => (
            <Chip
              key={s}
              label={SEASON_LABELS_FR[s]}
              selected={seasons.includes(s)}
              onPress={() => toggleSeason(s)}
            />
          ))}
        </ChipsRow>

        {/* Advanced */}
        <Pressable style={styles.advancedToggle} onPress={() => setAdvancedOpen((x) => !x)}>
          <ThemedText style={[styles.advancedToggleText, { color: tint }]}>
            {advancedOpen ? '−' : '+'} Plus de détails (marque, taille, prix, notes)
          </ThemedText>
        </Pressable>
        {advancedOpen && (
          <View style={styles.advancedBody}>
            <ThemedText style={styles.label}>Marque</ThemedText>
            <TextInput
              style={[styles.input, { color: text, borderColor: text + '30' }]}
              placeholder="Uniqlo, Sezane, COS…"
              placeholderTextColor={text + '60'}
              value={brand}
              onChangeText={setBrand}
            />
            <ThemedText style={styles.label}>Taille</ThemedText>
            <TextInput
              style={[styles.input, { color: text, borderColor: text + '30' }]}
              placeholder="M, 42, EU 40…"
              placeholderTextColor={text + '60'}
              value={size}
              onChangeText={setSize}
            />
            <ThemedText style={styles.label}>Prix d&apos;achat (€)</ThemedText>
            <TextInput
              style={[styles.input, { color: text, borderColor: text + '30' }]}
              placeholder="49.90"
              placeholderTextColor={text + '60'}
              keyboardType="decimal-pad"
              value={purchasePrice}
              onChangeText={setPurchasePrice}
            />
            <ThemedText style={styles.label}>Notes</ThemedText>
            <TextInput
              style={[styles.input, styles.multiline, { color: text, borderColor: text + '30' }]}
              placeholder="Cadeau d'anniversaire, doublure abîmée…"
              placeholderTextColor={text + '60'}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Save */}
      <View style={[styles.saveBar, { backgroundColor: Colors[scheme].background, borderTopColor: text + '20' }]}>
        <Pressable
          style={[styles.saveButton, { backgroundColor: canSave ? tint : tint + '60' }]}
          disabled={!canSave}
          onPress={handleSave}
        >
          <ThemedText style={styles.saveButtonText}>Enregistrer les modifications</ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ChipsRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCancel: { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  headerSpacer: { width: 60 },
  scrollContent: { padding: 16, paddingBottom: 80 },
  previewWrap: { alignItems: 'center', marginBottom: 8 },
  preview: { width: '100%', aspectRatio: 1, borderRadius: 14, maxHeight: 220 },
  previewNote: { fontSize: 12, opacity: 0.5, marginTop: 8, textAlign: 'center' },
  chipsRow: { flexDirection: 'row', gap: 8, paddingVertical: 4, paddingRight: 16 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  colorsSelected: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  colorTag: { fontSize: 13, opacity: 0.8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    fontSize: 15,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  thicknessRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  thicknessBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  thicknessText: { fontSize: 13, fontWeight: '500' },
  label: { fontSize: 14, fontWeight: '500', marginTop: 12, opacity: 0.8 },
  advancedToggle: { marginTop: 24, paddingVertical: 8 },
  advancedToggleText: { fontSize: 15, fontWeight: '500' },
  advancedBody: { marginTop: 4 },
  saveBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveButton: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  notFoundWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notFound: { fontSize: 16, opacity: 0.7 },
});
