import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import {
  OCCASIONS_ORDER,
  OCCASION_LABELS_FR,
  TYPE_LABELS_FR,
} from '@/constants/taxonomy';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { exportWardrobeJson } from '@/lib/export';
import { getCoarseLocation } from '@/lib/location';
import { computeStats } from '@/lib/stats';
import { conditionEmoji, conditionLabel } from '@/lib/weather';
import { useItemsStore } from '@/stores/items-store';
import { useOutfitsStore } from '@/stores/outfits-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useWeatherStore } from '@/stores/weather-store';
import type { LibraryLayout, Occasion } from '@/types';

const PRIVACY_URL = 'https://actaris51.github.io/maderobe/privacy-policy.html';
const CONTACT_EMAIL = 'julien.duval.patrimoine@gmail.com';

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const text = Colors[scheme].text;
  const tint = Colors[scheme].tint;

  const itemsMap = useItemsStore((s) => s.items);
  const items = useMemo(() => Object.values(itemsMap), [itemsMap]);
  const clearItems = useItemsStore((s) => s.clear);

  const outfitsMap = useOutfitsStore((s) => s.outfits);
  const outfits = useMemo(() => Object.values(outfitsMap), [outfitsMap]);
  const clearOutfits = useOutfitsStore((s) => s.clear);

  const settings = useSettingsStore();
  const setSetting = useSettingsStore((s) => s.set);

  const currentWeather = useWeatherStore((s) => s.current);
  const refreshWeather = useWeatherStore((s) => s.refresh);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const stats = useMemo(() => computeStats(items), [items]);

  const handleActivateWeather = async () => {
    setWeatherLoading(true);
    try {
      const loc = await getCoarseLocation();
      if (!loc.granted) {
        Alert.alert(
          'Autorisation refusée',
          "Tu peux activer la position depuis Réglages › Maderobe › Position. Sans ça, les suggestions ne s'adaptent pas à la météo.",
        );
        return;
      }
      await refreshWeather(loc.lat, loc.lon, true);
    } catch (err) {
      Alert.alert('Erreur météo', String(err instanceof Error ? err.message : err));
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleRefreshWeather = async () => {
    if (!currentWeather) return handleActivateWeather();
    setWeatherLoading(true);
    try {
      await refreshWeather(currentWeather.lat, currentWeather.lon, true);
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleExport = async () => {
    if (items.length === 0 && outfits.length === 0) {
      Alert.alert('Rien à exporter', 'Ajoute des vêtements avant d’exporter.');
      return;
    }
    try {
      await exportWardrobeJson(items, outfits, settings);
    } catch (err) {
      Alert.alert("Échec de l'export", String(err instanceof Error ? err.message : err));
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Tout réinitialiser ?',
      'Cette action supprime tous les vêtements et toutes les tenues. Les photos sur ton téléphone restent inchangées. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: () => {
            clearItems();
            clearOutfits();
          },
        },
      ],
    );
  };

  const handleOpenPrivacy = () => WebBrowser.openBrowserAsync(PRIVACY_URL);
  const handleContact = () =>
    WebBrowser.openBrowserAsync(`mailto:${CONTACT_EMAIL}?subject=Maderobe%20—%20feedback`);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: Colors[scheme].background }]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText style={styles.appTitle}>Profil</ThemedText>

        {/* -------- Stats -------- */}
        <Section title="Statistiques">
          <Row>
            <Stat label="Vêtements" value={stats.totalItems.toString()} />
            <Stat label="Favoris" value={stats.favoritesCount.toString()} />
          </Row>
          <Row>
            <Stat label="Tenues" value={outfits.length.toString()} />
            <Stat label="Portés (total)" value={stats.totalWearCount.toString()} />
          </Row>
          {stats.totalValueEUR != null && (
            <Row>
              <Stat
                label="Valeur estimée"
                value={`${stats.totalValueEUR.toFixed(0)} €`}
              />
              {stats.averageCostPerWear != null ? (
                <Stat
                  label="Coût moyen / port"
                  value={`${stats.averageCostPerWear.toFixed(2).replace('.', ',')} €`}
                />
              ) : (
                <Stat label="Coût / port" value="—" />
              )}
            </Row>
          )}
        </Section>

        {/* -------- Categories -------- */}
        {stats.byCategory.length > 0 && (
          <Section title="Par catégorie">
            <View style={styles.cardCol}>
              {stats.byCategory.map((c) => (
                <View key={c.type} style={styles.catRow}>
                  <ThemedText style={styles.catLabel}>{TYPE_LABELS_FR[c.type]}</ThemedText>
                  <ThemedText style={styles.catValue}>{c.count}</ThemedText>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* -------- Wear insights -------- */}
        {(stats.topWorn.length > 0 || stats.neverWorn.length > 0 || stats.forgottenWorn.length > 0) && (
          <Section title="Usage">
            {stats.topWorn.length > 0 && (
              <View style={[styles.insightCard, { borderColor: text + '15' }]}>
                <ThemedText style={styles.insightTitle}>
                  Les plus portés
                </ThemedText>
                {stats.topWorn.map((it) => (
                  <View key={it.id} style={styles.insightRow}>
                    <ThemedText style={styles.insightItemLabel}>
                      {it.subType ?? TYPE_LABELS_FR[it.type]}
                    </ThemedText>
                    <ThemedText style={styles.insightItemValue}>{it.wearCount}×</ThemedText>
                  </View>
                ))}
              </View>
            )}
            {stats.neverWorn.length > 0 && (
              <View style={[styles.insightCard, { borderColor: text + '15' }]}>
                <ThemedText style={styles.insightTitle}>
                  Jamais portés ({stats.neverWorn.length})
                </ThemedText>
                <ThemedText style={styles.insightSubtitle}>
                  Pense à les sortir ou à les revendre.
                </ThemedText>
              </View>
            )}
            {stats.forgottenWorn.length > 0 && (
              <View style={[styles.insightCard, { borderColor: text + '15' }]}>
                <ThemedText style={styles.insightTitle}>
                  Oubliés ({stats.forgottenWorn.length})
                </ThemedText>
                <ThemedText style={styles.insightSubtitle}>
                  Portés au moins une fois, mais pas depuis 3 mois.
                </ThemedText>
              </View>
            )}
          </Section>
        )}

        {/* -------- Weather -------- */}
        <Section title="Météo">
          {currentWeather ? (
            <View style={[styles.weatherCard, { borderColor: text + '15' }]}>
              <ThemedText style={styles.weatherMain}>
                {conditionEmoji(currentWeather.condition)} {currentWeather.temperature.toFixed(0)}°C ·{' '}
                {conditionLabel(currentWeather.condition)}
              </ThemedText>
              <ThemedText style={styles.weatherSub}>
                Humidité {currentWeather.humidity.toFixed(0)} % · mis à jour{' '}
                {new Date(currentWeather.fetchedAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </ThemedText>
              <Pressable onPress={handleRefreshWeather} style={styles.weatherRefresh} disabled={weatherLoading}>
                {weatherLoading ? (
                  <ActivityIndicator size="small" color={tint} />
                ) : (
                  <ThemedText style={[styles.weatherRefreshText, { color: tint }]}>
                    Mettre à jour
                  </ThemedText>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleActivateWeather}
              disabled={weatherLoading}
              style={[styles.actionRow, { borderColor: text + '15' }]}
            >
              <Ionicons name="partly-sunny-outline" size={22} color={tint} />
              <View style={styles.actionMeta}>
                <ThemedText style={[styles.actionLabel, { color: tint }]}>
                  Activer la météo
                </ThemedText>
                <ThemedText style={styles.actionSub}>
                  Adapte les suggestions de tenues à la température actuelle.
                </ThemedText>
              </View>
              {weatherLoading ? (
                <ActivityIndicator size="small" color={tint} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={text + '60'} />
              )}
            </Pressable>
          )}
        </Section>

        {/* -------- Settings -------- */}
        <Section title="Préférences">
          <View style={styles.settingRow}>
            <ThemedText style={styles.settingLabel}>Mise en page du dressing</ThemedText>
            <View style={styles.settingChips}>
              {(['grid', 'carousel'] as LibraryLayout[]).map((l) => (
                <Chip
                  key={l}
                  label={l === 'grid' ? 'Grille' : 'Carrousel'}
                  selected={settings.libraryLayout === l}
                  onPress={() => setSetting('libraryLayout', l)}
                />
              ))}
            </View>
          </View>
          <View style={styles.settingRow}>
            <ThemedText style={styles.settingLabel}>Contexte par défaut</ThemedText>
            <View style={styles.settingChips}>
              {OCCASIONS_ORDER.map((o) => (
                <Chip
                  key={o}
                  label={OCCASION_LABELS_FR[o]}
                  selected={settings.defaultOccasion === o}
                  onPress={() => setSetting('defaultOccasion', o as Occasion)}
                />
              ))}
            </View>
          </View>
        </Section>

        {/* -------- Data -------- */}
        <Section title="Données">
          <ActionRow
            icon="download-outline"
            label="Exporter ma garde-robe (JSON)"
            sublabel="Sauvegarde locale. Les photos ne sont pas incluses."
            onPress={handleExport}
            color={tint}
          />
          <ActionRow
            icon="trash-outline"
            label="Tout réinitialiser"
            sublabel="Supprime tous les vêtements et toutes les tenues."
            onPress={handleReset}
            color="#e74c3c"
          />
        </Section>

        {/* -------- About -------- */}
        <Section title="À propos">
          <ActionRow
            icon="lock-closed-outline"
            label="Politique de confidentialité"
            onPress={handleOpenPrivacy}
            color={text}
          />
          <ActionRow
            icon="mail-outline"
            label="Contact"
            sublabel={CONTACT_EMAIL}
            onPress={handleContact}
            color={text}
          />
          <View style={[styles.aboutFooter, { borderColor: text + '15' }]}>
            <ThemedText style={styles.aboutText}>Maderobe · v1.0.0</ThemedText>
            <ThemedText style={styles.aboutText}>
              Toutes tes données restent sur ton téléphone.
            </ThemedText>
          </View>
        </Section>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {children}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function Stat({ label, value }: { label: string; value: string }) {
  const scheme = useColorScheme() ?? 'light';
  return (
    <View style={[styles.statCard, { borderColor: Colors[scheme].text + '15' }]}>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  sublabel,
  onPress,
  color,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sublabel?: string;
  onPress: () => void;
  color: string;
}) {
  const scheme = useColorScheme() ?? 'light';
  return (
    <Pressable
      onPress={onPress}
      style={[styles.actionRow, { borderColor: Colors[scheme].text + '15' }]}
    >
      <Ionicons name={icon} size={22} color={color} />
      <View style={styles.actionMeta}>
        <ThemedText style={[styles.actionLabel, { color }]}>{label}</ThemedText>
        {sublabel && <ThemedText style={styles.actionSub}>{sublabel}</ThemedText>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors[scheme].text + '60'} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 60 },
  appTitle: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  cardCol: { gap: 4 },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  catLabel: { fontSize: 14 },
  catValue: { fontSize: 14, fontWeight: '500' },
  insightCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  insightTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  insightSubtitle: { fontSize: 13, opacity: 0.6 },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  insightItemLabel: { fontSize: 13 },
  insightItemValue: { fontSize: 13, fontWeight: '500' },
  settingRow: { marginBottom: 16 },
  settingLabel: { fontSize: 14, marginBottom: 8, opacity: 0.8 },
  settingChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  actionMeta: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '500' },
  actionSub: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  aboutFooter: {
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  aboutText: { fontSize: 13, opacity: 0.6, textAlign: 'center', marginBottom: 4 },
  weatherCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  weatherMain: { fontSize: 18, fontWeight: '600' },
  weatherSub: { fontSize: 13, opacity: 0.6, marginTop: 4 },
  weatherRefresh: { paddingVertical: 8, marginTop: 4 },
  weatherRefreshText: { fontSize: 14, fontWeight: '500' },
});
