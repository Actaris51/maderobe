import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { HAPTIC } from '@/constants/motion';
import { PHOTO_GUIDES } from '@/constants/photo-guides';
import type { ClothingType } from '@/types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
/** Silhouette occupies ~55 % of the shorter dimension — visible but not overwhelming. */
const SILHOUETTE_SIZE = Math.min(SCREEN_W, SCREEN_H) * 0.55;

type Props = {
  visible: boolean;
  type: ClothingType;
  onCapture: (uri: string) => void;
  onClose: () => void;
};

/**
 * Full-screen modal camera with a silhouette overlay matching the chosen
 * clothing type. The user sees a ghost outline of (eg.) a t-shirt over the
 * camera preview, plus a tagline reminding them how to pose the item.
 *
 * Built on expo-camera's `CameraView`. Uses our existing app permissions
 * (NSCameraUsageDescription is already set in app.json).
 */
export function CameraWithGuide({ visible, type, onCapture, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [taking, setTaking] = useState(false);
  /** Front (selfie) or back (default) camera. Toggled via the flip button. */
  const [facing, setFacing] = useState<CameraType>('back');

  const guide = PHOTO_GUIDES[type];

  const toggleFacing = () => {
    HAPTIC.selection();
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
  };

  // Request camera permission when the modal opens.
  useEffect(() => {
    if (!visible) return;
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const handleShutter = async () => {
    if (!cameraRef.current || taking) return;
    HAPTIC.medium();
    setTaking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (photo?.uri) {
        onCapture(photo.uri);
      } else {
        Alert.alert('Erreur', "Impossible de capturer la photo.");
      }
    } catch (err) {
      Alert.alert('Erreur', String(err));
    } finally {
      setTaking(false);
    }
  };

  if (!visible) return null;

  // Permission states ---------------------------------------------------------
  if (!permission) {
    return (
      <Modal animationType="slide" presentationStyle="fullScreen" visible>
        <View style={[styles.fullscreen, styles.center, { backgroundColor: '#000' }]}>
          <ThemedText style={styles.statusText}>Chargement…</ThemedText>
        </View>
      </Modal>
    );
  }
  if (!permission.granted) {
    return (
      <Modal animationType="slide" presentationStyle="fullScreen" visible>
        {/* SafeAreaProvider must wrap modal contents — Modal renders in a
            separate native view tree that doesn't inherit the app's
            SafeAreaProvider context. Without this, SafeAreaView edges fall
            back to 0 insets and our top bar collides with the Dynamic Island. */}
        <SafeAreaProvider>
          <SafeAreaView style={[styles.fullscreen, { backgroundColor: '#000' }]}>
            <View style={styles.permWrap}>
              <Ionicons name="camera-outline" size={64} color="#fff" />
              <ThemedText style={[styles.permTitle, { color: '#fff' }]}>
                Maderobe a besoin de la caméra
              </ThemedText>
              <ThemedText style={[styles.permText, { color: '#fff' }]}>
                Pour prendre une photo de ton vêtement avec le gabarit, autorise
                l&apos;accès dans Réglages → Maderobe → Caméra.
              </ThemedText>
              <Pressable style={styles.permButton} onPress={onClose}>
                <ThemedText style={styles.permButtonText}>Fermer</ThemedText>
              </Pressable>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    );
  }

  // Normal: camera + overlay ---------------------------------------------------
  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible>
      {/* SafeAreaProvider required — see comment in the permission branch. */}
      <SafeAreaProvider>
        <View style={[styles.fullscreen, { backgroundColor: '#000' }]}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
          />

          {/* Top bar: close + type label + flip-camera */}
          <SafeAreaView edges={['top']} style={styles.topBarSafe}>
            <View style={styles.topBar}>
              <Pressable hitSlop={12} onPress={onClose} style={styles.topBtn}>
                <Ionicons name="close" size={28} color="#fff" />
              </Pressable>
              <View style={styles.topTitleWrap}>
                <ThemedText style={styles.topTitleSmall}>Pose pour</ThemedText>
                <ThemedText style={styles.topTitle}>{guide.label}</ThemedText>
              </View>
              <Pressable hitSlop={12} onPress={toggleFacing} style={styles.topBtn}>
                <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
              </Pressable>
            </View>
          </SafeAreaView>

        {/* Silhouette overlay (giant Ionicon, low opacity). pointerEvents=none
            so taps still go through to the camera area. */}
        <View pointerEvents="none" style={styles.silhouetteWrap}>
          <View
            style={[
              styles.silhouetteRing,
              { width: SILHOUETTE_SIZE, height: SILHOUETTE_SIZE },
            ]}
          >
            <Ionicons
              name={guide.icon}
              size={SILHOUETTE_SIZE * 0.78}
              color="rgba(255,255,255,0.45)"
              style={
                guide.rotation
                  ? { transform: [{ rotate: `${guide.rotation}deg` }] }
                  : undefined
              }
            />
          </View>
        </View>

        {/* Bottom area: tagline + shutter */}
        <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
          <View style={styles.taglineWrap}>
            <ThemedText style={styles.tagline}>{guide.tagline}</ThemedText>
          </View>
          <View style={styles.shutterRow}>
            <View style={styles.shutterSide} />
            <Pressable
              onPress={handleShutter}
              disabled={taking}
              style={({ pressed }) => [
                styles.shutterOuter,
                pressed && { transform: [{ scale: 0.94 }] },
                taking && { opacity: 0.6 },
              ]}
              hitSlop={20}
            >
              <View style={styles.shutterInner} />
            </Pressable>
            <View style={styles.shutterSide} />
          </View>
        </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  fullscreen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  statusText: { color: '#fff', fontSize: 16 },

  // Permission screen
  permWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  permTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },
  permText: {
    fontSize: 15,
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 21,
  },
  permButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: 8,
  },
  permButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Top bar
  topBarSafe: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topBtn: { width: 44, alignItems: 'center', justifyContent: 'center' },
  topTitleWrap: { alignItems: 'center' },
  topTitleSmall: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  topTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },

  // Silhouette
  silhouetteWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  silhouetteRing: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    borderStyle: 'dashed',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom area
  bottomSafe: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  taglineWrap: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 8,
    paddingBottom: 16,
  },
  tagline: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
    lineHeight: 19,
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
  },
  shutterSide: { width: 80 },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
});
