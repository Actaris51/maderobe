import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { TYPE_LABELS_FR } from '@/constants/taxonomy';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { harmonyScore } from '@/lib/color-utils';
import { generateOutfit } from '@/lib/outfit-generator';
import { currentSeason } from '@/lib/season';
import { useItemsStore } from '@/stores/items-store';
import { useOutfitsStore } from '@/stores/outfits-store';
import { useSettingsStore } from '@/stores/settings-store';
import type { ClothingItem } from '@/types';

type Slot = {
  /** Items eligible for this slot (filtered by type and season), sorted by initial harmony score */
  candidates: ClothingItem[];
  /** Index in candidates of the currently displayed item */
  currentIdx: number;
  /** When locked, the iteration arrows are disabled and Régénérer keeps this slot */
  locked: boolean;
};

const SLOT_ORDER: ClothingItem['type'][] = ['top', 'dress', 'bottom', 'outerwear', 'shoes', 'accessory'];

export default function OutfitOfTheDayScreen() {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  const text = Colors[scheme].text;

  const itemsMap = useItemsStore((s) => s.items);
  const items = useMemo(() => Object.values(itemsMap), [itemsMap]);
  const markItemWorn = useItemsStore((s) => s.markWorn);
  const addOutfit = useOutfitsStore((s) => s.add);
  const defaultOccasion = useSettingsStore((s) => s.defaultOccasion);

  const season = useMemo(() => currentSeason(), []);

  /** Map of slot type → Slot. Only types that actually have items appear here. */
  const [slots, setSlots] = useState<Record<string, Slot>>({});

  // ----- Build the initial outfit on mount -----
  useEffect(() => {
    if (items.length < 2) return;
    const init = generateOutfit(items, { occasion: defaultOccasion, seasons: [season] });
    if (!init) return;
    const chosenItems = init.itemIds.map((id) => itemsMap[id]).filter(Boolean);
    const next: Record<string, Slot> = {};
    for (const it of chosenItems) {
      // Candidates: all items of the same type that match the season
      const candidates = items.filter(
        (i) =>
          i.type === it.type &&
          (i.seasons.length === 0 || i.seasons.includes(season)),
      );
      // Sort candidates by harmony with the rest of the outfit (excluding self)
      const rest = chosenItems.filter((x) => x.id !== it.id && x.colors.length > 0);
      const scored = candidates
        .map((c) => ({
          c,
          score: c.colors[0] ? avgHarmonyAgainst(c, rest) : 0,
        }))
        .sort((a, b) => b.score - a.score);
      const sorted = scored.map((s) => s.c);
      const idx = sorted.findIndex((c) => c.id === it.id);
      next[it.type] = {
        candidates: sorted,
        currentIdx: idx === -1 ? 0 : idx,
        locked: false,
      };
    }
    setSlots(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slotTypesPresent = useMemo(
    () => SLOT_ORDER.filter((t) => slots[t] && slots[t].candidates.length > 0),
    [slots],
  );

  const currentItems: ClothingItem[] = useMemo(
    () =>
      slotTypesPresent
        .map((t) => slots[t].candidates[slots[t].currentIdx])
        .filter(Boolean),
    [slots, slotTypesPresent],
  );

  // ----- Actions -----

  const iterate = useCallback((type: string, dir: 1 | -1) => {
    setSlots((prev) => {
      const s = prev[type];
      if (!s || s.locked) return prev;
      const n = s.candidates.length;
      if (n <= 1) return prev;
      const nextIdx = (s.currentIdx + dir + n) % n;
      return { ...prev, [type]: { ...s, currentIdx: nextIdx } };
    });
  }, []);

  const toggleLock = useCallback((type: string) => {
    setSlots((prev) => {
      const s = prev[type];
      if (!s) return prev;
      return { ...prev, [type]: { ...s, locked: !s.locked } };
    });
  }, []);

  const handleSave = useCallback(() => {
    if (currentItems.length === 0) return;
    addOutfit({
      itemIds: currentItems.map((i) => i.id),
      seasons: [season],
      occasions: [defaultOccasion],
      source: 'suggested',
    });
    Alert.alert('Tenue sauvegardée', 'Elle est dans l’onglet Looks.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [currentItems, addOutfit, season, defaultOccasion]);

  const handleMarkWorn = useCallback(() => {
    if (currentItems.length === 0) return;
    const now = new Date();
    for (const it of currentItems) markItemWorn(it.id, now);
    // Also save it as an outfit (worn outfit, marked as worn)
    const outfit = addOutfit({
      itemIds: currentItems.map((i) => i.id),
      seasons: [season],
      occasions: [defaultOccasion],
      source: 'suggested',
    });
    // Mark the freshly created outfit as worn too
    useOutfitsStore.getState().markWorn(outfit.id, now);
    Alert.alert('Tenue marquée comme portée', 'Elle est dans l’onglet Looks.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [currentItems, markItemWorn, addOutfit, season, defaultOccasion]);

  // ----- Render -----

  if (items.length < 2) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
        <View style={styles.empty}>
          <ThemedText style={styles.emptyTitle}>Garde-robe trop petite</ThemedText>
          <ThemedText style={styles.emptySub}>
            Ajoute au moins 2 vêtements pour pouvoir composer une tenue.
          </ThemedText>
          <Pressable onPress={() => router.back()} style={[styles.emptyCta, { backgroundColor: tint }]}>
            <ThemedText style={styles.emptyCtaText}>Retour</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: text + '15' }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText style={styles.headerBtn}>Fermer</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>Tenue du jour</ThemedText>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText style={styles.tip}>
          ‹ › pour changer un item · 🔒 pour le verrouiller
        </ThemedText>

        {slotTypesPresent.map((type) => {
          const slot = slots[type];
          const item = slot.candidates[slot.currentIdx];
          if (!item) return null;
          return (
            <SlotRow
              key={type}
              type={type}
              item={item}
              candidatesCount={slot.candidates.length}
              currentIdx={slot.currentIdx}
              locked={slot.locked}
              onPrev={() => iterate(type, -1)}
              onNext={() => iterate(type, 1)}
              onToggleLock={() => toggleLock(type)}
            />
          );
        })}

        {currentItems.length > 1 && (
          <View style={styles.scoreCard}>
            <Ionicons name="color-palette-outline" size={20} color={tint} />
            <ThemedText style={styles.scoreText}>
              Harmonie : {totalHarmony(currentItems).toFixed(1)}
            </ThemedText>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.actions, { backgroundColor: Colors[scheme].background, borderTopColor: text + '15' }]}>
        <Pressable
          style={[styles.actionBtn, styles.actionPrimary, { backgroundColor: tint }]}
          onPress={handleMarkWorn}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
          <ThemedText style={[styles.actionText, { color: '#fff' }]}>J&apos;ai porté ça aujourd&apos;hui</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.actionSecondary, { borderColor: tint }]}
          onPress={handleSave}
        >
          <Ionicons name="bookmark-outline" size={18} color={tint} />
          <ThemedText style={[styles.actionText, { color: tint }]}>Sauvegarder</ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Slot row
// ---------------------------------------------------------------------------

function SlotRow({
  type,
  item,
  candidatesCount,
  currentIdx,
  locked,
  onPrev,
  onNext,
  onToggleLock,
}: {
  type: string;
  item: ClothingItem;
  candidatesCount: number;
  currentIdx: number;
  locked: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleLock: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const text = Colors[scheme].text;
  const tint = Colors[scheme].tint;
  const arrowColor = locked ? text + '40' : text;
  const canIterate = candidatesCount > 1 && !locked;
  const uri = item.photoBgRemovedUri ?? item.photoUri;

  return (
    <View style={[slotStyles.wrap, { borderColor: text + '15' }]}>
      <View style={slotStyles.headerRow}>
        <ThemedText style={slotStyles.slotLabel}>
          {TYPE_LABELS_FR[item.type]}
        </ThemedText>
        <ThemedText style={slotStyles.counter}>
          {currentIdx + 1} / {candidatesCount}
        </ThemedText>
      </View>
      <View style={slotStyles.photoRow}>
        <Pressable
          onPress={onPrev}
          disabled={!canIterate}
          hitSlop={10}
          style={[slotStyles.arrowBtn, !canIterate && { opacity: 0.3 }]}
        >
          <Ionicons name="chevron-back" size={28} color={arrowColor} />
        </Pressable>
        <View style={[slotStyles.photoFrame, { backgroundColor: scheme === 'light' ? '#f0f0f0' : '#1f1f1f' }]}>
          <Image source={{ uri }} style={slotStyles.photo} contentFit="contain" transition={150} />
        </View>
        <Pressable
          onPress={onNext}
          disabled={!canIterate}
          hitSlop={10}
          style={[slotStyles.arrowBtn, !canIterate && { opacity: 0.3 }]}
        >
          <Ionicons name="chevron-forward" size={28} color={arrowColor} />
        </Pressable>
      </View>
      <View style={slotStyles.bottomRow}>
        <ThemedText style={slotStyles.itemName} numberOfLines={1}>
          {item.subType ?? TYPE_LABELS_FR[item.type]}
        </ThemedText>
        <Pressable onPress={onToggleLock} hitSlop={10} style={slotStyles.lockBtn}>
          <Ionicons
            name={locked ? 'lock-closed' : 'lock-open-outline'}
            size={20}
            color={locked ? tint : text + '80'}
          />
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function avgHarmonyAgainst(item: ClothingItem, against: ClothingItem[]): number {
  if (item.colors.length === 0 || against.length === 0) return 0;
  const c = item.colors[0];
  let sum = 0;
  let count = 0;
  for (const other of against) {
    if (other.colors.length === 0) continue;
    sum += harmonyScore(c, other.colors[0]);
    count++;
  }
  return count > 0 ? sum / count : 0;
}

function totalHarmony(items: ClothingItem[]): number {
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i].colors[0];
      const b = items[j].colors[0];
      if (a && b) sum += harmonyScore(a, b);
    }
  }
  return sum;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  headerBtn: { fontSize: 16, width: 50 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: 16 },
  tip: { fontSize: 12, opacity: 0.5, textAlign: 'center', marginBottom: 16 },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#00000008',
  },
  scoreText: { fontSize: 14, fontWeight: '500' },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionPrimary: {},
  actionSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  actionText: { fontSize: 15, fontWeight: '600' },
  empty: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptySub: { fontSize: 14, opacity: 0.6, textAlign: 'center' },
  emptyCta: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  emptyCtaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

const slotStyles = StyleSheet.create({
  wrap: {
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  counter: { fontSize: 12, opacity: 0.5 },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowBtn: { padding: 4 },
  photoFrame: {
    flex: 1,
    aspectRatio: 1.4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  itemName: { fontSize: 15, fontWeight: '500', flex: 1 },
  lockBtn: { padding: 6 },
});
