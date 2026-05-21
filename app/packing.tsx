import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { TYPE_LABELS_FR } from '@/constants/taxonomy';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  buildPacking,
  summarizeForecast,
  type PackingResult,
  type TripConditions,
} from '@/lib/packing';
import {
  conditionEmoji,
  conditionLabel,
  fetchDailyForecast,
  searchCity,
  type DailyForecast,
  type GeocodingHit,
} from '@/lib/weather';
import { useItemsStore } from '@/stores/items-store';
import type { ClothingItem } from '@/types';

export default function PackingScreen() {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  const text = Colors[scheme].text;

  const itemsMap = useItemsStore((s) => s.items);
  const items = useMemo(() => Object.values(itemsMap), [itemsMap]);

  // Inputs
  const [days, setDays] = useState(5);
  const [cityQuery, setCityQuery] = useState('');
  const [cityHits, setCityHits] = useState<GeocodingHit[]>([]);
  const [selectedCity, setSelectedCity] = useState<GeocodingHit | null>(null);
  const [searchingCity, setSearchingCity] = useState(false);

  // Forecast / manual fallback
  const [forecast, setForecast] = useState<DailyForecast[] | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [manualTMin, setManualTMin] = useState(12);
  const [manualTMax, setManualTMax] = useState(22);
  const [manualRain, setManualRain] = useState(false);

  // Result
  const [result, setResult] = useState<PackingResult | null>(null);

  // ----- City search (debounced) -----
  const handleCityChange = useCallback((text: string) => {
    setCityQuery(text);
    setSelectedCity(null);
    setForecast(null);
    setResult(null);
    if (text.length < 2) {
      setCityHits([]);
      return;
    }
    setSearchingCity(true);
    searchCity(text)
      .then(setCityHits)
      .catch(() => setCityHits([]))
      .finally(() => setSearchingCity(false));
  }, []);

  const handleSelectCity = useCallback(
    async (city: GeocodingHit) => {
      setSelectedCity(city);
      setCityHits([]);
      setCityQuery(`${city.name}${city.admin1 ? ', ' + city.admin1 : ''}`);
      setForecastLoading(true);
      try {
        const f = await fetchDailyForecast(city.latitude, city.longitude, Math.min(days, 16));
        setForecast(f);
      } catch (err) {
        Alert.alert('Météo indisponible', String(err instanceof Error ? err.message : err));
      } finally {
        setForecastLoading(false);
      }
    },
    [days],
  );

  // ----- Compute -----
  const handleBuild = useCallback(() => {
    const conditions: TripConditions = forecast
      ? summarizeForecast(forecast.slice(0, days))
      : { tempMin: manualTMin, tempMax: manualTMax, rainExpected: manualRain };
    if (items.length < 2) {
      Alert.alert('Garde-robe trop petite', 'Ajoute au moins quelques vêtements avant.');
      return;
    }
    const r = buildPacking(items, days, conditions);
    if (r.itemIds.length === 0) {
      Alert.alert('Aucun vêtement adapté', 'Essaie de modifier la température ou la durée.');
      return;
    }
    setResult(r);
  }, [forecast, days, manualTMin, manualTMax, manualRain, items]);

  const resolvedItems: ClothingItem[] = useMemo(
    () => (result ? result.itemIds.map((id) => itemsMap[id]).filter(Boolean) : []),
    [result, itemsMap],
  );

  const itemsByType = useMemo(() => {
    const groups: Record<string, ClothingItem[]> = {};
    for (const it of resolvedItems) {
      (groups[it.type] ||= []).push(it);
    }
    return Object.entries(groups);
  }, [resolvedItems]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
      <View style={[styles.header, { borderBottomColor: text + '15' }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText style={styles.headerBtn}>Fermer</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>Préparer une valise</ThemedText>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Durée */}
        <SectionHeader title="Combien de jours ?" />
        <View style={styles.daysRow}>
          <Pressable
            onPress={() => setDays((d) => Math.max(1, d - 1))}
            style={[styles.dayBtn, { borderColor: text + '20' }]}
            hitSlop={6}
          >
            <ThemedText style={styles.dayBtnText}>−</ThemedText>
          </Pressable>
          <View style={[styles.daysDisplay, { borderColor: text + '20' }]}>
            <ThemedText style={styles.daysValue}>{days}</ThemedText>
            <ThemedText style={styles.daysLabel}>{days === 1 ? 'jour' : 'jours'}</ThemedText>
          </View>
          <Pressable
            onPress={() => setDays((d) => Math.min(30, d + 1))}
            style={[styles.dayBtn, { borderColor: text + '20' }]}
            hitSlop={6}
          >
            <ThemedText style={styles.dayBtnText}>+</ThemedText>
          </Pressable>
        </View>

        {/* Destination */}
        <SectionHeader title="Destination" subtitle="Optionnel — pour récupérer la météo prévue." />
        <View style={styles.cityWrap}>
          <TextInput
            value={cityQuery}
            onChangeText={handleCityChange}
            placeholder="Paris, Lisbonne, New York…"
            placeholderTextColor={text + '60'}
            style={[styles.cityInput, { color: text, borderColor: text + '30' }]}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {searchingCity && <ActivityIndicator style={styles.citySpinner} color={tint} />}
          {cityHits.length > 0 && (
            <View style={[styles.cityList, { backgroundColor: Colors[scheme].background, borderColor: text + '20' }]}>
              {cityHits.map((h) => (
                <Pressable
                  key={`${h.name}-${h.latitude}-${h.longitude}`}
                  onPress={() => handleSelectCity(h)}
                  style={styles.cityRow}
                >
                  <ThemedText style={styles.cityRowMain}>
                    {h.name}{h.admin1 ? `, ${h.admin1}` : ''}
                  </ThemedText>
                  <ThemedText style={styles.cityRowSub}>{h.country}</ThemedText>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Forecast OR manual */}
        {selectedCity && forecastLoading && (
          <View style={styles.forecastLoading}>
            <ActivityIndicator color={tint} />
            <ThemedText style={{ marginLeft: 8, opacity: 0.6 }}>Météo en cours…</ThemedText>
          </View>
        )}
        {selectedCity && forecast && (
          <>
            <SectionHeader title="Météo prévue" />
            <FlatList
              horizontal
              data={forecast.slice(0, days)}
              keyExtractor={(d) => d.date}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) => (
                <View style={[styles.forecastDay, { borderColor: text + '15' }]}>
                  <ThemedText style={styles.forecastDate}>
                    {new Date(item.date).toLocaleDateString('fr-FR', {
                      weekday: 'short',
                      day: '2-digit',
                    })}
                  </ThemedText>
                  <ThemedText style={styles.forecastIcon}>{conditionEmoji(item.condition)}</ThemedText>
                  <ThemedText style={styles.forecastTemps}>
                    {item.tMin.toFixed(0)}-{item.tMax.toFixed(0)}°
                  </ThemedText>
                </View>
              )}
            />
          </>
        )}
        {!selectedCity && (
          <>
            <SectionHeader title="Estimation manuelle" subtitle="Si pas de destination renseignée." />
            <View style={styles.manualBlock}>
              <ManualSlider
                label="Min"
                value={manualTMin}
                onChange={setManualTMin}
                min={-10}
                max={35}
              />
              <ManualSlider
                label="Max"
                value={manualTMax}
                onChange={setManualTMax}
                min={-10}
                max={40}
              />
              <Pressable
                style={[styles.rainToggle, { borderColor: text + '20' }, manualRain && { backgroundColor: tint + '20', borderColor: tint }]}
                onPress={() => setManualRain((r) => !r)}
              >
                <Ionicons name={manualRain ? 'rainy' : 'rainy-outline'} size={18} color={manualRain ? tint : text} />
                <ThemedText style={[styles.rainToggleText, { color: manualRain ? tint : text }]}>
                  Pluie possible
                </ThemedText>
              </Pressable>
            </View>
          </>
        )}

        {/* Build */}
        <Pressable
          style={[styles.buildBtn, { backgroundColor: tint, marginTop: 24 }]}
          onPress={handleBuild}
        >
          <Ionicons name="bag-handle-outline" size={18} color="#fff" />
          <ThemedText style={styles.buildBtnText}>Préparer ma valise</ThemedText>
        </Pressable>

        {/* Result */}
        {result && resolvedItems.length > 0 && (
          <View style={styles.resultBlock}>
            <ThemedText style={styles.resultTitle}>
              {resolvedItems.length} pièces à emporter
            </ThemedText>
            {itemsByType.map(([type, list]) => (
              <View key={type} style={styles.groupBlock}>
                <ThemedText style={styles.groupTitle}>
                  {TYPE_LABELS_FR[type as keyof typeof TYPE_LABELS_FR] ?? type} ({list.length})
                </ThemedText>
                <View style={styles.thumbsRow}>
                  {list.map((it) => (
                    <View
                      key={it.id}
                      style={[
                        styles.thumb,
                        { backgroundColor: scheme === 'light' ? '#f0f0f0' : '#1f1f1f' },
                      ]}
                    >
                      <Image
                        source={{ uri: it.photoBgRemovedUri ?? it.photoUri }}
                        style={styles.thumbImg}
                        contentFit="contain"
                        transition={120}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Manual temperature slider — simple +/- buttons rather than a full slider lib
// ---------------------------------------------------------------------------

function ManualSlider({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  const scheme = useColorScheme() ?? 'light';
  const text = Colors[scheme].text;
  return (
    <View style={styles.sliderRow}>
      <ThemedText style={styles.sliderLabel}>{label}</ThemedText>
      <View style={styles.sliderControls}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          style={[styles.sliderBtn, { borderColor: text + '20' }]}
          hitSlop={6}
        >
          <ThemedText style={styles.sliderBtnText}>−</ThemedText>
        </Pressable>
        <ThemedText style={styles.sliderValue}>{value}°C</ThemedText>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          style={[styles.sliderBtn, { borderColor: text + '20' }]}
          hitSlop={6}
        >
          <ThemedText style={styles.sliderBtnText}>+</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: 16 },
  // Days
  daysRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  dayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBtnText: { fontSize: 22, fontWeight: '300' },
  daysDisplay: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  daysValue: { fontSize: 28, fontWeight: '700' },
  daysLabel: { fontSize: 12, opacity: 0.6 },
  // City
  cityWrap: { position: 'relative' },
  cityInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    marginTop: 4,
  },
  citySpinner: { position: 'absolute', right: 12, top: 18 },
  cityList: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  cityRow: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#00000010' },
  cityRowMain: { fontSize: 14, fontWeight: '500' },
  cityRowSub: { fontSize: 12, opacity: 0.6 },
  // Forecast
  forecastLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 },
  forecastDay: {
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    minWidth: 70,
  },
  forecastDate: { fontSize: 11, opacity: 0.7 },
  forecastIcon: { fontSize: 22, marginVertical: 4 },
  forecastTemps: { fontSize: 12, fontWeight: '500' },
  // Manual
  manualBlock: { gap: 8, marginTop: 4 },
  sliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: { fontSize: 14, opacity: 0.7 },
  sliderControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sliderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderBtnText: { fontSize: 20, fontWeight: '300' },
  sliderValue: { fontSize: 16, fontWeight: '600', minWidth: 50, textAlign: 'center' },
  rainToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  rainToggleText: { fontSize: 14, fontWeight: '500' },
  // Build
  buildBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buildBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // Result
  resultBlock: { marginTop: 24 },
  resultTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  groupBlock: { marginBottom: 16 },
  groupTitle: { fontSize: 13, fontWeight: '600', opacity: 0.6, marginBottom: 6 },
  thumbsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumb: { width: 70, height: 70, borderRadius: 8, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
});
