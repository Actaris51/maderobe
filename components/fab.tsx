import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from './themed-text';

import { HAPTIC, SPRING } from '@/constants/motion';
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
 *
 * Animations:
 *  - Mount: ZoomIn spring + slight rotation
 *  - Press in: shrink + bounce (snappy spring)
 *  - Press out: spring back + tiny rotation kick
 *  - Tap: ripple wave expanding from center
 *  - Haptic: medium impact on press
 */
export function Fab({ onPress, label = '+', bottom = 24 }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;

  // Press scale
  const scale = useSharedValue(1);
  // Ripple wave (scale 0 → 1, opacity 0.4 → 0)
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  // Tiny rotation kick on release
  const rotation = useSharedValue(0);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.88, SPRING.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING.bouncy);
    rotation.value = withSequence(
      withTiming(8, { duration: 80, easing: Easing.out(Easing.cubic) }),
      withSpring(0, SPRING.gentle),
    );
  };

  const handlePress = () => {
    HAPTIC.medium();
    // Kick off the ripple
    rippleScale.value = 0;
    rippleOpacity.value = 0.4;
    rippleScale.value = withTiming(2.4, { duration: 500, easing: Easing.out(Easing.cubic) });
    rippleOpacity.value = withDelay(80, withTiming(0, { duration: 420 }));
    onPress();
  };

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      {/* Reanimated 4 requires layout animations (entering/exiting) and
          animated styles (transform/scale via useAnimatedStyle) to live on
          DIFFERENT Animated.Views, otherwise they conflict and the whole
          subtree can render blank. Outer = layout (ZoomIn on mount).
          Inner = press scale + rotation kick. */}
      <Animated.View
        entering={ZoomIn.springify().damping(11).stiffness(220).delay(150)}
      >
        <Animated.View style={btnStyle}>
          <View style={styles.outer}>
            {/* Ripple layer (behind the button) */}
            <Animated.View
              pointerEvents="none"
              style={[styles.ripple, { backgroundColor: tint }, rippleStyle]}
            />
            <Pressable
              onPress={handlePress}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={[styles.btn, { backgroundColor: tint }]}
            >
              <ThemedText style={styles.label}>{label}</ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const SIZE = 56;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 20,
    alignItems: 'flex-end',
  },
  outer: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    top: 0,
    left: 0,
  },
  btn: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  label: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
});
