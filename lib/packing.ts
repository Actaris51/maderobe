/**
 * Packing assistant — suggests items for a trip of N days based on expected
 * weather (forecast when available, manual temperature range otherwise).
 *
 * Heuristic, not optimization:
 *  - Tops:        ceil(days × 0.75), capped at 7
 *  - Bottoms:     ceil(days / 3),    capped at 4
 *  - Shoes:       2 if days > 5, else 1
 *  - Outerwear:   1 if min temp < 12 °C or rain expected, else 0
 *  - Accessory:   1 if days > 3, else 0
 *
 * For each slot, prefers items with neutral dominant colors (more versatile —
 * easier to pair with anything else in the trip).
 */

import type { ClothingItem, Season } from '@/types';
import { hexToHsl, isNeutral } from './color-utils';
import type { DailyForecast } from './weather';

export type TripConditions = {
  /** Estimated min temperature in °C (averaged across the trip). */
  tempMin: number;
  /** Estimated max temperature in °C. */
  tempMax: number;
  /** True if rain is expected at least one day. */
  rainExpected: boolean;
};

export type PackingResult = {
  itemIds: string[];
  /** Reason why each slot was filled the way it was — useful for debug & UI. */
  breakdown: {
    tops: number;
    bottoms: number;
    shoes: number;
    outerwear: number;
    accessory: number;
  };
};

/** Compute weather conditions for the trip from a forecast (if available). */
export function summarizeForecast(forecast: DailyForecast[]): TripConditions {
  if (forecast.length === 0) return { tempMin: 15, tempMax: 22, rainExpected: false };
  let tMin = Infinity;
  let tMax = -Infinity;
  let rain = false;
  for (const day of forecast) {
    if (day.tMin < tMin) tMin = day.tMin;
    if (day.tMax > tMax) tMax = day.tMax;
    if (day.condition === 'rain' || day.condition === 'storm' || day.precipitation > 0.5) {
      rain = true;
    }
  }
  return { tempMin: tMin, tempMax: tMax, rainExpected: rain };
}

/** Map a temperature range to one or more eligible seasons for filtering. */
export function seasonsForConditions(c: TripConditions): Season[] {
  const tAvg = (c.tempMin + c.tempMax) / 2;
  const out: Season[] = [];
  if (tAvg >= 22) out.push('summer');
  if (tAvg >= 14 && tAvg < 23) out.push('spring', 'autumn');
  if (tAvg < 14) out.push('winter');
  if (out.length === 0) out.push('autumn');
  return Array.from(new Set(out));
}

function versatilityScore(item: ClothingItem): number {
  if (item.colors.length === 0) return 0;
  const c = item.colors[0];
  return isNeutral(hexToHsl(c.hex)) ? 2 : 1;
}

function pickTopN(pool: ClothingItem[], n: number): ClothingItem[] {
  const scored = pool
    .map((i) => ({ i, score: versatilityScore(i) }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map((s) => s.i);
}

/**
 * Build the packing list for a trip.
 *
 * @param items All items in the wardrobe.
 * @param days Number of days for the trip (>= 1).
 * @param conditions Expected weather conditions.
 */
export function buildPacking(
  items: ClothingItem[],
  days: number,
  conditions: TripConditions,
): PackingResult {
  const eligibleSeasons = seasonsForConditions(conditions);
  const eligible = items.filter(
    (i) =>
      i.seasons.length === 0 ||
      i.seasons.some((s) => eligibleSeasons.includes(s)),
  );

  const nbTops = Math.min(Math.ceil(days * 0.75), 7);
  const nbBottoms = Math.min(Math.max(1, Math.ceil(days / 3)), 4);
  const nbShoes = days > 5 ? 2 : 1;
  const nbOuter = conditions.tempMin < 12 || conditions.rainExpected ? 1 : 0;
  const nbAccessory = days > 3 ? 1 : 0;

  const tops = pickTopN(
    eligible.filter((i) => i.type === 'top' || i.type === 'dress'),
    nbTops,
  );
  const bottoms = pickTopN(
    eligible.filter((i) => i.type === 'bottom'),
    nbBottoms,
  );
  const shoes = pickTopN(
    eligible.filter((i) => i.type === 'shoes'),
    nbShoes,
  );
  const outers =
    nbOuter > 0 ? pickTopN(eligible.filter((i) => i.type === 'outerwear'), nbOuter) : [];
  const accessories =
    nbAccessory > 0
      ? pickTopN(
          eligible.filter((i) =>
            ['accessory', 'belt', 'bag', 'jewelry'].includes(i.type),
          ),
          nbAccessory,
        )
      : [];

  const all = [...tops, ...bottoms, ...shoes, ...outers, ...accessories];

  return {
    itemIds: all.map((i) => i.id),
    breakdown: {
      tops: tops.length,
      bottoms: bottoms.length,
      shoes: shoes.length,
      outerwear: outers.length,
      accessory: accessories.length,
    },
  };
}
