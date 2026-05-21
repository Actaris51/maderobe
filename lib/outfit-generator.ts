/**
 * Rule-based outfit generator.
 *
 * Inputs: the wardrobe, an occasion, one or more seasons.
 * Output: a list of item IDs that together form a coherent outfit, plus a score.
 *
 * Strategy:
 *  1. Filter items eligible for the requested seasons.
 *  2. Pick a pivot: dress (30% if available) → top → bottom.
 *  3. Fill remaining slots (bottom / shoes / outerwear / accessory) by scoring
 *     candidates against the already-chosen items' dominant colors, then
 *     picking randomly inside the top quartile to keep suggestions varied.
 *  4. Outerwear is only added in autumn/winter (50% of the time).
 *  5. An accessory is added 30% of the time.
 *
 * The chromatic harmony scoring lives in `lib/color-utils.ts`.
 */

import type { ClothingItem, Occasion, Season } from '@/types';
import { harmonyScore } from './color-utils';

export type GenerateOptions = {
  occasion: Occasion;
  seasons: Season[];
  /** Item ids to exclude (used by "regenerate"). */
  excludeItemIds?: string[];
};

export type GeneratedOutfit = {
  itemIds: string[];
  /** Sum of pairwise harmony scores. Higher = more coherent. */
  score: number;
};

// ----------------------------------------------------------------------------
// Eligibility filter
// ----------------------------------------------------------------------------

function isEligible(item: ClothingItem, opts: GenerateOptions): boolean {
  if (opts.excludeItemIds?.includes(item.id)) return false;
  if (item.seasons.length === 0) return true; // "all seasons" item
  return opts.seasons.some((s) => item.seasons.includes(s));
}

// ----------------------------------------------------------------------------
// Scoring helpers
// ----------------------------------------------------------------------------

/** Best pairwise harmony between `item` and any of the `against` items. */
function maxHarmony(item: ClothingItem, against: ClothingItem[]): number {
  if (item.colors.length === 0) return 0;
  const c = item.colors[0];
  let best = -Infinity;
  for (const other of against) {
    if (other.colors.length === 0) continue;
    const s = harmonyScore(c, other.colors[0]);
    if (s > best) best = s;
  }
  return best === -Infinity ? 0 : best;
}

/** Average pairwise harmony between `item` and the `against` items. */
function avgHarmony(item: ClothingItem, against: ClothingItem[]): number {
  if (item.colors.length === 0) return 0;
  const c = item.colors[0];
  let sum = 0;
  let count = 0;
  for (const other of against) {
    if (other.colors.length === 0) continue;
    sum += harmonyScore(c, other.colors[0]);
    count++;
  }
  return count > 0 ? sum / count : 0;
}

// ----------------------------------------------------------------------------
// Random helpers (top-K to keep suggestions varied)
// ----------------------------------------------------------------------------

function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Score every candidate, drop the negatives, keep the top quartile, pick random. */
function pickWeighted(
  candidates: ClothingItem[],
  scoreFn: (i: ClothingItem) => number,
): { item: ClothingItem; score: number } | undefined {
  const scored = candidates
    .map((item) => ({ item, score: scoreFn(item) }))
    .filter((s) => s.score >= 0);
  if (scored.length === 0) {
    // Fallback: nothing scored positively → still pick at random so the user gets *something*
    const fallback = pickRandom(candidates);
    return fallback ? { item: fallback, score: 0 } : undefined;
  }
  scored.sort((a, b) => b.score - a.score);
  const k = Math.max(3, Math.ceil(scored.length / 4));
  const top = scored.slice(0, k);
  return pickRandom(top);
}

// ----------------------------------------------------------------------------
// Generator
// ----------------------------------------------------------------------------

export function generateOutfit(
  items: ClothingItem[],
  opts: GenerateOptions,
): GeneratedOutfit | null {
  const eligible = items.filter((i) => isEligible(i, opts));
  if (eligible.length < 2) return null;

  const byType = (t: ClothingItem['type']) => eligible.filter((i) => i.type === t);
  const dresses = byType('dress');
  const tops = byType('top');
  const bottoms = byType('bottom');
  const shoes = byType('shoes');
  const outers = byType('outerwear');
  const accessoryPool = eligible.filter((i) =>
    ['accessory', 'bag', 'belt', 'jewelry'].includes(i.type),
  );

  const outfitItems: ClothingItem[] = [];
  let totalScore = 0;

  // ---- 1. Pivot
  let pivot: ClothingItem | undefined;
  if (dresses.length > 0 && Math.random() < 0.3) {
    pivot = pickRandom(dresses);
  } else if (tops.length > 0) {
    pivot = pickRandom(tops);
  } else if (bottoms.length > 0) {
    pivot = pickRandom(bottoms);
  } else if (dresses.length > 0) {
    pivot = pickRandom(dresses);
  }
  if (!pivot) return null;
  outfitItems.push(pivot);

  // ---- 2. Top/bottom complement
  if (pivot.type === 'top' && bottoms.length > 0) {
    const r = pickWeighted(bottoms, (b) => maxHarmony(b, outfitItems));
    if (r) {
      outfitItems.push(r.item);
      totalScore += r.score;
    }
  } else if (pivot.type === 'bottom' && tops.length > 0) {
    const r = pickWeighted(tops, (t) => maxHarmony(t, outfitItems));
    if (r) {
      outfitItems.push(r.item);
      totalScore += r.score;
    }
  }
  // For dresses: no bottom needed

  // ---- 3. Shoes
  if (shoes.length > 0) {
    const r = pickWeighted(shoes, (s) => avgHarmony(s, outfitItems));
    if (r) {
      outfitItems.push(r.item);
      totalScore += r.score;
    }
  }

  // ---- 4. Outerwear — only in cold seasons, 50% chance
  const isCold = opts.seasons.includes('winter') || opts.seasons.includes('autumn');
  if (outers.length > 0 && isCold && Math.random() < 0.5) {
    const r = pickWeighted(outers, (o) => avgHarmony(o, outfitItems));
    if (r) {
      outfitItems.push(r.item);
      totalScore += r.score;
    }
  }

  // ---- 5. Optional accessory — 30% chance
  if (accessoryPool.length > 0 && Math.random() < 0.3) {
    const r = pickWeighted(accessoryPool, (a) => avgHarmony(a, outfitItems));
    if (r) {
      outfitItems.push(r.item);
      totalScore += r.score;
    }
  }

  return {
    itemIds: outfitItems.map((i) => i.id),
    score: totalScore,
  };
}
