import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import {
  PATTERN_LABELS_FR,
  SEASON_LABELS_FR,
  TYPE_LABELS_FR,
} from '@/constants/taxonomy';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useItemsStore } from '@/stores/items-store';

/**
 * Placeholder item detail screen.
 * Phase 6 will replace this with the full edit + share UX.
 */
export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const item = useItemsStore((s) => (id ? s.items[id] : undefined));
  const markWorn = useItemsStore((s) => s.markWorn);
  const toggleFavorite = useItemsStore((s) => s.toggleFavorite);

  if (!id || !item) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
        <ThemedText style={styles.notFound}>Vêtement introuvable.</ThemedText>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ThemedText style={{ color: Colors[scheme].tint }}>Retour</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText style={[styles.headerBtn, { color: Colors[scheme].tint }]}>← Retour</ThemedText>
        </Pressable>
      </View>
      <View style={styles.body}>
        <ThemedText type="title">
          {item.subType ?? TYPE_LABELS_FR[item.type]}
        </ThemedText>
        <ThemedText style={styles.meta}>
          {PATTERN_LABELS_FR[item.pattern]} ·{' '}
          {item.colors.map((c) => c.name ?? c.hex).join(', ')}
        </ThemedText>
        {item.seasons.length > 0 && (
          <ThemedText style={styles.meta}>
            {item.seasons.map((s) => SEASON_LABELS_FR[s]).join(', ')}
          </ThemedText>
        )}
        {item.brand && <ThemedText style={styles.meta}>Marque : {item.brand}</ThemedText>}
        {item.size && <ThemedText style={styles.meta}>Taille : {item.size}</ThemedText>}
        <ThemedText style={styles.meta}>
          Porté {item.wearCount} fois
          {item.lastWornAt ? ` · dernière : ${new Date(item.lastWornAt).toLocaleDateString()}` : ''}
        </ThemedText>

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: Colors[scheme].tint }]}
            onPress={() => markWorn(item.id)}
          >
            <ThemedText style={styles.actionText}>Marquer comme porté</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: item.isFavorite ? '#f1c40f' : '#888' }]}
            onPress={() => toggleFavorite(item.id)}
          >
            <ThemedText style={styles.actionText}>
              {item.isFavorite ? '★ Favori' : '☆ Ajouter aux favoris'}
            </ThemedText>
          </Pressable>
        </View>

        <ThemedText style={styles.todo}>
          Édition + partage Vinted/Leboncoin → Phase 6
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: { fontSize: 16 },
  body: { padding: 16, gap: 8 },
  meta: { fontSize: 15, opacity: 0.7 },
  actions: { gap: 12, marginTop: 24 },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  todo: {
    marginTop: 32,
    fontStyle: 'italic',
    opacity: 0.5,
    fontSize: 13,
  },
  notFound: {
    flex: 1,
    textAlign: 'center',
    marginTop: 80,
    fontSize: 16,
    opacity: 0.7,
  },
  backBtn: { alignSelf: 'center', padding: 16 },
});
