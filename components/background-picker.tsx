import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { HAPTIC } from '@/constants/motion';
import {
  FLAT_LAY_BACKGROUNDS,
  type FlatLayBackground,
} from '@/constants/flat-lay-backgrounds';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Horizontal swatch picker for the flat-lay background. Each swatch is a
 * colored circle showing the canvas fill; the currently-selected one gets a
 * tint-colored ring + a label below.
 */

type Props = {
  /** ID of the currently selected background. */
  selectedId: string;
  /** Called when the user taps a different swatch. */
  onSelect: (bg: FlatLayBackground) => void;
};

export function BackgroundPicker({ selectedId, onSelect }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  const text = Colors[scheme].text;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {FLAT_LAY_BACKGROUNDS.map((bg) => {
          const selected = selectedId === bg.id;
          return (
            <Pressable
              key={bg.id}
              onPress={() => {
                HAPTIC.selection();
                onSelect(bg);
              }}
              hitSlop={6}
              style={styles.swatchWrap}
            >
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: bg.color, borderColor: text + '20' },
                  selected && {
                    borderColor: tint,
                    borderWidth: 3,
                    transform: [{ scale: 1.08 }],
                  },
                ]}
              >
                <Image
                  source={bg.texture}
                  style={styles.swatchTexture}
                  contentFit="cover"
                />
              </View>
              <ThemedText
                style={[styles.label, selected && { color: tint, fontWeight: '600' }]}
              >
                {bg.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  swatchWrap: {
    alignItems: 'center',
    gap: 6,
    minWidth: 56,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  swatchTexture: {
    width: '100%',
    height: '100%',
  },
  label: {
    fontSize: 11,
    opacity: 0.7,
  },
});
