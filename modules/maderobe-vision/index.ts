import { requireNativeModule } from 'expo-modules-core';

/**
 * Local Expo module that wraps Apple Vision framework for on-device clothing image analysis.
 *
 * All methods run entirely on-device — no network, no cost, no privacy concern.
 *
 * iOS-only. Calling these on Android or web will throw at module-load time.
 */

export type ClassificationLabel = {
  /** Raw label from the Vision classifier (e.g. "jersey", "running_shoe"). */
  label: string;
  /** Confidence score in [0, 1]. */
  confidence: number;
};

/**
 * High-level wardrobe category mapped from the raw Vision label.
 * If the classifier returns an unrecognized label, type is "unknown".
 */
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

export type DominantColor = {
  /** Hex value, lowercase, with leading "#" (e.g. "#1a2b3c"). */
  hex: string;
  /** RGB components, each in [0, 255]. */
  r: number;
  g: number;
  b: number;
  /** Approximate share of pixels close to this color, in [0, 1]. Sums to ~1 across all returned colors. */
  weight: number;
};

export type AnalysisResult = {
  /** Top classification labels from Vision (sorted by descending confidence). */
  labels: ClassificationLabel[];
  /** Mapped clothing type. May be "unknown" if no label matches the wardrobe taxonomy. */
  type: ClothingType;
  /** Dominant colors, sorted by descending weight. */
  colors: DominantColor[];
  /** file:// URI of the background-removed image (iOS 17+ only). Undefined if iOS < 17 or removal failed. */
  backgroundRemovedUri?: string;
};

interface MaderobeVisionModuleType {
  /** Classify the image against Apple's general classifier and map to a clothing type. */
  classifyImage(uri: string): Promise<{ labels: ClassificationLabel[]; type: ClothingType }>;

  /**
   * Generate a foreground-only image (background removed).
   * Requires iOS 17.0+. On older systems, resolves with { uri: <original uri>, removed: false }.
   * The output URI points to a JPEG in the app's cache directory.
   */
  removeBackground(uri: string): Promise<{ uri: string; removed: boolean }>;

  /**
   * Extract the N dominant colors from the image via k-means clustering on a downscaled copy.
   * Default N = 3.
   */
  extractDominantColors(uri: string, n?: number): Promise<DominantColor[]>;

  /**
   * Convenience method: runs background removal + classification + dominant colors in one call.
   * Significantly faster than calling the three separately because the image is decoded once.
   */
  analyzeClothingItem(uri: string, options?: { colorCount?: number }): Promise<AnalysisResult>;
}

const native = requireNativeModule<MaderobeVisionModuleType>('MaderobeVisionModule');

export default native;
