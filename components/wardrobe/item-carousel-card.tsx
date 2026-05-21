import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import {
  PATTERN_LABELS_FR,
  SEASON_LABELS_FR,
  TYPE_LABELS_FR,
} from '@/constants/taxonomy';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ClothingItem } from '@/types';

type Props = {
  item: ClothingItem;
  width: number;
  onPress: () => void;
};

/**
 * Large coverflow-style card used in the carousel layout.
 * Shows the photo full-width on top + attributes summary below.
 */
export function ItemCarouselCard({ item, width, onPress }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const uri = item.photoBgRemovedUri ?? item.photoUri;
  const seasonLabel =
    item.seasons.length === 0
      ? 'Toutes saisons'
      : item.seasons.map((s) => SEASON_LABELS_FR[s]).join(', ');

  return (
    <Pressable onPress={onPress} style={[styles.card, { width, backgroundColor: Colors[scheme].background }]}>
      <View style={[styles.imgWrap, { backgroundColor: scheme === 'light' ? '#f0f0f0' : '#1f1f1f' }]}>
        <Image
          source={{ uri }}
          style={styles.img}
          contentFit="contain"
          transition={120}
          cachePolicy="memory-disk"
        />
        {item.isFavorite && (
          <View style={styles.favBadge}>
            <ThemedText style={styles.fav}>★</ThemedText>
          </View>
        )}
      </View>
      <View style={styles.meta}>
        <ThemedText style={styles.title}>
          {item.subType ?? TYPE_LABELS_FR[item.type]}
        </ThemedText>
        <View style={styles.colorsRow}>
          {item.colors.slice(0, 2).map((c) => (
            <View key={c.hex} style={[styles.swatch, { backgroundColor: c.hex }]} />
          ))}
          <ThemedText style={styles.metaText}>
            {' '}
            · {PATTERN_LABELS_FR[item.pattern]} · {seasonLabel}
          </ThemedText>
        </View>
        {item.wearCount > 0 && (
          <ThemedText style={styles.wearCount}>Porté {item.wearCount}×</ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  imgWrap: {
    aspectRatio: 1,
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  img: {
    width: '100%',
    height: '100%',
  },
  favBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  fav: {
    fontSize: 16,
    color: '#f1c40f',
  },
  meta: {
    paddingHorizontal: 4,
    paddingTop: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  colorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#00000020',
    marginRight: 4,
  },
  metaText: {
    fontSize: 13,
    opacity: 0.7,
  },
  wearCount: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
});
