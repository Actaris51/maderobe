import * as ImagePicker from 'expo-image-picker';

export type PickResult =
  | { cancelled: false; uri: string }
  | { cancelled: true; reason?: 'permission' | 'user' };

/** Pick an image from the user's photo library. Handles permission requests. */
export async function pickFromLibrary(): Promise<PickResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return { cancelled: true, reason: 'permission' };
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: false,
  });
  if (result.canceled || result.assets.length === 0) {
    return { cancelled: true, reason: 'user' };
  }
  return { cancelled: false, uri: result.assets[0].uri };
}

/** Take a photo with the device camera. Handles permission requests. */
export async function takePhoto(): Promise<PickResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    return { cancelled: true, reason: 'permission' };
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: false,
  });
  if (result.canceled || result.assets.length === 0) {
    return { cancelled: true, reason: 'user' };
  }
  return { cancelled: false, uri: result.assets[0].uri };
}
