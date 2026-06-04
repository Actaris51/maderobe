/**
 * Photo capture guide per clothing type.
 *
 * The camera overlay shows a giant low-opacity Ionicon as a silhouette to help
 * the user align their item, plus a short tagline reminding them how to pose
 * it (flat on a surface, top-down view, neutral background). Consistent input
 * photos make the catalog look professional in the grid view, and produce
 * cleaner background removal + more accurate Vision classification.
 *
 * Inspired by the Pinterest-style "outfit flat lay" aesthetic — see
 * `components/camera-with-guide.tsx` for usage.
 */

import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import type { ClothingType } from '@/types';

export type PhotoGuide = {
  /** Ionicon name used as the silhouette overlay. */
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Short label shown above the silhouette ("Haut", "Bas", …). */
  label: string;
  /** One-line instruction shown at the bottom of the camera. */
  tagline: string;
  /** Optional rotation of the silhouette (degrees), for variety. */
  rotation?: number;
};

export const PHOTO_GUIDES: Record<ClothingType, PhotoGuide> = {
  top: {
    icon: 'shirt-outline',
    label: 'Haut',
    tagline: 'Pose à plat, encolure en haut, vue du dessus.',
  },
  bottom: {
    icon: 'archive-outline',
    label: 'Bas',
    tagline: 'Plie en deux dans la longueur, taille à gauche.',
  },
  dress: {
    icon: 'body-outline',
    label: 'Robe',
    tagline: 'Étale à plat, encolure en haut, jupe en bas.',
  },
  outerwear: {
    icon: 'shirt-outline',
    label: 'Manteau / Veste',
    tagline: 'À plat, boutonnée, manches le long du corps.',
  },
  shoes: {
    icon: 'footsteps-outline',
    label: 'Chaussures',
    tagline: 'Profil, les deux chaussures côte à côte.',
  },
  bag: {
    icon: 'bag-handle-outline',
    label: 'Sac',
    tagline: 'Vue de face, anses visibles.',
  },
  belt: {
    icon: 'ellipse-outline',
    label: 'Ceinture',
    tagline: 'Plie en cercle ou pose à plat allongée.',
  },
  accessory: {
    icon: 'glasses-outline',
    label: 'Accessoire',
    tagline: "Centre l'objet, fond neutre.",
  },
  jewelry: {
    icon: 'watch-outline',
    label: 'Bijou',
    tagline: "Sur fond uni, lumière douce.",
  },
  unknown: {
    icon: 'cube-outline',
    label: 'Autre',
    tagline: "Centre l'objet sur fond neutre.",
  },
};

/** Universal best-practices shown in the tutorial card on first use. */
export const PHOTO_BEST_PRACTICES: { icon: ComponentProps<typeof Ionicons>['name']; text: string }[] = [
  { icon: 'sunny-outline', text: 'Lumière naturelle, ni flash ni contre-jour.' },
  { icon: 'apps-outline', text: 'Fond neutre : parquet, drap blanc, table en bois.' },
  { icon: 'eye-outline', text: 'Vue du dessus, pas de perspective inclinée.' },
  { icon: 'crop-outline', text: 'Cadre le vêtement entier avec un peu de marge.' },
];
