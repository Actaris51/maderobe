import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fab } from '@/components/fab';
import { ThemedText } from '@/components/themed-text';
import { FilterSheet } from '@/components/wardrobe/filter-sheet';
import { ItemCarouselCard } from '@/components/wardrobe/item-carousel-card';
import { ItemThumbnail } from '@/components/wardrobe/item-thumbnail';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  applyFilter,
  applySort,
  EMPTY_FILTER,
  isFilterActive,
  type FilterState,
  type SortKey,
} from '@/lib/item-filter';
import { useItemsStore } from '@/stores/items-store';
import { useSettingsStore } from '@/stores/settings-store';
import type { ClothingItem } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = 16;
const GRID_GAP = 8;
const GRID_COLS = 3;
const GRID_THUMB_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH - 64;
const CAROUSEL_GAP = 16;

export default function DressingScreen() {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  const text = Colors[scheme].text;

  // Read items as a map (cheap) then derive list
  const itemsMap = useItemsStore((s) => s.items);
  const items = useMemo(() => Object.values(itemsMap), [itemsMap]);

  // Layout preference
  const layout = useSettingsStore((s) => s.libraryLayout);
  const setSetting = useSettingsStore((s) => s.set);

  // Filter / sort / search state — local (not persisted yet)
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [sort, setSort] = useState<SortKey>('recent');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);

  const filtered = useMemo(
    () => applySort(applyFilter(items, filter), sort),
    [items, filter, sort],
  );

  const filterActive = isFilterActive(filter) || sort !== 'recent';

  const handleOpenItem = (id: string) => router.push(`/item/${id}` as never);
  const handleAdd = () => router.push('/add-item');

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: Colors[scheme].background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: text + '15' }]}>
        <ThemedText style={styles.appTitle}>Maderobe</ThemedText>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setSetting('libraryLayout', layout === 'grid' ? 'carousel' : 'grid')}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Ionicons
              name={layout === 'grid' ? 'albums-outline' : 'grid-outline'}
              size={22}
              color={text}
            />
          </Pressable>
          <Pressable
            onPress={() => setShowSearchBar((x) => !x)}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Ionicons
              name={showSearchBar ? 'close-outline' : 'search-outline'}
              size={22}
              color={text}
            />
          </Pressable>
          <Pressable
            onPress={() => setShowFilterSheet(true)}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Ionicons name="filter-outline" size={22} color={text} />
            {filterActive && <View style={[styles.activeDot, { backgroundColor: tint }]} />}
          </Pressable>
        </View>
      </View>

      {/* Search bar (slides in) */}
      {showSearchBar && (
        <View style={[styles.searchWrap, { borderBottomColor: text + '15' }]}>
          <Ionicons name="search-outline" size={16} color={text + '80'} />
          <TextInput
            placeholder="Rechercher (marque, notes, sous-type…)"
            placeholderTextColor={text + '60'}
            value={filter.query}
            onChangeText={(q) => setFilter((cur) => ({ ...cur, query: q }))}
            style={[styles.searchInput, { color: text }]}
            autoFocus
          />
          {filter.query.length > 0 && (
            <Pressable
              onPress={() => setFilter((cur) => ({ ...cur, query: '' }))}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={text + '80'} />
            </Pressable>
          )}
        </View>
      )}

      {/* Body */}
      {items.length === 0 ? (
        <EmptyStateNew onAdd={handleAdd} />
      ) : filtered.length === 0 ? (
        <EmptyStateFiltered
          onReset={() => {
            setFilter(EMPTY_FILTER);
            setSort('recent');
          }}
        />
      ) : layout === 'grid' ? (
        <DressingGrid items={filtered} onItemPress={handleOpenItem} />
      ) : (
        <DressingCarousel items={filtered} onItemPress={handleOpenItem} />
      )}

      <Fab onPress={handleAdd} />

      <FilterSheet
        visible={showFilterSheet}
        filter={filter}
        sort={sort}
        onClose={() => setShowFilterSheet(false)}
        onApply={(f, s) => {
          setFilter(f);
          setSort(s);
          setShowFilterSheet(false);
        }}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Layouts
// ---------------------------------------------------------------------------

function DressingGrid({
  items,
  onItemPress,
}: {
  items: ClothingItem[];
  onItemPress: (id: string) => void;
}) {
  return (
    <FlatList
      data={items}
      keyExtractor={(it) => it.id}
      numColumns={GRID_COLS}
      contentContainerStyle={styles.gridContent}
      columnWrapperStyle={styles.gridRow}
      renderItem={({ item }) => (
        <ItemThumbnail
          item={item}
          size={GRID_THUMB_SIZE}
          onPress={() => onItemPress(item.id)}
        />
      )}
    />
  );
}

function DressingCarousel({
  items,
  onItemPress,
}: {
  items: ClothingItem[];
  onItemPress: (id: string) => void;
}) {
  return (
    <FlatList
      data={items}
      keyExtractor={(it) => it.id}
      horizontal
      pagingEnabled={false}
      showsHorizontalScrollIndicator={false}
      snapToAlignment="center"
      snapToInterval={CAROUSEL_CARD_WIDTH + CAROUSEL_GAP}
      decelerationRate="fast"
      contentContainerStyle={styles.carouselContent}
      ItemSeparatorComponent={() => <View style={{ width: CAROUSEL_GAP }} />}
      renderItem={({ item }) => (
        <ItemCarouselCard
          item={item}
          width={CAROUSEL_CARD_WIDTH}
          onPress={() => onItemPress(item.id)}
        />
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Empty states
// ---------------------------------------------------------------------------

function EmptyStateNew({ onAdd }: { onAdd: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  return (
    <View style={styles.emptyWrap}>
      <ThemedText style={styles.emptyTitle}>Ta garde-robe est vide.</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Ajoute ton premier vêtement en photo pour démarrer.
      </ThemedText>
      <Pressable
        style={[styles.emptyCta, { backgroundColor: tint }]}
        onPress={onAdd}
      >
        <ThemedText style={styles.emptyCtaText}>+ Ajouter un vêtement</ThemedText>
      </Pressable>
    </View>
  );
}

function EmptyStateFiltered({ onReset }: { onReset: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  return (
    <View style={styles.emptyWrap}>
      <ThemedText style={styles.emptyTitle}>Aucun vêtement ne correspond.</ThemedText>
      <ThemedText style={styles.emptySubtitle}>Essaie d&apos;assouplir tes filtres.</ThemedText>
      <Pressable onPress={onReset}>
        <ThemedText style={[styles.emptyCtaText, { color: tint, marginTop: 16 }]}>
          Réinitialiser les filtres
        </ThemedText>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  iconBtn: {
    padding: 8,
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  // Grid
  gridContent: {
    padding: GRID_PADDING,
    paddingBottom: 100,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  // Carousel
  carouselContent: {
    paddingHorizontal: (SCREEN_WIDTH - CAROUSEL_CARD_WIDTH) / 2,
    paddingTop: 24,
    paddingBottom: 100,
    alignItems: 'center',
  },
  // Empty states
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyCta: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
