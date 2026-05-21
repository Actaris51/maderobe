/**
 * Wardrobe statistics — pure functions, no side effects.
 */

import type { ClothingItem, ClothingType } from '@/types';

export type CategoryStat = {
  type: ClothingType;
  count: number;
};

export type WardrobeStats = {
  totalItems: number;
  favoritesCount: number;
  byCategory: CategoryStat[];
  topWorn: ClothingItem[]; // sorted desc
  neverWorn: ClothingItem[]; // wearCount === 0
  forgottenWorn: ClothingItem[]; // wearCount > 0 but lastWornAt > 90 days
  totalWearCount: number;
  totalValueEUR: number | null; // null if no item has a purchasePrice
  averageCostPerWear: number | null; // among items that have BOTH price and wearCount > 0
};

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export function computeStats(items: ClothingItem[]): WardrobeStats {
  const now = Date.now();

  const byCategoryMap = new Map<ClothingType, number>();
  for (const it of items) {
    byCategoryMap.set(it.type, (byCategoryMap.get(it.type) ?? 0) + 1);
  }

  const sortedByWear = [...items].sort((a, b) => b.wearCount - a.wearCount);
  const topWorn = sortedByWear.filter((i) => i.wearCount > 0).slice(0, 5);

  const neverWorn = items.filter((i) => i.wearCount === 0);
  const forgottenWorn = items.filter((i) => {
    if (i.wearCount === 0) return false;
    if (!i.lastWornAt) return true;
    return now - new Date(i.lastWornAt).getTime() > NINETY_DAYS_MS;
  });

  let totalValueEUR: number | null = null;
  let priceSum = 0;
  let priceCount = 0;
  let cpwSum = 0;
  let cpwCount = 0;
  for (const it of items) {
    if (it.purchasePrice != null) {
      priceSum += it.purchasePrice;
      priceCount++;
      if (it.wearCount > 0) {
        cpwSum += it.purchasePrice / it.wearCount;
        cpwCount++;
      }
    }
  }
  if (priceCount > 0) totalValueEUR = priceSum;

  return {
    totalItems: items.length,
    favoritesCount: items.filter((i) => i.isFavorite).length,
    byCategory: Array.from(byCategoryMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    topWorn,
    neverWorn,
    forgottenWorn,
    totalWearCount: items.reduce((sum, i) => sum + i.wearCount, 0),
    totalValueEUR,
    averageCostPerWear: cpwCount > 0 ? cpwSum / cpwCount : null,
  };
}
