import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fab } from '@/components/fab';
import { ThemedText } from '@/components/themed-text';
import {
  OCCASION_LABELS_FR,
  SEASON_LABELS_FR,
} from '@/constants/taxonomy';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useItemsStore } from '@/stores/items-store';
import { useOutfitsStore } from '@/stores/outfits-store';
import type { Outfit } from '@/types';

export default function LooksScreen() {
  const scheme = useColorScheme() ?? 'light';
  const text = Colors[scheme].text;

  const outfitsMap = useOutfitsStore((s) => s.outfits);
  const outfits = useMemo(
    () => Object.values(outfitsMap).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [outfitsMap],
  );

  const handleGenerate = () => router.push('/generate-outfit');
  const handleOutfitOfTheDay = () => router.push('/outfit-of-the-day');
  const handleOpen = (id: string) => router.push(`/outfit/${id}` as never);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: Colors[scheme].background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: text + '15' }]}>
        <ThemedText style={styles.title}>Looks</ThemedText>
        <View style={styles.headerActions}>
          <Pressable onPress={handleOutfitOfTheDay} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="sunny-outline" size={22} color={text} />
          </Pressable>
          <Pressable onPress={handleGenerate} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="sparkles-outline" size={22} color={text} />
          </Pressable>
        </View>
      </View>

      {outfits.length === 0 ? (
        <EmptyState onGenerate={handleGenerate} />
      ) : (
        <FlatList
          data={outfits}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <OutfitCard outfit={item} onPress={() => handleOpen(item.id)} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      <Fab label="✨" onPress={handleGenerate} />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Outfit card
// ---------------------------------------------------------------------------

function OutfitCard({ outfit, onPress }: { outfit: Outfit; onPress: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const text = Colors[scheme].text;
  const itemsMap = useItemsStore((s) => s.items);

  const items = useMemo(
    () => outfit.itemIds.map((id) => itemsMap[id]).filter(Boolean),
    [outfit.itemIds, itemsMap],
  );

  const occasionLabel =
    outfit.occasions.length > 0 ? outfit.occasions.map((o) => OCCASION_LABELS_FR[o]).join(', ') : null;
  const seasonLabel =
    outfit.seasons.length > 0 ? outfit.seasons.map((s) => SEASON_LABELS_FR[s]).join(', ') : null;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { borderColor: text + '15', backgroundColor: Colors[scheme].background }]}
    >
      <View style={styles.thumbsRow}>
        {items.slice(0, 4).map((it) => (
          <View
            key={it.id}
            style={[
              styles.thumb,
              { backgroundColor: scheme === 'light' ? '#f0f0f0' : '#1f1f1f' },
            ]}
          >
            <Image
              source={{ uri: it.photoBgRemovedUri ?? it.photoUri }}
              style={styles.thumbImg}
              contentFit="contain"
              transition={120}
            />
          </View>
        ))}
        {items.length > 4 && (
          <View style={[styles.thumb, styles.thumbMore]}>
            <ThemedText style={styles.thumbMoreText}>+{items.length - 4}</ThemedText>
          </View>
        )}
      </View>
      <View style={styles.cardMeta}>
        <ThemedText style={styles.cardTitle}>
          {outfit.name ?? `${items.length} pièces`}
        </ThemedText>
        <ThemedText style={styles.cardSubtitle}>
          {[occasionLabel, seasonLabel].filter(Boolean).join(' · ')}
        </ThemedText>
        {outfit.wearCount > 0 && (
          <ThemedText style={styles.cardWear}>Portée {outfit.wearCount}×</ThemedText>
        )}
      </View>
      {outfit.isFavorite && (
        <View style={styles.favBadge}>
          <ThemedText style={styles.favText}>★</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  const itemsCount = useItemsStore((s) => Object.keys(s.items).length);
  const enoughItems = itemsCount >= 2;

  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="sparkles-outline" size={48} color={tint} />
      <ThemedText style={styles.emptyTitle}>Aucune tenue sauvegardée.</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        {enoughItems
          ? 'Génère une suggestion basée sur l\'harmonie des couleurs de ta garde-robe.'
          : `Ajoute au moins 2 vêtements à ta garde-robe (${itemsCount} pour l'instant) avant de demander une suggestion.`}
      </ThemedText>
      {enoughItems && (
        <Pressable
          style={[styles.emptyCta, { backgroundColor: tint }]}
          onPress={onGenerate}
        >
          <ThemedText style={styles.emptyCtaText}>Génère ma première tenue</ThemedText>
        </Pressable>
      )}
    </View>
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
  title: { fontSize: 24, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  iconBtn: { padding: 8 },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    position: 'relative',
  },
  thumbsRow: { flexDirection: 'row', gap: 4 },
  thumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbMore: { backgroundColor: '#00000010' },
  thumbMoreText: { fontSize: 14, fontWeight: '600', opacity: 0.5 },
  cardMeta: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSubtitle: { fontSize: 13, opacity: 0.6, marginTop: 2 },
  cardWear: { fontSize: 12, opacity: 0.5, marginTop: 4 },
  favBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favText: { color: '#f1c40f', fontSize: 14 },
  emptyWrap: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, opacity: 0.6, textAlign: 'center', maxWidth: 320 },
  emptyCta: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyCtaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
