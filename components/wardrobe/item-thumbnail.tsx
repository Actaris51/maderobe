import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SPRING, staggerDelay, HAPTIC } from '@/constants/motion';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ClothingItem } from '@/types';

type Props = {
  item: ClothingItem;
  size: number;
  onPress: () => void;
  /** Index in the parent list — used to compute a staggered reveal delay. */
  index?: number;
};

/**
 * Square thumbnail with:
 *  - staggered fade-in on mount (Reanimated FadeIn + spring)
 *  - press-to-shrink spring (snappy)
 *  - haptic on press
 *  - favorite badge
 */
export function ItemThumbnail({ item, size, onPress, index = 0 }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const uri = item.photoBgRemovedUri ?? item.photoUri;

  // Press-to-shrink scale
  const pressScale = useSharedValue(1);
  const animatedPress = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = () => {
    pressScale.value = withSpring(0.95, SPRING.snappy);
  };
  const handlePressOut = () => {
    pressScale.value = withSpring(1, SPRING.snappy);
  };
  const handlePress = () => {
    HAPTIC.tap();
    onPress();
  };

  return (
    // Reanimated 4: outer view owns the layout animation (FadeIn stagger),
    // inner view owns the animated transform (press scale). Combining both
    // on the same Animated.View triggers a warning and can blank the screen.
    <Animated.View
      entering={FadeIn.delay(staggerDelay(index)).duration(350)}
      style={[styles.wrap, { width: size, height: size }]}
    >
      <Animated.View style={[styles.fill, animatedPress]}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.pressable}
        >
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
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  pressable: {
    width: '100%',
    height: '100%',
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
