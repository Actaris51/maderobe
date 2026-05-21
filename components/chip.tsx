import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from './themed-text';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
  testID?: string;
};

/**
 * Toggleable chip used for type / sub-type / pattern / season / occasion selection.
 * Outlined when unselected, filled when selected.
 */
export function Chip({ label, selected, onPress, style, testID }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  const text = Colors[scheme].text;

  return (
    <Pressable onPress={onPress} testID={testID} hitSlop={6}>
      <View
        style={[
          styles.chip,
          {
            backgroundColor: selected ? tint : 'transparent',
            borderColor: selected ? tint : text + '40',
          },
          style,
        ]}
      >
        <ThemedText
          style={[
            styles.label,
            { color: selected ? (scheme === 'light' ? '#fff' : '#000') : text },
          ]}
        >
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
});
