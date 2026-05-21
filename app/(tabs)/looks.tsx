import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Placeholder for the Looks/Outfits tab.
 * Phase 8 will replace this with the outfit generator (météo + contexte).
 */
export default function LooksScreen() {
  const scheme = useColorScheme() ?? 'light';
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: Colors[scheme].background }]}
      edges={['top']}
    >
      <View style={styles.body}>
        <ThemedText style={styles.title}>Looks</ThemedText>
        <ThemedText style={styles.subtitle}>
          Le générateur de tenues arrive en Phase 8 (météo + contexte + verrouillage).
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 12 },
  title: { fontSize: 32, fontWeight: '700' },
  subtitle: { fontSize: 15, opacity: 0.6, textAlign: 'center' },
});
