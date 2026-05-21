import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ClothingItem, Season } from '@/types';
import { uuid } from '@/lib/uuid';

type NewItemDraft = Omit<ClothingItem, 'id' | 'createdAt' | 'updatedAt' | 'wearCount' | 'isFavorite'> & {
  isFavorite?: boolean;
};

interface ItemsState {
  /** Map of items keyed by id. Map shape allows O(1) lookup + updates. */
  items: Record<string, ClothingItem>;

  // ----- Selectors (computed via store, not memoized — call sparingly) -----
  list(): ClothingItem[];
  get(id: string): ClothingItem | undefined;

  // ----- Mutations -----
  add(draft: NewItemDraft): ClothingItem;
  update(id: string, patch: Partial<ClothingItem>): void;
  remove(id: string): void;
  toggleFavorite(id: string): void;
  markWorn(id: string, when?: Date): void;

  // ----- Bulk ops (for export / reset) -----
  replaceAll(items: ClothingItem[]): void;
  clear(): void;
}

export const useItemsStore = create<ItemsState>()(
  persist(
    (set, get) => ({
      items: {},

      list: () => Object.values(get().items),
      get: (id) => get().items[id],

      add: (draft) => {
        const now = new Date().toISOString();
        const item: ClothingItem = {
          ...draft,
          id: uuid(),
          isFavorite: draft.isFavorite ?? false,
          wearCount: 0,
          createdAt: now,
          updatedAt: now,
          // Sensible defaults if caller omitted them
          seasons: draft.seasons ?? ([] as Season[]),
        };
        set((s) => ({ items: { ...s.items, [item.id]: item } }));
        return item;
      },

      update: (id, patch) => {
        set((s) => {
          const existing = s.items[id];
          if (!existing) return s;
          return {
            items: {
              ...s.items,
              [id]: { ...existing, ...patch, updatedAt: new Date().toISOString() },
            },
          };
        });
      },

      remove: (id) => {
        set((s) => {
          if (!(id in s.items)) return s;
          const next = { ...s.items };
          delete next[id];
          return { items: next };
        });
      },

      toggleFavorite: (id) => {
        const item = get().items[id];
        if (!item) return;
        get().update(id, { isFavorite: !item.isFavorite });
      },

      markWorn: (id, when = new Date()) => {
        const item = get().items[id];
        if (!item) return;
        get().update(id, {
          wearCount: item.wearCount + 1,
          lastWornAt: when.toISOString(),
        });
      },

      replaceAll: (items) => {
        const map: Record<string, ClothingItem> = {};
        for (const it of items) map[it.id] = it;
        set({ items: map });
      },

      clear: () => set({ items: {} }),
    }),
    {
      name: 'maderobe/items/v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);
