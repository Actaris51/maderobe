/**
 * Color theory helpers for the outfit harmony scorer.
 *
 * Convention: HSL with h in [0, 360), s and l in [0, 100].
 */

import type { ItemColor } from '@/types';

export type HSL = { h: number; s: number; l: number };

export function hexToHsl(hex: string): HSL {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hue = 0;
  let sat = 0;
  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
  }
  return { h: hue, s: sat * 100, l: l * 100 };
}

/**
 * A "neutral" color has low saturation OR extreme lightness.
 * Includes blacks, whites, greys, beiges, browns.
 */
export function isNeutral(hsl: HSL): boolean {
  return hsl.s < 20 || hsl.l < 15 || hsl.l > 88;
}

/** Circular distance between two hues, in [0, 180]. */
export function hueDistance(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Pairwise harmony score between two item colors, roughly:
 *  +3  neutral + vivid       → always classy
 *  +2  complementary (~180°) → bold, polished
 *  +1.8  triadic (~120°)
 *  +1.5  analog (~< 30°)
 *  +1   neutral + neutral    → safe
 *  −1  clashing vivid + vivid (other distances)
 */
export function harmonyScore(a: ItemColor, b: ItemColor): number {
  const hslA = hexToHsl(a.hex);
  const hslB = hexToHsl(b.hex);
  const aNeutral = isNeutral(hslA);
  const bNeutral = isNeutral(hslB);
  if (aNeutral && bNeutral) return 1;
  if (aNeutral || bNeutral) return 3;
  const dist = hueDistance(hslA.h, hslB.h);
  if (dist >= 150) return 2;
  if (dist >= 100 && dist < 140) return 1.8;
  if (dist < 30) return 1.5;
  return -1;
}
