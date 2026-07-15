/**
 * Core domain types for Maderobe.
 *
 * Persisted via Zustand + AsyncStorage. Be very careful when changing these shapes:
 * - Add new fields as optional first, then migrate.
 * - Bump the store `name` (e.g. `maderobe/items/v1` → `v2`) if you do a breaking change.
 */

// ============================================================================
// Clothing items
// ============================================================================

export type ClothingType =
  | 'top'
  | 'bottom'
  | 'dress'
  | 'outerwear'
  | 'shoes'
  | 'bag'
  | 'belt'
  | 'accessory'
  | 'jewelry'
  | 'unknown';

/** Visual pattern of the garment. Drives how many `colors` we expect (1 for uni, up to 2 otherwise). */
export type Pattern = 'uni' | 'rayures' | 'carreaux' | 'bicolore' | 'imprime' | 'autre';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** Context where the garment is worn — used by outfit recommendations, not stored on item itself. */
export type Occasion = 'casual' | 'work' | 'sport' | 'evening' | 'formal';

export type ItemColor = {
  hex: string; // "#rrggbb" lowercase
  r: number; // 0..255
  g: number; // 0..255
  b: number; // 0..255
  /** Optional human-readable name from the palette (e.g. "Bleu marine"). */
  name?: string;
};

export type ClothingItem = {
  id: string;
  // Photos
  photoUri: string; // file:// of the original picture
  photoBgRemovedUri?: string; // file:// of the background-removed PNG (iOS 17+ only)
  // Required taxonomic attributes
  type: ClothingType;
  subType?: string; // free-form, e.g. "T-shirt", "Slim", "Bottines"
  pattern: Pattern;
  colors: ItemColor[]; // 1 if uni, up to 2 otherwise (primary + secondary)
  material?: string;
  // Optional attributes
  thickness?: number; // 1..5 slider (très fin → très épais)
  seasons: Season[]; // empty array = "all seasons"
  // Resale-oriented optional fields (Vinted/Leboncoin)
  brand?: string;
  size?: string;
  purchasePrice?: number; // EUR
  purchaseDate?: string; // ISO date
  // Tracking
  isFavorite: boolean;
  wearCount: number;
  lastWornAt?: string; // ISO datetime
  // Free-form notes
  notes?: string;
  // Audit
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

// ============================================================================
// Outfits
// ============================================================================

export type Outfit = {
  id: string;
  name?: string;
  itemIds: string[]; // references ClothingItem.id
  seasons: Season[];
  occasions: Occasion[];
  isFavorite: boolean;
  wearCount: number;
  lastWornAt?: string;
  source: 'manual' | 'suggested';
  createdAt: string;
};

// ============================================================================
// Settings
// ============================================================================

export type LibraryLayout = 'grid' | 'carousel';

export type Settings = {
  /** Default layout for the Dressing tab. User can toggle via header icon. */
  libraryLayout: LibraryLayout;
  /** Default occasion when generating an outfit / outfit-of-the-day. */
  defaultOccasion: Occasion;
  /** Whether the app should haptic-tick on item add/save. */
  hapticsEnabled: boolean;
  /** Free-form ISO language tag — kept for future i18n. */
  locale: 'fr' | 'en';
  /** Marks the first-launch onboarding flow as completed. */
  hasSeenOnboarding: boolean;
  /** Preferred flat-lay background id (see constants/flat-lay-backgrounds). */
  flatLayBackgroundId: string;
  /** True once we've asked for an App Store rating (never re-ask). */
  hasAskedReview: boolean;
};
