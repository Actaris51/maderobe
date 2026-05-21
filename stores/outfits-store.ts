import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Outfit } from '@/types';
import { uuid } from '@/lib/uuid';

type NewOutfitDraft = Omit<Outfit, 'id' | 'createdAt' | 'wearCount' | 'isFavorite'> & {
  isFavorite?: boolean;
};

interface OutfitsState {
  outfits: Record<string, Outfit>;

  list(): Outfit[];
  get(id: string): Outfit | undefined;

  add(draft: NewOutfitDraft): Outfit;
  update(id: string, patch: Partial<Outfit>): void;
  remove(id: string): void;
  toggleFavorite(id: string): void;
  markWorn(id: string, when?: Date): void;

  /** Remove any outfit that references a deleted item id. Call after removing an item. */
  pruneReferencesTo(removedItemId: string): void;

  replaceAll(outfits: Outfit[]): void;
  clear(): void;
}

export const useOutfitsStore = create<OutfitsState>()(
  persist(
    (set, get) => ({
      outfits: {},

      list: () => Object.values(get().outfits),
      get: (id) => get().outfits[id],

      add: (draft) => {
        const now = new Date().toISOString();
        const outfit: Outfit = {
          ...draft,
          id: uuid(),
          isFavorite: draft.isFavorite ?? false,
          wearCount: 0,
          createdAt: now,
        };
        set((s) => ({ outfits: { ...s.outfits, [outfit.id]: outfit } }));
        return outfit;
      },

      update: (id, patch) => {
        set((s) => {
          const existing = s.outfits[id];
          if (!existing) return s;
          return { outfits: { ...s.outfits, [id]: { ...existing, ...patch } } };
        });
      },

      remove: (id) => {
        set((s) => {
          if (!(id in s.outfits)) return s;
          const next = { ...s.outfits };
          delete next[id];
          return { outfits: next };
        });
      },

      toggleFavorite: (id) => {
        const outfit = get().outfits[id];
        if (!outfit) return;
        get().update(id, { isFavorite: !outfit.isFavorite });
      },

      markWorn: (id, when = new Date()) => {
        const outfit = get().outfits[id];
        if (!outfit) return;
        get().update(id, {
          wearCount: outfit.wearCount + 1,
          lastWornAt: when.toISOString(),
        });
      },

      pruneReferencesTo: (removedItemId) => {
        set((s) => {
          const next: Record<string, Outfit> = {};
          for (const [key, outfit] of Object.entries(s.outfits)) {
            const filtered = outfit.itemIds.filter((id) => id !== removedItemId);
            if (filtered.length === 0) continue; // drop empty outfits
            next[key] = { ...outfit, itemIds: filtered };
          }
          return { outfits: next };
        });
      },

      replaceAll: (outfits) => {
        const map: Record<string, Outfit> = {};
        for (const o of outfits) map[o.id] = o;
        set({ outfits: map });
      },

      clear: () => set({ outfits: {} }),
    }),
    {
      name: 'maderobe/outfits/v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);
