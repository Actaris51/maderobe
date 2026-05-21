import { requireNativeModule } from 'expo-modules-core';

/**
 * Local Expo module that wraps Apple Vision framework for on-device clothing image analysis.
 *
 * All methods run entirely on-device — no network, no cost, no privacy concern.
 *
 * iOS-only. On other platforms (Expo Go, web, Android, or in JS-only test envs)
 * a no-op mock is used so the app still runs and users can save items manually.
 */

export type ClassificationLabel = {
  label: string;
  confidence: number;
};

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
  hex: string;
  r: number;
  g: number;
  b: number;
  weight: number;
};

export type AnalysisResult = {
  labels: ClassificationLabel[];
  type: ClothingType;
  colors: DominantColor[];
  backgroundRemovedUri?: string;
};

export interface MaderobeVisionModuleType {
  classifyImage(uri: string): Promise<{ labels: ClassificationLabel[]; type: ClothingType }>;
  removeBackground(uri: string): Promise<{ uri: string; removed: boolean }>;
  extractDominantColors(uri: string, n?: number): Promise<DominantColor[]>;
  analyzeClothingItem(
    uri: string,
    options?: { colorCount?: number },
  ): Promise<AnalysisResult>;
}

// ----------------------------------------------------------------------------
// Mock implementation
// ----------------------------------------------------------------------------
// Used when the native module is unavailable (Expo Go, web, Android, or before
// the first EAS native build on iOS). All methods resolve with empty/neutral
// values so the rest of the app still works — the user just enters everything
// manually in that case.
// ----------------------------------------------------------------------------

const MOCK_COLORS: DominantColor[] = [
  { hex: '#808080', r: 128, g: 128, b: 128, weight: 0.5 },
  { hex: '#a0a0a0', r: 160, g: 160, b: 160, weight: 0.3 },
  { hex: '#606060', r: 96, g: 96, b: 96, weight: 0.2 },
];

const mock: MaderobeVisionModuleType = {
  async classifyImage(_uri) {
    return { labels: [], type: 'unknown' };
  },
  async removeBackground(uri) {
    return { uri, removed: false };
  },
  async extractDominantColors(_uri, _n = 3) {
    return MOCK_COLORS;
  },
  async analyzeClothingItem(_uri, _options) {
    return { labels: [], type: 'unknown', colors: MOCK_COLORS };
  },
};

// ----------------------------------------------------------------------------
// Lazy native lookup with graceful fallback
// ----------------------------------------------------------------------------

let nativeOrMock: MaderobeVisionModuleType | null = null;

function resolveImpl(): MaderobeVisionModuleType {
  if (nativeOrMock !== null) return nativeOrMock;
  try {
    nativeOrMock = requireNativeModule<MaderobeVisionModuleType>('MaderobeVisionModule');
  } catch {
    nativeOrMock = mock;
  }
  return nativeOrMock;
}

/** True if the underlying native module is present (i.e. running on an iOS build that includes it). */
export function isNativeAvailable(): boolean {
  const impl = resolveImpl();
  return impl !== mock;
}

const moduleProxy: MaderobeVisionModuleType = {
  classifyImage: (uri) => resolveImpl().classifyImage(uri),
  removeBackground: (uri) => resolveImpl().removeBackground(uri),
  extractDominantColors: (uri, n) => resolveImpl().extractDominantColors(uri, n),
  analyzeClothingItem: (uri, options) => resolveImpl().analyzeClothingItem(uri, options),
};

export default moduleProxy;
