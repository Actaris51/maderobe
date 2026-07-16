import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Local daily "outfit of the day" reminder.
 *
 * 100 % on-device: we only use LOCAL scheduled notifications — no push
 * server, no token, no network. Consistent with Maderobe's "we do not
 * collect data" positioning.
 *
 * One single notification is scheduled with a repeating calendar trigger;
 * we always cancel-then-reschedule so there is never more than one.
 */

/** Stable identifier so we can replace/cancel the reminder deterministically. */
const DAILY_REMINDER_ID = 'daily-outfit-reminder';

/** Show alerts even if the app is foregrounded when the trigger fires. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Ask for notification permission. Returns true when granted (or already
 * granted). Safe to call repeatedly.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: false, allowBadge: false },
  });
  return asked.granted;
}

/**
 * (Re)schedule the daily reminder at the given local time.
 * Cancels any previous occurrence first.
 */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  await cancelDailyReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'Ta tenue du jour t’attend ☀️',
      body: 'Ouvre Maderobe pour découvrir la suggestion adaptée à la météo.',
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });
}

/** Remove the daily reminder (used when the user toggles it off). */
export async function cancelDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  } catch {
    // Already gone — fine.
  }
}

/** Android would need a channel; harmless no-op on iOS. Kept for the future. */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('daily-reminder', {
    name: 'Rappel quotidien',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}
