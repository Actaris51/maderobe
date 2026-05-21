import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
        <Stack.Screen name="outfit/[id]" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
