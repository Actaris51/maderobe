import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  OCCASIONS_ORDER, // imported for future use; not yet wired into add-item
  PATTERNS_ORDER,
  PATTERN_LABELS_FR,
  SEASONS_ORDER,
  SEASON_LABELS_FR,
  SUB_TYPES_BY_TYPE,
  TYPE_LABELS_FR,
  closestPaletteColor,
  maxColorsForPattern,
  type PaletteColor,
} from '@/constants/taxonomy';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { pickFromLibrary, takePhoto } from '@/lib/image-picker';
import { persistImage } from '@/lib/image-storage';
import vision from '@/modules/maderobe-vision';
import { useItemsStore } from '@/stores/items-store';
import type { ClothingType, ItemColor, Pattern, Season } from '@/types';

// Suppress unused-import warning until we wire occasions into outfit flows
void OCCASIONS_ORDER;

type Phase = 'photo' | 'attributes';

const THICKNESS_LABELS = ['Très fin', 'Fin', 'Moyen', 'Épais', 'Très épais'];

export default function AddItemScreen() {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  const addItem = useItemsStore((s) => s.add);

  // ----- Phase 1: photo -----
  const [phase, setPhase] = useState<Phase>('photo');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBgRemovedUri, setPhotoBgRemovedUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // ----- Phase 2: attributes -----
  const [type, setType] = useState<ClothingType>('unknown');
  const [subType, setSubType] = useState<string>('');
  const [pattern, setPattern] = useState<Pattern>('uni');
  const [colors, setColors] = useState<ItemColor[]>([]);
  const [material, setMaterial] = useState<string>('');
  const [thickness, setThickness] = useState<number | undefined>(undefined);
  const [seasons, setSeasons] = useState<Season[]>([]);

  // Advanced (collapsible)
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [notes, setNotes] = useState('');

  // -------------------------------------------------------------------------
  // Photo handling
  // -------------------------------------------------------------------------

  const handlePhotoChosen = useCallback(async (sourceUri: string) => {
    setAnalyzing(true);
    try {
      // Persist the original photo into the app's document directory.
      const persistedOriginal = await persistImage(sourceUri, 'jpg');
      setPhotoUri(persistedOriginal);

      // Run on-device Vision analysis (background removal + classify + colors).
      // If the native module is unavailable (Expo Go, before EAS build), the mock
      // returns "unknown" + neutral colors — the user fills in manually.
      const result = await vision.analyzeClothingItem(persistedOriginal, { colorCount: 3 });

      // If background was successfully removed, copy that PNG into our doc dir as well.
      if (result.backgroundRemovedUri) {
        try {
          const persistedBg = await persistImage(result.backgroundRemovedUri, 'png');
          setPhotoBgRemovedUri(persistedBg);
        } catch {
          // Non-fatal: just use the original photo.
        }
      }

      // Pre-fill type and colors from the analysis result.
      if (result.type !== 'unknown') setType(result.type);
      if (result.colors.length > 0) {
        const top1 = result.colors[0];
        const paletteMatch = closestPaletteColor(top1.hex);
        setColors([
          {
            hex: paletteMatch.hex,
            r: parseInt(paletteMatch.hex.slice(1, 3), 16),
            g: parseInt(paletteMatch.hex.slice(3, 5), 16),
            b: parseInt(paletteMatch.hex.slice(5, 7), 16),
            name: paletteMatch.name,
          },
        ]);
      }

      setPhase('attributes');
    } catch (err) {
      Alert.alert(
        'Erreur',
        "Impossible d'analyser la photo. Tu peux la sauvegarder quand même et compléter les attributs à la main.",
      );
      // Still move to attributes — the user can fill manually.
      setPhase('attributes');
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const r = await takePhoto();
    if (r.cancelled) {
      if (r.reason === 'permission') {
        Alert.alert(
          "Autorisation refusée",
          "Maderobe a besoin d'accéder à l'appareil photo. Tu peux activer la permission dans les Réglages.",
        );
      }
      return;
    }
    handlePhotoChosen(r.uri);
  }, [handlePhotoChosen]);

  const handlePickFromLibrary = useCallback(async () => {
    const r = await pickFromLibrary();
    if (r.cancelled) {
      if (r.reason === 'permission') {
        Alert.alert(
          "Autorisation refusée",
          "Maderobe a besoin d'accéder à votre galerie. Tu peux activer la permission dans les Réglages.",
        );
      }
      return;
    }
    handlePhotoChosen(r.uri);
  }, [handlePhotoChosen]);

  // -------------------------------------------------------------------------
  // Colors picker
  // -------------------------------------------------------------------------

  const maxColors = useMemo(() => maxColorsForPattern(pattern), [pattern]);

  const toggleColor = useCallback(
    (c: PaletteColor) => {
      setColors((current) => {
        const exists = current.find((x) => x.hex === c.hex);
        if (exists) {
          return current.filter((x) => x.hex !== c.hex);
        }
        // Adding: respect the max for the current pattern
        const next: ItemColor = {
          hex: c.hex,
          r: parseInt(c.hex.slice(1, 3), 16),
          g: parseInt(c.hex.slice(3, 5), 16),
          b: parseInt(c.hex.slice(5, 7), 16),
          name: c.name,
        };
        if (current.length >= maxColors) {
          // Replace the last-added one
          return [...current.slice(0, maxColors - 1), next];
        }
        return [...current, next];
      });
    },
    [maxColors],
  );

  // When pattern changes to "uni", trim colors to 1
  const handlePatternChange = useCallback(
    (next: Pattern) => {
      setPattern(next);
      const limit = maxColorsForPattern(next);
      setColors((current) => current.slice(0, limit));
    },
    [],
  );

  const toggleSeason = useCallback((s: Season) => {
    setSeasons((current) =>
      current.includes(s) ? current.filter((x) => x !== s) : [...current, s],
    );
  }, []);

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  const canSave = photoUri !== null && colors.length >= 1;

  const handleSave = useCallback(() => {
    if (!photoUri) return;
    if (colors.length < 1) {
      Alert.alert('Couleur manquante', 'Sélectionne au moins une couleur.');
      return;
    }
    const priceNumber = purchasePrice.trim() === '' ? undefined : parseFloat(purchasePrice.replace(',', '.'));
    addItem({
      photoUri,
      photoBgRemovedUri: photoBgRemovedUri ?? undefined,
      type,
      subType: subType.trim() || undefined,
      pattern,
      colors,
      material: material.trim() || undefined,
      thickness,
      seasons,
      brand: brand.trim() || undefined,
      size: size.trim() || undefined,
      purchasePrice: priceNumber && !Number.isNaN(priceNumber) ? priceNumber : undefined,
      notes: notes.trim() || undefined,
    });
    router.back();
  }, [
    photoUri,
    photoBgRemovedUri,
    type,
    subType,
    pattern,
    colors,
    material,
    thickness,
    seasons,
    brand,
    size,
    purchasePrice,
    notes,
    addItem,
  ]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (phase === 'photo') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
        <Header onCancel={() => router.back()} title="Ajouter un vêtement" />
        <View style={styles.photoPickerCenter}>
          {analyzing ? (
            <View style={styles.analyzingBox}>
              <ActivityIndicator size="large" color={tint} />
              <ThemedText style={styles.analyzingText}>Analyse de la photo…</ThemedText>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <Pressable
                style={[styles.bigButton, { backgroundColor: tint }]}
                onPress={handleTakePhoto}
              >
                <ThemedText style={styles.bigButtonText}>Prendre une photo</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.bigButton, styles.bigButtonOutline, { borderColor: tint }]}
                onPress={handlePickFromLibrary}
              >
                <ThemedText style={[styles.bigButtonText, { color: tint }]}>
                  Choisir depuis la galerie
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ---- phase === 'attributes' ----

  const displayedUri = photoBgRemovedUri ?? photoUri;
  const availableSubTypes = SUB_TYPES_BY_TYPE[type] ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
      <Header onCancel={() => router.back()} title="Détails" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Photo preview */}
        {displayedUri ? (
          <View style={styles.previewWrapper}>
            <Image
              source={{ uri: displayedUri }}
              style={styles.preview}
              contentFit="contain"
              transition={150}
            />
            <Pressable
              style={styles.changePhoto}
              onPress={() => {
                setPhase('photo');
                setPhotoUri(null);
                setPhotoBgRemovedUri(null);
              }}
            >
              <ThemedText style={[styles.changePhotoText, { color: tint }]}>Changer la photo</ThemedText>
            </Pressable>
          </View>
        ) : null}

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
              ? "Sélectionne une couleur."
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
            { color: Colors[scheme].text, borderColor: Colors[scheme].text + '30' },
          ]}
          placeholder="Ou tape une matière personnalisée…"
          placeholderTextColor={Colors[scheme].text + '60'}
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
                    : { borderColor: Colors[scheme].text + '30' },
                ]}
                onPress={() => setThickness(thickness === value ? undefined : value)}
              >
                <ThemedText
                  style={[
                    styles.thicknessText,
                    thickness === value
                      ? { color: scheme === 'light' ? '#fff' : '#000' }
                      : { color: Colors[scheme].text },
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
        <Pressable
          style={styles.advancedToggle}
          onPress={() => setAdvancedOpen((x) => !x)}
        >
          <ThemedText style={[styles.advancedToggleText, { color: tint }]}>
            {advancedOpen ? '−' : '+'} Plus de détails (marque, taille, prix, notes)
          </ThemedText>
        </Pressable>
        {advancedOpen && (
          <View style={styles.advancedBody}>
            <ThemedText style={styles.label}>Marque</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: Colors[scheme].text, borderColor: Colors[scheme].text + '30' },
              ]}
              placeholder="Uniqlo, Sezane, COS…"
              placeholderTextColor={Colors[scheme].text + '60'}
              value={brand}
              onChangeText={setBrand}
            />
            <ThemedText style={styles.label}>Taille</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: Colors[scheme].text, borderColor: Colors[scheme].text + '30' },
              ]}
              placeholder="M, 42, EU 40…"
              placeholderTextColor={Colors[scheme].text + '60'}
              value={size}
              onChangeText={setSize}
            />
            <ThemedText style={styles.label}>Prix d&apos;achat (€)</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: Colors[scheme].text, borderColor: Colors[scheme].text + '30' },
              ]}
              placeholder="49.90"
              placeholderTextColor={Colors[scheme].text + '60'}
              keyboardType="decimal-pad"
              value={purchasePrice}
              onChangeText={setPurchasePrice}
            />
            <ThemedText style={styles.label}>Notes</ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.multiline,
                { color: Colors[scheme].text, borderColor: Colors[scheme].text + '30' },
              ]}
              placeholder="Cadeau d'anniversaire, doublure abîmée…"
              placeholderTextColor={Colors[scheme].text + '60'}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Sticky save button */}
      <View
        style={[
          styles.saveBar,
          { backgroundColor: Colors[scheme].background, borderTopColor: Colors[scheme].text + '20' },
        ]}
      >
        <Pressable
          style={[
            styles.saveButton,
            { backgroundColor: canSave ? tint : tint + '60' },
          ]}
          disabled={!canSave}
          onPress={handleSave}
        >
          <ThemedText style={styles.saveButtonText}>Enregistrer</ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Header({ title, onCancel }: { title: string; onCancel: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  return (
    <View style={[styles.header, { borderBottomColor: Colors[scheme].text + '20' }]}>
      <Pressable onPress={onCancel} hitSlop={12}>
        <ThemedText style={styles.headerCancel}>Annuler</ThemedText>
      </Pressable>
      <ThemedText style={styles.headerTitle}>{title}</ThemedText>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function ChipsRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsRow}
    >
      {children}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCancel: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 60,
  },
  // Photo phase
  photoPickerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  analyzingBox: {
    alignItems: 'center',
    gap: 12,
  },
  analyzingText: {
    fontSize: 15,
    opacity: 0.7,
  },
  photoButtons: {
    width: '100%',
    gap: 12,
  },
  bigButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  bigButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  bigButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Attributes phase
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  previewWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    maxHeight: 280,
  },
  changePhoto: {
    padding: 12,
  },
  changePhotoText: {
    fontSize: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    paddingRight: 16,
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  colorsSelected: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  colorTag: {
    fontSize: 13,
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    fontSize: 15,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  thicknessRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  thicknessBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  thicknessText: {
    fontSize: 13,
    fontWeight: '500',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    opacity: 0.8,
  },
  advancedToggle: {
    marginTop: 24,
    paddingVertical: 8,
  },
  advancedToggleText: {
    fontSize: 15,
    fontWeight: '500',
  },
  advancedBody: {
    marginTop: 4,
  },
  // Save bar
  saveBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
