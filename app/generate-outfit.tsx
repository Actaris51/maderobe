import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HAPTIC, staggerDelay } from '@/constants/motion';

import { Chip } from '@/components/chip';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import {
  OCCASIONS_ORDER,
  OCCASION_LABELS_FR,
  SEASONS_ORDER,
  SEASON_LABELS_FR,
  TYPE_LABELS_FR,
} from '@/constants/taxonomy';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { currentSeason } from '@/lib/season';
import {
  generateOutfit,
  type GeneratedOutfit,
} from '@/lib/outfit-generator';
import { useItemsStore } from '@/stores/items-store';
import { useOutfitsStore } from '@/stores/outfits-store';
import { useSettingsStore } from '@/stores/settings-store';
import type { ClothingItem, Occasion, Season } from '@/types';

export default function GenerateOutfitScreen() {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  const text = Colors[scheme].text;

  const itemsMap = useItemsStore((s) => s.items);
  const items = useMemo(() => Object.values(itemsMap), [itemsMap]);
  const addOutfit = useOutfitsStore((s) => s.add);
  const defaultOccasion = useSettingsStore((s) => s.defaultOccasion);

  // Pickers
  const [occasion, setOccasion] = useState<Occasion>(defaultOccasion);
  const [seasons, setSeasons] = useState<Season[]>([currentSeason()]);

  // Result state
  const [result, setResult] = useState<GeneratedOutfit | null>(null);
  const [previousIds, setPreviousIds] = useState<string[]>([]);

  const toggleSeason = useCallback(
    (s: Season) =>
      setSeasons((cur) =>
        cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
      ),
    [],
  );

  const handleGenerate = useCallback(() => {
    if (seasons.length === 0) {
      Alert.alert('Saison manquante', 'Sélectionne au moins une saison.');
      return;
    }
    if (items.length < 2) {
      Alert.alert(
        'Garde-robe trop petite',
        'Ajoute au moins 2 vêtements à ta garde-robe avant de demander une suggestion.',
      );
      return;
    }
    const next = generateOutfit(items, { occasion, seasons });
    if (!next) {
      Alert.alert(
        'Pas de tenue trouvée',
        "Aucune combinaison ne correspond à ce contexte et à ces saisons. Essaie d'élargir les filtres.",
      );
      return;
    }
    setResult(next);
    setPreviousIds([]);
    HAPTIC.medium();
  }, [items, occasion, seasons]);

  const handleRegenerate = useCallback(() => {
    if (!result) {
      handleGenerate();
      return;
    }
    // Exclude the pivot of the previous suggestion so we get a meaningfully different look
    const pivot = result.itemIds[0];
    const next = generateOutfit(items, {
      occasion,
      seasons,
      excludeItemIds: [pivot, ...previousIds],
    });
    if (!next) {
      // Reset exclusions and try again
      const fresh = generateOutfit(items, { occasion, seasons });
      if (!fresh) {
        Alert.alert('Plus de variation possible', 'Toutes les combinaisons proches ont été essayées.');
        return;
      }
      setResult(fresh);
      setPreviousIds([]);
      return;
    }
    setPreviousIds((prev) => [...prev, pivot]);
    setResult(next);
    HAPTIC.tap();
  }, [items, occasion, seasons, result, previousIds, handleGenerate]);

  const handleSave = useCallback(() => {
    if (!result) return;
    HAPTIC.success();
    addOutfit({
      itemIds: result.itemIds,
      seasons,
      occasions: [occasion],
      source: 'suggested',
    });
    Alert.alert('Tenue sauvegardée', 'Tu la retrouveras dans l’onglet Looks.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [addOutfit, result, seasons, occasion]);

  const resolvedItems: ClothingItem[] = useMemo(
    () => (result ? result.itemIds.map((id) => itemsMap[id]).filter(Boolean) : []),
    [result, itemsMap],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: Colors[scheme].background }]}
    >
      <View style={[styles.header, { borderBottomColor: text + '15' }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText style={styles.headerCancel}>Annuler</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>Suggérer une tenue</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Pickers */}
        <SectionHeader title="Contexte" />
        <View style={styles.chipsRow}>
          {OCCASIONS_ORDER.map((o) => (
            <Chip
              key={o}
              label={OCCASION_LABELS_FR[o]}
              selected={occasion === o}
              onPress={() => setOccasion(o)}
            />
          ))}
        </View>

        <SectionHeader title="Saisons" subtitle="Une ou plusieurs." />
        <View style={styles.chipsRow}>
          {SEASONS_ORDER.map((s) => (
            <Chip
              key={s}
              label={SEASON_LABELS_FR[s]}
              selected={seasons.includes(s)}
              onPress={() => toggleSeason(s)}
            />
          ))}
        </View>

        {/* Generate button (always visible) */}
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: tint, marginTop: 24 }]}
          onPress={result ? handleRegenerate : handleGenerate}
        >
          <Ionicons name="sparkles-outline" size={18} color="#fff" />
          <ThemedText style={styles.primaryBtnText}>
            {result ? 'Une autre suggestion' : 'Générer une tenue'}
          </ThemedText>
        </Pressable>

        {/* Result */}
        {result && resolvedItems.length > 0 && (
          <View style={styles.resultBlock}>
            <ThemedText style={styles.resultTitle}>Suggestion</ThemedText>
            <ThemedText style={styles.resultMeta}>
              {resolvedItems.length} pièces · Harmonie {result.score.toFixed(1)}
            </ThemedText>
            <View style={styles.outfitStack}>
              {resolvedItems.map((it, i) => (
                <Animated.View
                  // Re-key on result so the cascade re-fires on each regenerate
                  key={`${result.itemIds.join('-')}-${it.id}`}
                  entering={FadeInDown.springify()
                    .damping(14)
                    .stiffness(180)
                    .delay(staggerDelay(i, 120, 800))}
                >
                  <OutfitItemRow item={it} />
                </Animated.View>
              ))}
            </View>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: tint, marginTop: 16 }]}
              onPress={handleSave}
            >
              <Ionicons name="bookmark-outline" size={18} color="#fff" />
              <ThemedText style={styles.primaryBtnText}>Sauvegarder cette tenue</ThemedText>
            </Pressable>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Row showing one item in the suggestion stack
