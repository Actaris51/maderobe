/**
 * Static taxonomies displayed in the add-item / filter flows.
 *
 * Orders are SEEDS — they reflect typical popularity for a French unisex-minimalist audience.
 * At runtime, the `popularity-tracker` reorders sub-types and materials based on actual usage.
 */

import type {
  ClothingType,
  Occasion,
  Pattern,
  Season,
} from '@/types';

// ----------------------------------------------------------------------------
// Top-level types
// ----------------------------------------------------------------------------

/** Display order of clothing types in the picker (most-used first). */
export const CLOTHING_TYPES_ORDER: ClothingType[] = [
  'top',
  'bottom',
  'shoes',
  'outerwear',
  'dress',
  'accessory',
  'bag',
  'belt',
  'jewelry',
  'unknown',
];

export const TYPE_LABELS_FR: Record<ClothingType, string> = {
  top: 'Haut',
  bottom: 'Bas',
  dress: 'Robe',
  outerwear: 'Manteau',
  shoes: 'Chaussures',
  bag: 'Sac',
  belt: 'Ceinture',
  accessory: 'Accessoire',
  jewelry: 'Bijou',
  unknown: 'Autre',
};

// ----------------------------------------------------------------------------
// Sub-types per type
// ----------------------------------------------------------------------------

export const SUB_TYPES_BY_TYPE: Record<ClothingType, string[]> = {
  top: ['T-shirt', 'Chemise', 'Pull', 'Sweat', 'Polo', 'Débardeur', 'Gilet', 'Top'],
  bottom: ['Jean', 'Pantalon', 'Short', 'Jupe', 'Chino', 'Jogging', 'Legging', 'Bermuda'],
  dress: ['Robe courte', 'Robe longue', 'Robe midi', 'Combinaison'],
  outerwear: ['Veste', 'Manteau', 'Blouson', 'Doudoune', 'Trench', 'Blazer', 'Parka', 'Imperméable'],
  shoes: ['Baskets', 'Bottines', 'Bottes', 'Mocassins', 'Derbies', 'Sandales', 'Escarpins', 'Tongs', 'Espadrilles'],
  bag: ['Sac à main', 'Sac à dos', 'Cabas', 'Pochette', 'Sac bandoulière', 'Bagage'],
  belt: ['Ceinture cuir', 'Ceinture tissu'],
  accessory: ['Casquette', 'Bonnet', 'Chapeau', 'Écharpe', 'Foulard', 'Lunettes', 'Cravate', 'Gants'],
  jewelry: ['Montre', 'Collier', 'Bracelet', 'Bague', "Boucles d'oreilles"],
  unknown: [],
};

// ----------------------------------------------------------------------------
// Patterns (motifs)
// ----------------------------------------------------------------------------

export const PATTERNS_ORDER: Pattern[] = [
  'uni',
  'rayures',
  'carreaux',
  'bicolore',
  'imprime',
  'autre',
];

export const PATTERN_LABELS_FR: Record<Pattern, string> = {
  uni: 'Uni',
  rayures: 'Rayures',
  carreaux: 'Carreaux',
  bicolore: 'Bicolore',
  imprime: 'Imprimé',
  autre: 'Autre',
};

/** Returns the maximum number of colors expected for a given pattern. */
export function maxColorsForPattern(pattern: Pattern): number {
  return pattern === 'uni' ? 1 : 2;
}

// ----------------------------------------------------------------------------
// Materials
// ----------------------------------------------------------------------------

export const MATERIALS_ORDER: string[] = [
  'Coton',
  'Polyester',
  'Jean',
  'Laine',
  'Lin',
  'Cuir',
  'Velours',
  'Soie',
  'Cachemire',
  'Synthétique',
  'Daim',
  'Toile',
  'Élasthanne',
  'Viscose',
  'Nylon',
];

// ----------------------------------------------------------------------------
// Color palette (~20 named base colors)
// ----------------------------------------------------------------------------

export type PaletteColor = { name: string; hex: string };

export const COLOR_PALETTE: PaletteColor[] = [
  { name: 'Noir', hex: '#000000' },
  { name: 'Blanc', hex: '#ffffff' },
  { name: 'Gris', hex: '#808080' },
  { name: 'Gris clair', hex: '#c0c0c0' },
  { name: 'Beige', hex: '#d2b48c' },
  { name: 'Marron', hex: '#654321' },
  { name: 'Camel', hex: '#c19a6b' },
  { name: 'Rouge', hex: '#c0392b' },
  { name: 'Bordeaux', hex: '#7b1e21' },
  { name: 'Orange', hex: '#e67e22' },
  { name: 'Jaune', hex: '#f1c40f' },
  { name: 'Vert', hex: '#27ae60' },
  { name: 'Vert kaki', hex: '#7c8e57' },
  { name: 'Vert sapin', hex: '#1d3a2a' },
  { name: 'Bleu marine', hex: '#1f2c5b' },
  { name: 'Bleu', hex: '#2980b9' },
  { name: 'Bleu ciel', hex: '#87ceeb' },
  { name: 'Violet', hex: '#8e44ad' },
  { name: 'Rose', hex: '#f06292' },
  { name: 'Doré', hex: '#d4af37' },
  { name: 'Argenté', hex: '#bcc6cc' },
];

// ----------------------------------------------------------------------------
// Seasons + occasions
// ----------------------------------------------------------------------------

export const SEASONS_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export const SEASON_LABELS_FR: Record<Season, string> = {
  spring: 'Printemps',
  summer: 'Été',
  autumn: 'Automne',
  winter: 'Hiver',
};

export const OCCASIONS_ORDER: Occasion[] = [
  'casual',
  'work',
  'sport',
  'evening',
  'formal',
];

export const OCCASION_LABELS_FR: Record<Occasion, string> = {
  casual: 'Décontracté',
  work: 'Boulot',
  sport: 'Sport',
  evening: 'Sortie',
  formal: 'Formel',
};

// ----------------------------------------------------------------------------
// Color utility — find the closest palette entry for an arbitrary hex
// ----------------------------------------------------------------------------

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const num = parseInt(h, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

/** Return the palette color closest (Euclidean distance in RGB) to the given hex. */
export function closestPaletteColor(hex: string): PaletteColor {
  const { r, g, b } = hexToRgb(hex);
  let best = COLOR_PALETTE[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const c of COLOR_PALETTE) {
    const cRgb = hexToRgb(c.hex);
    const dist = (r - cRgb.r) ** 2 + (g - cRgb.g) ** 2 + (b - cRgb.b) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}
