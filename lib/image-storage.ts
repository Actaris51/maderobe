import * as FileSystem from 'expo-file-system/legacy';

import { uuid } from './uuid';

/**
 * Persistent storage of clothing photos in the app's document directory.
 * Photos copied via `persistImage` survive app restarts and OTA updates.
 */

const IMAGES_DIR = `${FileSystem.documentDirectory}images/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(IMAGES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
  }
}

/**
 * Copy a transient image (from picker / camera / Vision output) into the app's
 * persistent document directory. Returns the new `file://` URI.
 */
export async function persistImage(sourceUri: string, suffix: string = 'jpg'): Promise<string> {
  await ensureDir();
  const filename = `${uuid()}.${suffix}`;
  const dest = `${IMAGES_DIR}${filename}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

/** Delete an image file by URI. Idempotent. */
export async function deleteImage(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Silent — the file might already be gone, that's fine.
  }
}
