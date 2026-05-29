import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import {
  PATTERN_LABELS_FR,
  SEASON_LABELS_FR,
  TYPE_LABELS_FR,
} from '@/constants/taxonomy';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { HAPTIC, SPRING, staggerDelay } from '@/constants/motion';
import { deleteImage } from '@/lib/image-storage';
import { useItemsStore } from '@/stores/items-store';
import { useOutfitsStore } from '@/stores/outfits-store';
import type { ClothingItem } from '@/types';

const THICKNESS_LABELS = ['Très fin', 'Fin', 'Moyen', 'Épais', 'Très épais'];

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  const text = Colors[scheme].text;

  const item = useItemsStore((s) => (id ? s.items[id] : undefined));
  const removeItem = useItemsStore((s) => s.remove);
  const markWorn = useItemsStore((s) => s.markWorn);
  const toggleFavorite = useItemsStore((s) => s.toggleFavorite);
  const pruneOutfits = useOutfitsStore((s) => s.pruneReferencesTo);

  const handleShare = useCallback(async () => {
    if (!item) return;
    HAPTIC.tap();
    const message = buildShareMessage(item);
    try {
      await Share.share({
        message,
        // iOS attaches the URL as a file in the share sheet; Android uses the message.
        url: item.photoBgRemovedUri ?? item.photoUri,
      });
    } catch {
      // User cancelled or error — silent.
    }
  }, [item]);

  const handleMarkWornWithHaptic = useCallback(() => {
    if (!item) return;
    HAPTIC.success();
    markWorn(item.id);
  }, [item, markWorn]);

  const handleToggleFavoriteWithHaptic = useCallback(() => {
    if (!item) return;
    HAPTIC.selection();
    toggleFavorite(item.id);
  }, [item, toggleFavorite]);

  const handleDelete = useCallback(() => {
    if (!item) return;
    Alert.alert(
      'Supprimer ce vêtement ?',
      'Cette action est irréversible. Les tenues qui l’incluent seront aussi mises à jour.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            // Cascade: remove item, prune outfit references, delete files (best-effort).
            pruneOutfits(item.id);
            removeItem(item.id);
            await Promise.all([
              deleteImage(item.photoUri),
              item.photoBgRemovedUri ? deleteImage(item.photoBgRemovedUri) : Promise.resolve(),
            ]);
            router.back();
          },
        },
      ],
    );
  }, [item, removeItem, pruneOutfits]);

  if (!id || !item) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors[scheme].background }]}>
        <ThemedText style={styles.notFound}>Vêtement introuvable.</ThemedText>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ThemedText style={{ color: tint }}>Retour</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  const title = item.subType ?? TYPE_LABELS_FR[item.type];
  const displayedUri = item.photoBgRemovedUri ?? item.photoUri;
  const colorLine = item.colors
    .map((c) => c.name ?? c.hex)
    .join(item.colors.length > 1 ? ' + ' : '');
  const lastWornText = item.lastWornAt
    ? `dernière fois le ${new Date(item.lastWornAt).toLocaleDateString('fr-FR')}`
    : 'jamais porté';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: Colors[scheme].background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: text + '15' }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={26} color={text} />
        </Pressable>
        <ThemedText style={styles.headerTitle} numberOfLines={1}>
          {title}
        </ThemedText>
        <Pressable
          onPress={() => router.push(`/edit-item/${item.id}` as never)}
          hitSlop={12}
          style={styles.headerBtn}
        >
          <ThemedText style={[styles.headerBtnText, { color: tint }]}>Modifier</ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Photo with hero-style ZoomIn entrance */}
        <Animated.View
          entering={ZoomIn.springify().damping(15).stiffness(140)}
          style={[styles.photoWrap, { backgroundColor: scheme === 'light' ? '#f0f0f0' : '#1f1f1f' }]}
        >
          <Image
            source={{ uri: displayedUri }}
            style={styles.photo}
            contentFit="contain"
            transition={150}
          />
        </Animated.View>

        {/* Title + main meta — staggered fade-in-up after photo */}
        <Animated.View
          entering={FadeInDown.springify().damping(18).stiffness(160).delay(staggerDelay(1, 80))}
          style={styles.metaBlock}
        >
          <ThemedText style={styles.title}>{title}</ThemedText>
          <View style={styles.colorsRow}>
            {item.colors.map((c) => (
              <View key={c.hex} style={styles.colorChip}>
                <View style={[styles.colorSwatch, { backgroundColor: c.hex }]} />
                <ThemedText style={styles.colorText}>{c.name ?? c.hex}</ThemedText>
              </View>
            ))}
          </View>
          <ThemedText style={styles.subtitle}>
            {PATTERN_LABELS_FR[item.pattern]}
            {item.material ? ` · ${item.material}` : ''}
            {item.thickness ? ` · ${THICKNESS_LABELS[item.thickness - 1]}` : ''}
          </ThemedText>
          {item.seasons.length > 0 && (
            <ThemedText style={styles.subtitle}>
              Saisons : {item.seasons.map((s) => SEASON_LABELS_FR[s]).join(', ')}
            </ThemedText>
          )}
        </Animated.View>

        {/* Optional details (brand / size / price) */}
        {(item.brand || item.size || item.purchasePrice != null) && (
          <View style={[styles.section, { borderColor: text + '15' }]}>
            <ThemedText style={styles.sectionTitle}>Détails</ThemedText>
            {item.brand && <Detail label="Marque" value={item.brand} />}
            {item.size && <Detail label="Taille" value={item.size} />}
            {item.purchasePrice != null && (
              <Detail label="Prix d’achat" value={`${item.purchasePrice.toFixed(2).replace('.', ',')} €`} />
            )}
            {item.purchasePrice != null && item.wearCount > 0 && (
              <Detail
                label="Coût par port"
                value={`${(item.purchasePrice / item.wearCount).toFixed(2).replace('.', ',')} €`}
              />
            )}
          </View>
        )}

        {/* Wear tracking */}
        <View style={[styles.section, { borderColor: text + '15' }]}>
          <ThemedText style={styles.sectionTitle}>Usage</ThemedText>
          <Detail label="Porté" value={`${item.wearCount} fois (${lastWornText})`} />
          <Detail label="Ajouté le" value={new Date(item.createdAt).toLocaleDateString('fr-FR')} />
        </View>

        {/* Notes */}
        {item.notes && (
          <View style={[styles.section, { borderColor: text + '15' }]}>
            <ThemedText style={styles.sectionTitle}>Notes</ThemedText>
            <ThemedText style={styles.notes}>{item.notes}</ThemedText>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky action bar */}
      <View
        style={[
          styles.actionBar,
          { backgroundColor: Colors[scheme].background, borderTopColor: text + '15' },
        ]}
      >
        <Pressable
          style={[styles.markWornBtn, { backgroundColor: tint }]}
          onPress={handleMarkWornWithHaptic}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <ThemedText style={styles.markWornText}>Marquer comme porté</ThemedText>
        </Pressable>
        <View style={styles.secondaryActions}>
          <IconAction
            icon={item.isFavorite ? 'star' : 'star-outline'}
            color={item.isFavorite ? '#f1c40f' : text}
            label="Favori"
            onPress={handleToggleFavoriteWithHaptic}
          />
          <IconAction
            icon="share-outline"
            color={text}
            label="Partager"
            onPress={handleShare}
          />
          <IconAction icon="trash-outline" color="#e74c3c" label="Supprimer" onPress={handleDelete} />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText style={styles.detailValue}>{value}</ThemedText>
    </View>
  );
}

