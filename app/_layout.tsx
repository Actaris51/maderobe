import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { MilestoneCelebration } from '@/components/milestone-celebration';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/stores/settings-store';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Wait for the persisted settings to hydrate before deciding whether to
  // route to onboarding. Avoids a flash of the Dressing tab on first launch.
  const [hydrated, setHydrated] = useState(useSettingsStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useSettingsStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated && !useSettingsStore.getState().hasSeenOnboarding) {
      router.replace('/onboarding' as never);
    }
  }, [hydrated]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen
          name="add-item"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="edit-item/[id]"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen name="item/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="generate-outfit"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="outfit-of-the-day"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="packing"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen name="outfit/[id]" options={{ headerShown: false }} />
      </Stack>
      <MilestoneCelebration />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
