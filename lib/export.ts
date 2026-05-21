import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { ClothingItem, Outfit, Settings } from '@/types';

/**
 * Export the user's full data (items + outfits + settings) as a single JSON file
 * and trigger the iOS Share Sheet so the user can save it to Files, iCloud,
 * email it to themselves, etc.
 *
 * Note: photos are NOT bundled — only their local file:// URIs are referenced.
 * Re-importing on a different device would lose images. Good enough for v1
 * (backup / debugging / migration helper).
 */

const EXPORT_FORMAT_VERSION = 1;

type ExportPayload = {
  app: 'maderobe';
  formatVersion: number;
  exportedAt: string; // ISO datetime
  items: ClothingItem[];
  outfits: Outfit[];
  settings: Settings;
};

export async function exportWardrobeJson(
  items: ClothingItem[],
  outfits: Outfit[],
  settings: Settings,
): Promise<{ uri: string; bytes: number } | null> {
  const payload: ExportPayload = {
    app: 'maderobe',
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    items,
    outfits,
    settings,
  };

  const json = JSON.stringify(payload, null, 2);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const filename = `maderobe-export-${stamp}.json`;
  const uri = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(uri, json);

  const available = await Sharing.isAvailableAsync();
  if (!available) return { uri, bytes: json.length };

  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle: 'Exporter ma garde-robe',
    UTI: 'public.json',
  });

  return { uri, bytes: json.length };
}
