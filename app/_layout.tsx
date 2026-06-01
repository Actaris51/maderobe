import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { MilestoneCelebration } from '@/components/milestone-celebration';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/stores/settings-store';

// Note: enableScreens(false) avait ete ajoute en build 7 pour contourner le
// crash RNSTabBarController iOS 26. Mais il cassait expo-router (Stack render
// vide -> splash bloque). On l'a retire et on s'appuie maintenant sur le patch
// RCTTurboModule.mm qui catch+log les NSExceptions des void methods, ce qui
// couvre RNSTabBarController et tous les autres TurboModules d'un coup.

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  // Wait for the persisted settings to hydrate before deciding whether to
  // route to onboarding. Avoids a flash of the Dressing tab on first launch.
  const [hydrated, setHydrated] = useState(useSettingsStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useSettingsStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  // Wait until expo-router's navigation tree is mounted before issuing a
  // programmatic navigation. On iOS 26 + new architecture the Stack registers
  // with the router slightly later than on iOS 18, so calling router.replace
  // straight from a [hydrated] effect would assert "Attempted to navigate
  // before mounting the Root Layout component" and silently fail in
  // production builds (= app stuck on splash). We gate on rootNavState.key
  // AND defer one event-loop turn via setTimeout(0): even when the root
  // navigator reports a key, expo-router 6 may still be wiring up its first
  // screen during the same microtask, so giving it one more turn is the
  // belt-and-braces fix.
  const rootNavState = useRootNavigationState();
  const isNavReady = !!rootNavState?.key;

  useEffect(() => {
    if (!isNavReady || !hydrated) return;
    if (useSettingsStore.getState().hasSeenOnboarding) return;
    const t = setTimeout(() => {
      router.replace('/onboarding');
    }, 0);
    return () => clearTimeout(t);
  }, [isNavReady, hydrated, router]);

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
