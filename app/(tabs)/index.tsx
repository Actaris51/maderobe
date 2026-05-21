import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useItemsStore } from '@/stores/items-store';

/**
 * Placeholder home screen. Will be replaced by the Dressing grid/carousel in Phase 5.
 * For now: shows wardrobe size + a single "Ajouter un vêtement" CTA.
 */
export default function HomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  const itemCount = useItemsStore((s) => Object.keys(s.items).length);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[scheme].background }]} edges={['top']}>
      <View style={styles.content}>
        <ThemedText style={styles.title}>Maderobe</ThemedText>
        <ThemedText style={styles.subtitle}>
          {itemCount === 0
            ? 'Ta garde-robe est vide. Ajoute ton premier vêtement.'
            : itemCount === 1
              ? '1 vêtement dans ta garde-robe.'
              : `${itemCount} vêtements dans ta garde-robe.`}
        </ThemedText>
        <Pressable
          style={[styles.cta, { backgroundColor: tint }]}
          onPress={() => router.push('/add-item')}
        >
          <ThemedText style={styles.ctaText}>+ Ajouter un vêtement</ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
  },
  cta: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