function IconAction({
  icon,
  color,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.iconAction} hitSlop={6}>
      <Ionicons name={icon} size={22} color={color} />
      <ThemedText style={[styles.iconActionLabel, { color }]}>{label}</ThemedText>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildShareMessage(item: ClothingItem): string {
  const title = item.subType ?? TYPE_LABELS_FR[item.type];
  const brandPart = item.brand ? ` ${item.brand}` : '';
  const colorsLine = item.colors.map((c) => c.name ?? c.hex).join(', ');
  const lines: string[] = [`${title}${brandPart}`];
  if (item.size) lines.push(`Taille ${item.size}`);
  lines.push(`${PATTERN_LABELS_FR[item.pattern]} · ${colorsLine}`);
  if (item.material) lines.push(`Matière : ${item.material}`);
  if (item.notes) lines.push(item.notes);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  scroll: { padding: 16 },
  photoWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  metaBlock: { marginTop: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  colorsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  colorSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#00000020',
  },
  colorText: { fontSize: 14 },
  subtitle: { fontSize: 15, opacity: 0.7 },
  section: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.7,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: { fontSize: 14, opacity: 0.6 },
  detailValue: { fontSize: 14, fontWeight: '500' },
  notes: { fontSize: 14, lineHeight: 20 },
  // Action bar
  actionBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  markWornBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  markWornText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  iconAction: { alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 4 },
  iconActionLabel: { fontSize: 12 },
  // 404
  notFound: {
    flex: 1,
    textAlign: 'center',
    marginTop: 80,
    fontSize: 16,
    opacity: 0.7,
  },
  backBtn: { alignSelf: 'center', padding: 16 },
});
