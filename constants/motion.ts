/**
 * Maderobe motion design system.
 *
 * Centralizes all timings, easings, springs and haptic patterns so the whole
 * app shares a consistent animation language. Inspired by Apple's Human Interface
 * Guidelines + Linear + Things 3.
 *
 * Use these from anywhere via `import { SPRING, TIMING, EASING, HAPTIC } from '@/constants/motion'`.
 */

import * as Haptics from 'expo-haptics';
import { Easing, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

// ---------------------------------------------------------------------------
// Spring configs — physics-based motion
// ---------------------------------------------------------------------------

/**
 * Springs cover the typical Apple/Linear feel:
 *  - gentle: smooth, no overshoot. Default for navigation/state changes.
 *  - snappy: fast, slight overshoot. Default for tap feedback / micro-interactions.
 *  - bouncy: bigger overshoot. Use for delightful moments (success, reveal).
 *  - soft:   slow, no overshoot. For ambient / breathing motion.
 *  - dramatic: very high mass, slow but powerful. For hero transitions.
 */
export const SPRING: Record<'gentle' | 'snappy' | 'bouncy' | 'soft' | 'dramatic', WithSpringConfig> = {
  gentle: { damping: 20, stiffness: 200, mass: 0.8 },
  snappy: { damping: 18, stiffness: 350, mass: 0.6 },
  bouncy: { damping: 8, stiffness: 250, mass: 0.9 },
  soft: { damping: 30, stiffness: 100, mass: 1.2 },
  dramatic: { damping: 22, stiffness: 180, mass: 1.5 },
};

// ---------------------------------------------------------------------------
// Timing values — duration-based motion (in ms)
// ---------------------------------------------------------------------------

export const TIMING = {
  /** 100 ms — barely-noticeable feedback (ripples, color shifts) */
  instant: 100,
  /** 150 ms — fast feedback (button press release) */
  fast: 150,
  /** 250 ms — default duration for most UI transitions */
  normal: 250,
  /** 400 ms — slow, content-revealing transitions */
  slow: 400,
  /** 700 ms — dramatic hero animations (slot machine, splash) */
  dramatic: 700,
} as const;

// ---------------------------------------------------------------------------
// Easing curves — for non-spring timing
// ---------------------------------------------------------------------------

export const EASING = {
  /** Material standard — accelerate then decelerate */
  inOut: Easing.bezier(0.4, 0, 0.2, 1),
  /** Decelerate only — elements entering the screen */
  out: Easing.bezier(0, 0, 0.2, 1),
  /** Accelerate only — elements leaving the screen */
  in: Easing.bezier(0.4, 0, 1, 1),
  /** Sharp — for emphasized state changes */
  sharp: Easing.bezier(0.4, 0, 0.6, 1),
  /** Anticipate — pull-back then fly-forward (for playful reveals) */
  anticipate: Easing.bezier(0.36, 0, 0.66, -0.56),
  /** Back — overshoot then settle (for satisfying snaps) */
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
};

// ---------------------------------------------------------------------------
// Stagger helpers — for sequential reveals
// ---------------------------------------------------------------------------

/** Default delay between items in a staggered reveal (ms). */
export const STAGGER = {
  tight: 20,
  default: 35,
  loose: 60,
  dramatic: 100,
} as const;

/** Compute the delay for index `i` in a stagger sequence. */
export function staggerDelay(i: number, step: number = STAGGER.default, cap: number = 800): number {
  return Math.min(i * step, cap);
}

// ---------------------------------------------------------------------------
// Haptic patterns — short helpers around expo-haptics for common moments
// ---------------------------------------------------------------------------

export const HAPTIC = {
  /** Tiny tap, for buttons, chips, FAB press */
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  /** Medium tap, for confirmations like "marked as worn" */
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  /** Heavy tap, for milestone moments */
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  /** Success burst — for completed actions */
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  /** Warning — for soft alerts */
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  /** Error — for failures */
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  /** Selection change — for picker / chip selection */
  selection: () => Haptics.selectionAsync(),
};

// ---------------------------------------------------------------------------
// Timing config presets ready to use with withTiming()
// ---------------------------------------------------------------------------

export const TIMING_CONFIG = {
  fast: { duration: TIMING.fast, easing: EASING.out } satisfies WithTimingConfig,
  normal: { duration: TIMING.normal, easing: EASING.inOut } satisfies WithTimingConfig,
  slow: { duration: TIMING.slow, easing: EASING.inOut } satisfies WithTimingConfig,
  dramatic: { duration: TIMING.dramatic, easing: EASING.inOut } satisfies WithTimingConfig,
} as const;

// ---------------------------------------------------------------------------
// Milestone thresholds for the celebration system
// ---------------------------------------------------------------------------

export const MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500] as const;
export type Milestone = (typeof MILESTONES)[number];

export function isMilestone(count: number): Milestone | null {
  return (MILESTONES as readonly number[]).includes(count) ? (count as Milestone) : null;
}

export function milestoneMessage(m: Milestone): { title: string; subtitle: string } {
  switch (m) {
    case 1:
      return { title: 'Premier vêtement ! 👏', subtitle: 'Bienvenue dans Maderobe.' };
    case 5:
      return { title: '5 vêtements', subtitle: 'Ta garde-robe prend forme.' };
    case 10:
      return { title: '10 vêtements 🎉', subtitle: 'Tu commences à pouvoir composer des tenues.' };
    case 25:
      return { title: '25 vêtements', subtitle: 'Belle base !' };
    case 50:
      return { title: '50 vêtements 🎊', subtitle: 'Une vraie garde-robe.' };
    case 100:
      return { title: '100 vêtements 🏆', subtitle: 'Centurion du style.' };
    case 250:
      return { title: '250 vêtements ✨', subtitle: 'Impressionnant.' };
    case 500:
      return { title: '500 vêtements 👑', subtitle: 'Légendaire.' };
  }
}
