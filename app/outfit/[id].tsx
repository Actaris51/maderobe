import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert, Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ShareableFlatLay } from '@/components/shareable-flat-lay';
import { ThemedText } from '@/components/themed-text';
import {
  OCCASION_LABELS_FR,
  SEASON_LABELS_FR,
  TYPE_LABELS_FR,
} from '@/constants/taxonomy';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useItemsStore } from '@/stores/items-store';
import { useOutfitsStore } from '@/stores/outfits-store';
import type { ClothingItem } from '@/types';

const SCREEN_W = Dimensions.get('window').width;

export default function OutfitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  const text = Colors[scheme].text;

  const outfit = useOutfitsStore((s) => (id ? s.outfits[id] : undefined));
  const removeOutfit = useOutfitsStore((s) => s.remove);
  const markOutfitWorn = useOutfitsStore((s) => s.markWorn);
  const toggleOutfitFavorite = useOutfitsStore((s) => s.toggleFavorite);
  const itemsMap = useItemsStore((s) => s.items);
  const markItemWorn = useItemsStore((s) => s.markWorn);

  const items: ClothingItem[] = useMemo(() => {
    if (!outfit) return [];
    return outfit.itemIds.map((iid) => itemsMap[iid]).filter(Boolean);
  }, [outfit, itemsMap]);


  const handleMarkWorn = useCallback(() => {
    if (!outfit) return;
    const now = new Date();
    markOutfitWorn(outfit.id, now);
    // Cascade: each item in the outfit gets its wear count bumped too
    for (const it of items) markItemWorn(it.id, now);
  }, [outfit, items, markOutfitWorn, markItemWorn]);

  const handleDelete = useCallback(() => {
    if (!outfit) return;
    Alert.alert('Supprimer cette tenue ?', 'Les vêtements de ta garde-robe ne sont pas supprimés.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          removeOutfit(outfit.id);
          router.back();
        },
      },
    ]);
  }, [outfit, removeOutfit]);

  if (!id || !outfit) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
        <ThemedText style={styles.notFound}>Tenue introuvable.</ThemedText>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ThemedText style={{ color: tint }}>Retour</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  const lastWornText = outfit.lastWornAt
    ? `dernière fois le ${new Date(outfit.lastWornAt).toLocaleDateString('fr-FR')}`
    : 'jamais portée';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: Colors[scheme].background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: text + '15' }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={26} color={text} />
        </Pressable>
        <ThemedText style={styles.headerTitle} numberOfLines={1}>
          {outfit.name ?? 'Tenue'}
        </ThemedText>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Pinterest-style flat-lay preview of the outfit — shareable as PNG */}
        {items.length > 0 && (
          <View style={styles.flatLayWrap}>
            <ShareableFlatLay items={items} width={SCREEN_W - 32} />
          </View>
        )}

        {/* Items stack */}
        <View style={styles.stack}>
          {items.map((it) => (
            <View
              key={it.id}
              style={[styles.itemRow, { borderColor: text + '15' }]}
            >
              <Image
                source={{ uri: it.photoBgRemovedUri ?? it.photoUri }}
                style={styles.thumb}
                contentFit="contain"
                transition={120}
              />
              <View style={styles.itemMeta}>
                <ThemedText style={styles.itemTitle}>
                  {it.subType ?? TYPE_LABELS_FR[it.type]}
                </ThemedText>
                <View style={styles.colorsLine}>
                  {it.colors.map((c) => (
                    <View key={c.hex} style={[styles.swatch, { backgroundColor: c.hex }]} />
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Meta */}
        <View style={[styles.section, { borderColor: text + '15' }]}>
          <ThemedText style={styles.sectionTitle}>À propos</ThemedText>
          {outfit.occasions.length > 0 && (
            <Detail
              label="Contexte"
              value={outfit.occasions.map((o) => OCCASION_LABELS_FR[o]).join(', ')}
            />
          )}
          {outfit.seasons.length > 0 && (
            <Detail
              label="Saisons"
              value={outfit.seasons.map((s) => SEASON_LABELS_FR[s]).join(', ')}
            />
          )}
          <Detail
            label="Source"
            value={outfit.source === 'suggested' ? 'Suggérée par Maderobe' : 'Manuelle'}
          />
          <Detail label="Portée" value={`${outfit.wearCount} fois (${lastWornText})`} />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View
        style={[
          styles.actionBar,
          { backgroundColor: Colors[scheme].background, borderTopColor: text + '15' },
        ]}
      >
        <Pressable
          style={[styles.markBtn, { backgroundColor: tint }]}
          onPress={handleMarkWorn}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <ThemedText style={styles.markBtnText}>Marquer comme portée</ThemedText>
        </Pressable>
        <View style={styles.secondaryRow}>
          <IconAction
            icon={outfit.isFavorite ? 'star' : 'star-outline'}
            color={outfit.isFavorite ? '#f1c40f' : text}
            label="Favori"
            onPress={() => toggleOutfitFavorite(outfit.id)}
          />
          <IconAction icon="trash-outline" color="#e74c3c" label="Supprimer" onPress={handleDelete} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText style={styles.detailValue}>{value}</ThemedText>
    </View>
  );
}

function IconAction({
  icon,
  color,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.iconAction} hitSlop={6}>
      <Ionicons name={icon} size={22} color={color} />
      <ThemedText style={[styles.iconActionLabel, { color }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { paddingHorizontal: 8, paddingVertical: 4, width: 50 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  scroll: { padding: 16 },
  flatLayWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stack: { gap: 8 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#f0f0f0' },
  itemMeta: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '500' },
  colorsLine: { flexDirection: 'row', gap: 6, marginTop: 4 },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#00000020' },
  section: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8, opacity: 0.7 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detailLabel: { fontSize: 14, opacity: 0.6 },
  detailValue: { fontSize: 14, fontWeight: '500' },
  actionBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  markBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  markBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  iconAction: { alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 4 },
  iconActionLabel: { fontSize: 12 },
  notFound: { flex: 1, textAlign: 'center', marginTop: 80, fontSize: 16, opacity: 0.7 },
  backBtn: { alignSelf: 'center', padding: 16 },
});
