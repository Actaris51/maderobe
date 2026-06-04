import { Image } from 'expo-image';
import { useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  DEFAULT_FLAT_LAY_BACKGROUND,
  type FlatLayBackground,
} from '@/constants/flat-lay-backgrounds';
import { ThemedText } from '@/components/themed-text';
import type { ClothingItem, ClothingType } from '@/types';

/**
 * Pinterest-style flat-lay composer.
 *
 * Lays out a set of clothing items on a canvas with drop shadows + per-type
 * positioning (top centered, bottom on the left, shoes anchoring the bottom,
 * accessories in the corners) to mimic the "outfit grid" you see on Pinterest.
 *
 * Items should ideally have `photoBgRemovedUri` set (via MaderobeVision) so
 * they render cleanly on the background. We fall back to `photoUri` otherwise.
 *
 * Phase B added the basic layout.
 * Phase C adds:
 *   - Selectable background presets (dark/light wood, marble, linen, charcoal)
 *   - Per-background shadow tint (warm shadows on light woods, etc.)
 *   - Stagger-cascade arrival animation (items "fall" into place on mount)
 *   - Optional "via Maderobe" watermark for sharing
 *
 * Export to PNG (for Instagram/Pinterest) would require react-native-view-shot,
 * a new native module = new EAS build. iOS screenshot works fine meanwhile.
 */

type Props = {
  items: ClothingItem[];
  /** Total width of the canvas in pixels. Height derives from ASPECT_RATIO. */
  width: number;
  /** Background preset. Defaults to dark wood. */
  background?: FlatLayBackground;
  /** Show "via Maderobe" watermark in the bottom-right corner. */
  showWatermark?: boolean;
  /** Animate items in on mount with a staggered cascade. Defaults to true. */
  animate?: boolean;
  style?: ViewStyle;
};

/** Canvas is 1:1 — perfect Instagram square format and avoids dead vertical
 *  space below items when the outfit has few pieces. */
const ASPECT_RATIO = 1;

/** Per-item-type slot in the layout. Coordinates are RATIOS of the canvas. */
type LayoutSlot = {
  /** Center X position (0..1). */
  x: number;
  /** Center Y position (0..1). */
  y: number;
  /** Item width as a fraction of canvas width (0..1). Height matches. */
  size: number;
  /** Rotation in degrees — small angles give the casual flat-lay vibe. */
  rotate: number;
  /** Z-index (higher = on top). */
  z: number;
};

/**
 * Layout coordinates tuned for a 1:1 canvas. Items spread across the full
 * height (y 0.2 → 0.85) to avoid the dead space the user noted with the 3:4
 * portrait version.
 */
const LAYOUT: Record<ClothingType, LayoutSlot> = {
  top:       { x: 0.55, y: 0.38, size: 0.48, rotate: 0,   z: 3 },
  outerwear: { x: 0.78, y: 0.32, size: 0.38, rotate: 3,   z: 2 },
  bottom:    { x: 0.22, y: 0.50, size: 0.34, rotate: -3,  z: 2 },
  dress:     { x: 0.5,  y: 0.50, size: 0.58, rotate: 0,   z: 3 },
  shoes:     { x: 0.48, y: 0.84, size: 0.52, rotate: 0,   z: 4 },
  bag:       { x: 0.82, y: 0.66, size: 0.26, rotate: 8,   z: 5 },
  belt:      { x: 0.38, y: 0.68, size: 0.30, rotate: -4,  z: 5 },
  accessory: { x: 0.18, y: 0.80, size: 0.20, rotate: -10, z: 5 },
  jewelry:   { x: 0.85, y: 0.86, size: 0.16, rotate: 12,  z: 5 },
  unknown:   { x: 0.5,  y: 0.5,  size: 0.25, rotate: 0,   z: 1 },
};

export function FlatLayComposer({
  items,
  width,
  background = DEFAULT_FLAT_LAY_BACKGROUND,
  showWatermark = false,
  animate = true,
  style,
}: Props) {
  const height = width / ASPECT_RATIO;

  // Nudge duplicates of the same type so they don't overlap perfectly.
  const positioned = useMemo(() => {
    const typeCount: Record<string, number> = {};
    return items.map((item, idx) => {
      const slot = LAYOUT[item.type];
      const seen = typeCount[item.type] ?? 0;
      typeCount[item.type] = seen + 1;
      return {
        item,
        idx,
        x: Math.min(1, slot.x + seen * 0.06),
        y: Math.min(1, slot.y + seen * 0.04),
        size: slot.size,
        rotate: slot.rotate + seen * 4,
        z: slot.z + seen,
      };
    });
  }, [items]);

  // Sort by z so higher-z items render last (= on top).
  const ordered = useMemo(() => [...positioned].sort((a, b) => a.z - b.z), [positioned]);

  return (
    <View
      style={[
        styles.canvas,
        { width, height, backgroundColor: background.color },
        style,
      ]}
    >
      {/* Procedural texture background — covers the whole canvas */}
      <Image
        source={background.texture}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={150}
      />

      {ordered.map(({ item, idx, x, y, size, rotate }) => {
        const itemW = width * size;
        const itemH = itemW;
        const uri = item.photoBgRemovedUri ?? item.photoUri;
        // Outer view owns the layout animation (FadeInDown stagger).
        // Inner view owns the static transform (rotation + drop shadow) so we
        // don't violate Reanimated 4's "no transform-vs-layout-animation
        // conflict on the same view" rule.
        return (
          <Animated.View
            key={item.id}
            entering={
              animate
                ? FadeInDown.springify()
                    .damping(15)
                    .stiffness(150)
                    .delay(idx * 110)
                : undefined
            }
            style={[
              styles.slotOuter,
              {
                width: itemW,
                height: itemH,
                left: width * x - itemW / 2,
                top: height * y - itemH / 2,
              },
            ]}
          >
            <View
              style={[
                styles.slotInner,
                {
                  transform: [{ rotate: `${rotate}deg` }],
                  shadowColor: background.shadowColor,
                },
              ]}
            >
              <Image
                source={{ uri }}
                style={styles.itemImg}
                contentFit="contain"
                transition={120}
              />
            </View>
          </Animated.View>
        );
      })}

      {showWatermark && (
        <View pointerEvents="none" style={styles.watermarkWrap}>
          <ThemedText
            style={[
              styles.watermark,
              { color: background.watermarkColor },
            ]}
          >
            via Maderobe
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  slotOuter: {
    position: 'absolute',
  },
  slotInner: {
    width: '100%',
    height: '100%',
    // Drop shadow — iOS native, big and soft like a flat-lay studio photo.
    shadowOpacity: 0.42,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 12,
  },
  itemImg: {
    width: '100%',
    height: '100%',
  },
  watermarkWrap: {
    position: 'absolute',
    bottom: 10,
    right: 14,
  },
  watermark: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
