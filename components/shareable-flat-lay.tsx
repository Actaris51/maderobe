import Ionicons from '@expo/vector-icons/Ionicons';
import * as Sharing from 'expo-sharing';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { BackgroundPicker } from '@/components/background-picker';
import { FlatLayComposer } from '@/components/flat-lay-composer';
import { ThemedText } from '@/components/themed-text';
import {
  getBackgroundById,
  type FlatLayBackground,
} from '@/constants/flat-lay-backgrounds';
import { HAPTIC } from '@/constants/motion';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/stores/settings-store';
import type { ClothingItem } from '@/types';

/**
 * Self-contained flat-lay block used on the three outfit screens:
 *   - the composed FlatLayComposer canvas
 *   - the background swatch picker (persisted app-wide via the settings store)
 *   - a "Partager" button that captures the canvas as a PNG (at native screen
 *     scale, so ~3x on modern iPhones) and opens the iOS share sheet
 *
 * The capture targets ONLY the canvas view (not the picker/button), so the
 * shared image is a clean composition with the "via Maderobe" watermark.
 */

type Props = {
  items: ClothingItem[];
  /** Canvas width in pt. Height is derived by FlatLayComposer. */
  width: number;
  /** Change this value to re-fire the cascade animation (e.g. on regenerate). */
  animationKey?: string;
};

export function ShareableFlatLay({ items, width, animationKey }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;

  const flatLayBackgroundId = useSettingsStore((s) => s.flatLayBackgroundId);
  const setSetting = useSettingsStore((s) => s.set);
  const bg = getBackgroundById(flatLayBackgroundId);
  const setBg = useCallback(
    (next: FlatLayBackground) => setSetting('flatLayBackgroundId', next.id),
    [setSetting],
  );

  const canvasRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (sharing) return;
    HAPTIC.medium();
    setSharing(true);
    try {
      const uri = await captureRef(canvasRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partager ma tenue',
          UTI: 'public.png',
        });
      } else {
        Alert.alert('Partage indisponible', "Le partage n'est pas disponible sur cet appareil.");
      }
    } catch {
      // User cancelling the share sheet does NOT throw — a real error did.
      Alert.alert('Erreur', "Impossible de générer l'image de la tenue.");
    } finally {
      setSharing(false);
    }
  }, [sharing]);

  return (
    <View style={styles.wrap}>
      {/* collapsable={false} keeps the native view alive so captureRef works */}
      <View ref={canvasRef} collapsable={false}>
        <FlatLayComposer
          key={animationKey}
          items={items}
          width={width}
          background={bg}
          showWatermark
          animate
        />
      </View>

      <BackgroundPicker selectedId={bg.id} onSelect={setBg} />

      <Pressable
        onPress={handleShare}
        disabled={sharing || items.length === 0}
        style={({ pressed }) => [
          styles.shareBtn,
          { borderColor: tint },
          pressed && { opacity: 0.7 },
          sharing && { opacity: 0.5 },
        ]}
        hitSlop={6}
      >
        {sharing ? (
          <ActivityIndicator size="small" color={tint} />
        ) : (
          <Ionicons name="share-outline" size={17} color={tint} />
        )}
        <ThemedText style={[styles.shareLabel, { color: tint }]}>
          Partager la planche
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 4,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 2,
  },
  shareLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
