import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { ColorSwatch } from '@/components/color-swatch';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import {
  CLOTHING_TYPES_ORDER,
  COLOR_PALETTE,
  PATTERNS_ORDER,
  PATTERN_LABELS_FR,
  SEASONS_ORDER,
  SEASON_LABELS_FR,
  TYPE_LABELS_FR,
} from '@/constants/taxonomy';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  EMPTY_FILTER,
  type FilterState,
  type SortKey,
} from '@/lib/item-filter';
import type { ClothingType, Pattern, Season } from '@/types';

type Props = {
  visible: boolean;
  filter: FilterState;
  sort: SortKey;
  onClose: () => void;
  onApply: (filter: FilterState, sort: SortKey) => void;
};

const SORT_LABELS: Record<SortKey, string> = {
  recent: 'Récents',
  'most-worn': 'Plus portés',
  'least-worn': 'Moins portés',
  alpha: 'A → Z',
};

export function FilterSheet({ visible, filter, sort, onClose, onApply }: Props) {
  const scheme = useColorScheme() ?? 'light';
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <FilterSheetBody
        scheme={scheme}
        filter={filter}
        sort={sort}
        onClose={onClose}
        onApply={onApply}
      />
    </Modal>
  );
}

function FilterSheetBody({
  scheme,
  filter,
  sort,
  onClose,
  onApply,
}: {
  scheme: 'light' | 'dark';
  filter: FilterState;
  sort: SortKey;
  onClose: () => void;
  onApply: (f: FilterState, s: SortKey) => void;
}) {
  const tint = Colors[scheme].tint;
  const [f, setF] = useState<FilterState>(filter);
  const [s, setS] = useState<SortKey>(sort);

  const toggleType = (t: ClothingType) =>
    setF((cur) => ({
      ...cur,
      types: cur.types.includes(t) ? cur.types.filter((x) => x !== t) : [...cur.types, t],
    }));

  const setPattern = (p: Pattern | null) =>
    setF((cur) => ({ ...cur, pattern: cur.pattern === p ? null : p }));

  const toggleSeason = (sn: Season) =>
    setF((cur) => ({
      ...cur,
      seasons: cur.seasons.includes(sn)
        ? cur.seasons.filter((x) => x !== sn)
        : [...cur.seasons, sn],
    }));

  const toggleColor = (hex: string) =>
    setF((cur) => ({
      ...cur,
      colorHexes: cur.colorHexes.includes(hex)
        ? cur.colorHexes.filter((x) => x !== hex)
        : [...cur.colorHexes, hex],
    }));

  return (
    <View style={[styles.sheet, { backgroundColor: Colors[scheme].background }]}>
      <View style={[styles.header, { borderBottomColor: Colors[scheme].text + '20' }]}>
        <Pressable onPress={onClose} hitSlop={12}>
          <ThemedText style={styles.headerBtn}>Fermer</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>Filtres et tri</ThemedText>
        <Pressable
          onPress={() => {
            setF(EMPTY_FILTER);
            setS('recent');
          }}
          hitSlop={12}
        >
          <ThemedText style={[styles.headerBtn, { color: tint }]}>Réinitialiser</ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <SectionHeader title="Rapide" />
        <View style={styles.chipsRow}>
          <Chip
            label="Favoris"
            selected={f.favoritesOnly}
            onPress={() => setF((cur) => ({ ...cur, favoritesOnly: !cur.favoritesOnly }))}
          />
          <Chip
            label="Jamais portés / oubliés"
            selected={f.unwornOnly}
            onPress={() => setF((cur) => ({ ...cur, unwornOnly: !cur.unwornOnly }))}
          />
        </View>

        <SectionHeader title="Types" />
        <View style={styles.chipsRow}>
          {CLOTHING_TYPES_ORDER.map((t) => (
            <Chip
              key={t}
              label={TYPE_LABELS_FR[t]}
              selected={f.types.includes(t)}
              onPress={() => toggleType(t)}
            />
          ))}
        </View>

        <SectionHeader title="Motif" />
        <View style={styles.chipsRow}>
          {PATTERNS_ORDER.map((p) => (
            <Chip
              key={p}
              label={PATTERN_LABELS_FR[p]}
              selected={f.pattern === p}
              onPress={() => setPattern(p)}
            />
          ))}
        </View>

        <SectionHeader title="Saisons" />
        <View style={styles.chipsRow}>
          {SEASONS_ORDER.map((sn) => (
            <Chip
              key={sn}
              label={SEASON_LABELS_FR[sn]}
              selected={f.seasons.includes(sn)}
              onPress={() => toggleSeason(sn)}
            />
          ))}
        </View>

        <SectionHeader title="Couleurs" />
        <View style={styles.palette}>
          {COLOR_PALETTE.map((c) => (
            <ColorSwatch
              key={c.hex}
              hex={c.hex}
              selected={f.colorHexes.includes(c.hex)}
              onPress={() => toggleColor(c.hex)}
            />
          ))}
        </View>

        <SectionHeader title="Tri" />
        <View style={styles.chipsRow}>
          {(['recent', 'most-worn', 'least-worn', 'alpha'] as SortKey[]).map((k) => (
            <Chip key={k} label={SORT_LABELS[k]} selected={s === k} onPress={() => setS(k)} />
          ))}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      <View
        style={[
          styles.applyBar,
          {
            borderTopColor: Colors[scheme].text + '20',
            backgroundColor: Colors[scheme].background,
          },
        ]}
      >
        <Pressable
          style={[styles.applyBtn, { backgroundColor: tint }]}
          onPress={() => onApply(f, s)}
        >
          <ThemedText style={styles.applyText}>Appliquer</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
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
  body: { padding: 16 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  applyBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  applyBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  applyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
