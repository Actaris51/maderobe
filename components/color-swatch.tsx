import { Pressable, StyleSheet, View } from 'react-native';

type Props = {
  hex: string;
  selected: boolean;
  onPress: () => void;
  size?: number;
};

/**
 * Round color swatch used in the palette picker.
 * Shows a thin border when unselected, a thicker dark ring when selected.
 */
export function ColorSwatch({ hex, selected, onPress, size = 36 }: Props) {
  return (
    <Pressable onPress={onPress} hitSlop={4}>
      <View
        style={[
          styles.outer,
          {
            width: size + 8,
            height: size + 8,
            borderRadius: (size + 8) / 2,
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? '#000' : '#00000020',
          },
        ]}
      >
        <View
          style={[
            styles.inner,
            { backgroundColor: hex, width: size, height: size, borderRadius: size / 2 },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    borderWidth: 1,
    borderColor: '#00000010',
  },
});
