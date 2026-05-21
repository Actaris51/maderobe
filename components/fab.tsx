import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  onPress: () => void;
  label?: string;
  /** Render below this many pixels from bottom (defaults to 24, raise above tab bar). */
  bottom?: number;
};

/**
 * Floating Action Button — a round "+" pinned to the bottom-right.
 * Uses the active tint color from the theme.
 */
export function Fab({ onPress, label = '+', bottom = 24 }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: tint, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <ThemedText style={styles.label}>{label}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 20,
    alignItems: 'flex-end',
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  label: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
});
