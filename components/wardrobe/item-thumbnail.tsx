import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ClothingItem } from '@/types';

type Props = {
  item: ClothingItem;
  size: number;
  onPress: () => void;
};

/** Square thumbnail with a small favorite indicator. Used in the grid layout. */
export function ItemThumbnail({ item, size, onPress }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const uri = item.photoBgRemovedUri ?? item.photoUri;

  return (
    <Pressable onPress={onPress} style={[styles.wrap, { width: size, height: size }]}>
      <Image
        source={{ uri }}
        style={styles.img}
        contentFit="cover"
        transition={120}
        cachePolicy="memory-disk"
      />
      {item.isFavorite && (
        <View style={[styles.favBadge, { backgroundColor: Colors[scheme].background }]}>
          <ThemedText style={styles.fav}>★</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  img: {
    width: '100%',
    height: '100%',
  },
  favBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fav: {
    fontSize: 13,
    color: '#f1c40f',
    lineHeight: 14,
  },
});
