import type { ClothingItem, ClothingType, Pattern, Season } from '@/types';

export type FilterState = {
  /** Free-form search across notes, brand, sub-type, material. */
  query: string;
  /** Selected clothing types. Empty = all. */
  types: ClothingType[];
  /** Selected pattern. null = all. */
  pattern: Pattern | null;
  /** Selected seasons. Empty = all. */
  seasons: Season[];
  /** Selected color hex values (intersected with item colors). Empty = all. */
  colorHexes: string[];
  /** Only show favorites. */
  favoritesOnly: boolean;
  /** Only show items never worn (wearCount === 0) OR not worn in last 90 days. */
  unwornOnly: boolean;
};

export const EMPTY_FILTER: FilterState = {
  query: '',
  types: [],
  pattern: null,
  seasons: [],
  colorHexes: [],
  favoritesOnly: false,
  unwornOnly: false,
};

export type SortKey = 'recent' | 'most-worn' | 'least-worn' | 'alpha';

export function isFilterActive(f: FilterState): boolean {
  return (
    f.query.length > 0 ||
    f.types.length > 0 ||
    f.pattern !== null ||
    f.seasons.length > 0 ||
    f.colorHexes.length > 0 ||
    f.favoritesOnly ||
    f.unwornOnly
  );
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export function applyFilter(items: ClothingItem[], filter: FilterState): ClothingItem[] {
  const q = filter.query.trim().toLowerCase();
  return items.filter((it) => {
    if (q.length > 0) {
      const hay = [it.subType, it.material, it.brand, it.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filter.types.length > 0 && !filter.types.includes(it.type)) return false;
    if (filter.pattern !== null && it.pattern !== filter.pattern) return false;
    if (filter.seasons.length > 0) {
      // Item with empty seasons = all-seasons → always passes
      if (it.seasons.length > 0 && !it.seasons.some((s) => filter.seasons.includes(s))) {
        return false;
      }
    }
    if (filter.colorHexes.length > 0) {
      if (!it.colors.some((c) => filter.colorHexes.includes(c.hex))) return false;
    }
    if (filter.favoritesOnly && !it.isFavorite) return false;
    if (filter.unwornOnly) {
      if (it.wearCount > 0) {
        if (!it.lastWornAt) return false;
        const lastMs = new Date(it.lastWornAt).getTime();
        if (Date.now() - lastMs < NINETY_DAYS_MS) return false;
      }
    }
    return true;
  });
}

export function applySort(items: ClothingItem[], sort: SortKey): ClothingItem[] {
  const sorted = [...items];
  switch (sort) {
    case 'recent':
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case 'most-worn':
      sorted.sort((a, b) => b.wearCount - a.wearCount);
      break;
    case 'least-worn':
      sorted.sort((a, b) => a.wearCount - b.wearCount);
      break;
    case 'alpha':
      sorted.sort((a, b) => (a.subType ?? a.type).localeCompare(b.subType ?? b.type));
      break;
  }
  return sorted;
}
