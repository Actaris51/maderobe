import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  fetchCurrentWeather,
  fetchDailyForecast,
  type CurrentWeather,
  type DailyForecast,
} from '@/lib/weather';

/**
 * Cached weather state.
 *
 * - `current` is refreshed at most every CURRENT_TTL_MS.
 * - `manualCity` overrides the GPS-resolved location when set
 *   (lets the user choose a city instead of using GPS).
 */

const CURRENT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export type ManualCity = {
  name: string;
  country: string;
  lat: number;
  lon: number;
};

interface WeatherState {
  current: CurrentWeather | null;
  manualCity: ManualCity | null;

  /** Set a manual city override (clears any cached "current" so it's refetched). */
  setManualCity(city: ManualCity | null): void;

  /** Refresh current weather; returns the cached one if still fresh. */
  refresh(lat: number, lon: number, force?: boolean): Promise<CurrentWeather | null>;

  /** Fetch a forecast (not cached — small payload, only used by the packing module). */
  fetchForecast(lat: number, lon: number, days: number): Promise<DailyForecast[]>;
}

export const useWeatherStore = create<WeatherState>()(
  persist(
    (set, get) => ({
      current: null,
      manualCity: null,

      setManualCity: (city) => set({ manualCity: city, current: null }),

      refresh: async (lat, lon, force = false) => {
        const cached = get().current;
        if (
          !force &&
          cached &&
          Date.now() - new Date(cached.fetchedAt).getTime() < CURRENT_TTL_MS &&
          Math.abs(cached.lat - lat) < 0.1 &&
          Math.abs(cached.lon - lon) < 0.1
        ) {
          return cached;
        }
        try {
          const w = await fetchCurrentWeather(lat, lon);
          set({ current: w });
          return w;
        } catch {
          return cached; // keep stale on error
        }
      },

      fetchForecast: async (lat, lon, days) => {
        return fetchDailyForecast(lat, lon, days);
      },
    }),
    {
      name: 'maderobe/weather/v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({
        current: state.current,
        manualCity: state.manualCity,
      }),
    },
  ),
);
