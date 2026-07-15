import { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Animated, {
  SlideInUp,
  SlideOutUp,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { HAPTIC, isMilestone, milestoneMessage } from '@/constants/motion';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { maybeRequestReview } from '@/lib/review';
import { useItemsStore } from '@/stores/items-store';

const { width: SCREEN_W } = Dimensions.get('window');

/**
 * Listens to the items count and, when a milestone is hit (1, 5, 10, 25, 50, 100, 250, 500),
 * triggers:
 *  - A burst of confetti via react-native-confetti-cannon
 *  - A success haptic
 *  - A toast banner sliding in from the top, auto-dismissing after 3.5s
 *  - The user can also tap the banner to dismiss early
 *
 * Mount this once near the root of the navigator (e.g. in the Dressing tab) — it
 * stays invisible until a milestone is reached.
 */
export function MilestoneCelebration() {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  const text = Colors[scheme].text;

  const count = useItemsStore((s) => Object.keys(s.items).length);
  const prevCount = useRef(count);
  const [trigger, setTrigger] = useState(0);
  const [message, setMessage] = useState<{ title: string; subtitle: string } | null>(null);

  // Small pulse animation on the banner icon
  const iconScale = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));

  useEffect(() => {
    if (count > prevCount.current) {
      const m = isMilestone(count);
      if (m) {
        setMessage(milestoneMessage(m));
        setTrigger((t) => t + 1);
        HAPTIC.success();
        // Pulse the icon a few times
        iconScale.value = withRepeat(
          withSequence(withTiming(1.25, { duration: 250 }), withTiming(1, { duration: 250 })),
          3,
          false,
        );
        // Auto-dismiss after 3.5s
        const timeout = setTimeout(() => setMessage(null), 3500);
        // At the 5-items milestone, ride the good mood: once the confetti has
        // settled, ask for an App Store rating (once per install, see lib/review).
        let reviewTimeout: ReturnType<typeof setTimeout> | undefined;
        if (m === 5) {
          reviewTimeout = setTimeout(() => {
            maybeRequestReview();
          }, 4000);
        }
        prevCount.current = count;
        return () => {
          clearTimeout(timeout);
          if (reviewTimeout) clearTimeout(reviewTimeout);
        };
      }
    }
    prevCount.current = count;
  }, [count, iconScale]);

  return (
    <>
      {trigger > 0 && (
        // The key forces a re-mount so the cannon re-fires on every milestone
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiCannon
            key={trigger}
            count={140}
            origin={{ x: SCREEN_W / 2, y: -10 }}
            fadeOut
            autoStart
            colors={['#c19a6b', '#e67e22', '#27ae60', '#2980b9', '#f1c40f', '#c0392b']}
            explosionSpeed={350}
            fallSpeed={3500}
          />
        </View>
      )}

      {message && (
        <Animated.View
          entering={SlideInUp.springify().damping(15).stiffness(200)}
          exiting={SlideOutUp.duration(300)}
          style={[
            styles.banner,
            { backgroundColor: Colors[scheme].background, borderColor: text + '15' },
          ]}
        >
          <Pressable onPress={() => setMessage(null)} style={styles.bannerInner}>
            <Animated.View style={[styles.iconWrap, { backgroundColor: tint + '20' }, iconStyle]}>
              <ThemedText style={[styles.iconText, { color: tint }]}>🏆</ThemedText>
            </Animated.View>
            <View style={styles.textWrap}>
              <ThemedText style={styles.title}>{message.title}</ThemedText>
              <ThemedText style={styles.subtitle}>{message.subtitle}</ThemedText>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
});