// ---------------------------------------------------------------------------

function OutfitItemRow({ item }: { item: ClothingItem }) {
  const scheme = useColorScheme() ?? 'light';
  const uri = item.photoBgRemovedUri ?? item.photoUri;
  return (
    <View style={[rowStyles.wrap, { borderColor: Colors[scheme].text + '15' }]}>
      <Image source={{ uri }} style={rowStyles.thumb} contentFit="contain" transition={120} />
      <View style={rowStyles.meta}>
        <ThemedText style={rowStyles.title}>
          {item.subType ?? TYPE_LABELS_FR[item.type]}
        </ThemedText>
        <View style={rowStyles.colorsLine}>
          {item.colors.map((c) => (
            <View key={c.hex} style={[rowStyles.swatch, { backgroundColor: c.hex }]} />
          ))}
          <ThemedText style={rowStyles.colorsText} numberOfLines={1}>
            {item.colors.map((c) => c.name ?? c.hex).join(' + ')}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#f0f0f0' },
  meta: { flex: 1 },
  title: { fontSize: 15, fontWeight: '500' },
  colorsLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  swatch: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: '#00000020' },
  colorsText: { fontSize: 12, opacity: 0.6, marginLeft: 4 },
});

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
  scroll: { padding: 16 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resultBlock: { marginTop: 24 },
  resultTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  resultMeta: { fontSize: 13, opacity: 0.6, marginBottom: 12 },
  outfitStack: { marginTop: 8 },
});
