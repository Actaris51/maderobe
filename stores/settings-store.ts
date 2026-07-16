import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Settings } from '@/types';

interface SettingsState extends Settings {
  set<K extends keyof Settings>(key: K, value: Settings[K]): void;
  reset(): void;
}

const DEFAULTS: Settings = {
  libraryLayout: 'grid',
  defaultOccasion: 'casual',
  hapticsEnabled: true,
  locale: 'fr',
  hasSeenOnboarding: false,
  flatLayBackgroundId: 'dark-wood',
  hasAskedReview: false,
  dailyReminderEnabled: false,
  dailyReminderHour: 7,
  dailyReminderMinute: 30,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (key, value) => set({ [key]: value } as Partial<Settings>),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'maderobe/settings/v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);
