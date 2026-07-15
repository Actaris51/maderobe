import * as StoreReview from 'expo-store-review';

import { useSettingsStore } from '@/stores/settings-store';

/**
 * Ask for an App Store rating at most ONCE per install, at a happy moment
 * (right after the 5-items milestone celebration).
 *
 * iOS itself rate-limits SKStoreReviewController to ~3 prompts per year per
 * app, and silently ignores extra calls — but we still guard with our own
 * persisted flag so the user is never re-prompted after reinstall-free
 * updates, and so the timing stays deterministic.
 */
export async function maybeRequestReview(): Promise<void> {
  const { hasAskedReview, set } = useSettingsStore.getState();
  if (hasAskedReview) return;
  try {
    if (await StoreReview.isAvailableAsync()) {
      // Mark BEFORE requesting: if the OS shows the dialog and the user
      // dismisses it, we must not ask again anyway.
      set('hasAskedReview', true);
      await StoreReview.requestReview();
    }
  } catch {
    // Non-fatal — worst case we never prompt.
  }
}
