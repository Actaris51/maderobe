import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/stores/settings-store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Slide = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'shirt-outline',
    title: 'Bienvenue dans Maderobe',
    subtitle:
      'Catalogue tes vêtements en photo et garde une vue claire de toute ta garde-robe.',
  },
  {
    icon: 'camera-outline',
    title: 'Saisie en quelques tap',
    subtitle:
      'Photo → type → couleur → matière. Sauvegardé en moins de cinq secondes. Tout reste sur ton téléphone.',
  },
  {
    icon: 'sparkles-outline',
    title: 'Suggestions et voyages',
    subtitle:
      'Reçois des idées de tenues équilibrées et prépare ta valise en fonction de la météo.',
  },
];

export default function OnboardingScreen() {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  const text = Colors[scheme].text;
  const setSetting = useSettingsStore((s) => s.set);

  const [page, setPage] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const finish = () => {
    setSetting('hasSeenOnboarding', true);
    router.replace('/');
  };

  const next = () => {
    if (page < SLIDES.length - 1) {
      const nextPage = page + 1;
      listRef.current?.scrollToIndex({ index: nextPage, animated: true });
      setPage(nextPage);
    } else {
      finish();
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const newPage = Math.round(offset / SCREEN_WIDTH);
    if (newPage !== page) setPage(newPage);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
      {/* Skip */}
      <View style={styles.headerRow}>
        <Pressable onPress={finish} hitSlop={12}>
          <ThemedText style={[styles.skip, { color: text + '80' }]}>Passer</ThemedText>
        </Pressable>
      </View>

      {/* Slides */}
      <FlatList
        ref={listRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={SLIDES}
        keyExtractor={(s) => s.title}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={[styles.iconWrap, { backgroundColor: tint + '15' }]}>
              <Ionicons name={item.icon} size={64} color={tint} />
            </View>
            <ThemedText style={styles.title}>{item.title}</ThemedText>
            <ThemedText style={styles.subtitle}>{item.subtitle}</ThemedText>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === page ? tint : text + '20' },
              i === page && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <View style={styles.ctaWrap}>
        <Pressable style={[styles.cta, { backgroundColor: tint }]} onPress={next}>
          <ThemedText style={styles.ctaText}>
            {page < SLIDES.length - 1 ? 'Suivant' : 'Commencer'}
          </ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  skip: { fontSize: 15 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
    maxWidth: 320,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  ctaWrap: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  cta: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
